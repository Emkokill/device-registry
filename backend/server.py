from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Register a Cyrillic-capable font (DejaVu ships with most reportlab installs / system)
DEJAVU_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
]
DEJAVU_BOLD_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
]
PDF_FONT = "Helvetica"
PDF_FONT_BOLD = "Helvetica-Bold"
for p in DEJAVU_PATHS:
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("DejaVu", p))
            PDF_FONT = "DejaVu"
            break
        except Exception:
            pass
for p in DEJAVU_BOLD_PATHS:
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("DejaVu-Bold", p))
            PDF_FONT_BOLD = "DejaVu-Bold"
            break
        except Exception:
            pass


# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Мониторинг безопасности медицинских изделий")
api_router = APIRouter(prefix="/api")


# ===== Models =====

EVENT_TYPES = [
    "neblagopriyatnoe_sobytie",
    "ser'eznyy_incident",
    "ugroza_zhizni",
    "deffekt_kachestva",
    "otkaz_izdeliya",
    "drugoe",
]

EVENT_TYPE_LABELS = {
    "neblagopriyatnoe_sobytie": "Неблагоприятное событие",
    "ser'eznyy_incident": "Серьёзный инцидент",
    "ugroza_zhizni": "Угроза жизни/здоровью",
    "deffekt_kachestva": "Дефект качества",
    "otkaz_izdeliya": "Отказ изделия",
    "drugoe": "Другое",
}

ROLES = ["polzovatel", "med_organizaciya", "proizvoditel"]


class IncidentCreate(BaseModel):
    email: EmailStr
    event_type: str
    description: str = Field(min_length=10, max_length=5000)
    incident_date: str  # YYYY-MM-DD
    role: Optional[str] = "polzovatel"
    device_name: Optional[str] = None
    organization: Optional[str] = None


class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: str
    event_type: str
    event_type_label: str
    description: str
    incident_date: str
    role: str
    device_name: Optional[str] = None
    organization: Optional[str] = None
    status: str
    severity: str
    created_at: str


def _classify_severity(event_type: str) -> str:
    if event_type == "ugroza_zhizni":
        return "critical"  # 2 days
    if event_type in ("ser'eznyy_incident",):
        return "serious"  # 10 days
    return "standard"  # 30 days


# ===== Routes =====

@api_router.get("/")
async def root():
    return {"status": "ok", "service": "medical-device-monitoring"}


@api_router.get("/meta")
async def get_meta():
    return {
        "event_types": [
            {"value": v, "label": EVENT_TYPE_LABELS[v]} for v in EVENT_TYPES
        ],
        "roles": [
            {"value": "polzovatel", "label": "Пользователь / Пациент"},
            {"value": "med_organizaciya", "label": "Медицинская организация"},
            {"value": "proizvoditel", "label": "Производитель"},
        ],
        "deadlines": [
            {"days": 2, "severity": "critical", "label": "Угроза жизни/здоровью"},
            {"days": 10, "severity": "serious", "label": "Смерть или серьёзный вред"},
            {"days": 30, "severity": "standard", "label": "Прочие неблагоприятные события"},
        ],
    }


@api_router.post("/incidents", response_model=Incident)
async def create_incident(payload: IncidentCreate):
    if payload.event_type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Неизвестный тип события")
    if payload.role not in ROLES:
        payload.role = "polzovatel"

    severity = _classify_severity(payload.event_type)
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "event_type": payload.event_type,
        "event_type_label": EVENT_TYPE_LABELS[payload.event_type],
        "description": payload.description,
        "incident_date": payload.incident_date,
        "role": payload.role,
        "device_name": payload.device_name,
        "organization": payload.organization,
        "status": "received",
        "severity": severity,
        "created_at": now_iso,
    }

    await db.incidents.insert_one(doc.copy())
    return Incident(**doc)


@api_router.get("/incidents", response_model=List[Incident])
async def list_incidents(limit: int = 100):
    items = await db.incidents.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Incident(**i) for i in items]


@api_router.get("/incidents/stats")
async def incidents_stats():
    items = await db.incidents.find({}, {"_id": 0}).to_list(10000)

    total = len(items)
    by_severity = {"critical": 0, "serious": 0, "standard": 0}
    by_type: dict = {}
    by_role = {"polzovatel": 0, "med_organizaciya": 0, "proizvoditel": 0}
    by_status = {"received": 0, "in_review": 0, "resolved": 0}

    # Last 30 days timeline
    timeline: dict = {}

    for it in items:
        sev = it.get("severity", "standard")
        by_severity[sev] = by_severity.get(sev, 0) + 1

        et = it.get("event_type_label", it.get("event_type", "—"))
        by_type[et] = by_type.get(et, 0) + 1

        r = it.get("role", "polzovatel")
        by_role[r] = by_role.get(r, 0) + 1

        st = it.get("status", "received")
        by_status[st] = by_status.get(st, 0) + 1

        created_at = it.get("created_at", "")
        day = created_at[:10] if isinstance(created_at, str) else ""
        if day:
            timeline[day] = timeline.get(day, 0) + 1

    timeline_sorted = sorted(timeline.items())
    return {
        "total": total,
        "by_severity": by_severity,
        "by_type": [{"label": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
        "by_role": by_role,
        "by_status": by_status,
        "timeline": [{"date": d, "count": c} for d, c in timeline_sorted],
    }


@api_router.get("/document/pdf")
async def download_pdf():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
        title="Мониторинг безопасности медицинских изделий",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName=PDF_FONT_BOLD,
                        fontSize=18, leading=22, textColor=colors.HexColor("#0F172A"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName=PDF_FONT_BOLD,
                        fontSize=13, leading=17, textColor=colors.HexColor("#0050A0"),
                        spaceBefore=10, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontName=PDF_FONT,
                          fontSize=10.5, leading=15, textColor=colors.HexColor("#0F172A"))
    small = ParagraphStyle("small", parent=styles["BodyText"], fontName=PDF_FONT,
                           fontSize=9, leading=12, textColor=colors.HexColor("#475569"))

    story = []
    story.append(Paragraph("Мониторинг безопасности, качества и эффективности медицинских изделий", h1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Краткое регулирующее руководство для производителей, медицинских организаций, "
        "пользователей и уполномоченных органов.", small))
    story.append(Spacer(1, 14))

    sections = [
        ("1. Общие положения",
         "Настоящий регламент устанавливает порядок мониторинга безопасности, качества и "
         "эффективности медицинских изделий после их регистрации и допуска к обращению. "
         "Регламент применяется ко всем участникам обращения медизделий."),
        ("2. Цели мониторинга",
         "Своевременное выявление, оценка и снижение рисков, связанных с применением "
         "медицинских изделий; защита жизни и здоровья пациентов; обеспечение надлежащего "
         "качества и эксплуатационных характеристик."),
        ("3. Основные понятия",
         "Неблагоприятное событие — любое нежелательное событие, связанное с применением "
         "медицинского изделия. Корректирующее действие — мера, направленная на устранение "
         "выявленных рисков. Серьёзная угроза здоровью — событие, повлёкшее или способное "
         "повлечь смерть, тяжкое расстройство здоровья или длительную нетрудоспособность."),
        ("4. Участники процесса",
         "Пользователь / медицинская организация — выявляют события и направляют отчёты. "
         "Производитель — расследует, классифицирует и реализует корректирующие действия. "
         "Уполномоченный орган — анализирует данные и принимает решения о мерах."),
        ("5. Процесс мониторинга",
         "1) Обнаружение события → 2) Классификация → 3) Отправка отчёта → "
         "4) Анализ → 5) Принятие решения уполномоченным органом."),
        ("6. Отчётность",
         "Сроки направления отчётов: 2 дня — при угрозе жизни/здоровью; 10 дней — при "
         "смерти или серьёзном вреде; 30 дней — для прочих неблагоприятных событий."),
        ("7. Корректирующие действия",
         "Производитель обязан в установленные сроки реализовать корректирующие меры: "
         "отзыв партии, ограничение применения, выпуск информационных писем, доработку."),
        ("8. Пострегистрационный мониторинг",
         "Производитель ведёт постоянный сбор данных о реальной эксплуатации и обновляет "
         "файл управления рисками на протяжении жизненного цикла изделия."),
        ("9. Решения уполномоченного органа",
         "По итогам анализа возможны: приостановка обращения, отзыв изделия, требование "
         "корректирующих действий, обновление инструкций по применению."),
        ("10. Ответственность и санкции",
         "За нарушение требований предусмотрена административная ответственность вплоть "
         "до приостановки регистрационного удостоверения и запрета на обращение."),
    ]

    for title, text in sections:
        story.append(Paragraph(title, h2))
        story.append(Paragraph(text, body))
        story.append(Spacer(1, 6))

    # Deadlines table
    story.append(Spacer(1, 8))
    story.append(Paragraph("Сроки отчётности", h2))
    data = [
        ["Срок", "Категория", "Когда применяется"],
        ["2 дня", "Критический", "Угроза жизни или здоровью"],
        ["10 дней", "Серьёзный", "Смерть или серьёзный вред"],
        ["30 дней", "Стандартный", "Прочие неблагоприятные события"],
    ]
    tbl = Table(data, colWidths=[28 * mm, 35 * mm, 100 * mm])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), PDF_FONT),
        ("FONTNAME", (0, 0), (-1, 0), PDF_FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0050A0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        f"Документ сформирован: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", small))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="medical-device-monitoring.pdf"'
        },
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
