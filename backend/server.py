import os
import io
import uuid
import logging
import requests
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt
from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Header, Query, Request
)
from fastapi.responses import StreamingResponse, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)


# ===== PDF font (Cyrillic) =====
PDF_FONT = "Helvetica"
PDF_FONT_BOLD = "Helvetica-Bold"
for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
          "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("DejaVu", p))
            PDF_FONT = "DejaVu"
            break
        except Exception:
            pass
for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
          "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"):
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("DejaVu-Bold", p))
            PDF_FONT_BOLD = "DejaVu-Bold"
            break
        except Exception:
            pass


# ===== MongoDB =====
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ===== Object Storage =====
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "medsafety")
_storage_key: Optional[str] = None

logger = logging.getLogger("medsafety")


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY missing — file uploads disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init",
                             json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Хранилище недоступно")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # Re-init once
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Хранилище недоступно")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ===== Auth =====
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_ALGO = "HS256"
ACCESS_TTL_MIN = 60 * 8  # 8 hours

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@medsafety.gov")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "MedSafety2026!")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Не авторизован")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Сессия истекла")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Недействительный токен")
    if payload.get("type") != "access" or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Нет прав администратора")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


# ===== App =====
app = FastAPI(title="Мониторинг безопасности медицинских изделий")
api_router = APIRouter(prefix="/api")


# ===== Constants / metadata =====
EVENT_TYPES = [
    "neblagopriyatnoe_sobytie",
    "ser'eznyy_incident",
    "ugroza_zhizni",
    "deffekt_kachestva",
    "otkaz_izdeliya",
    "drugoe",
]

EVENT_TYPE_LABELS = {
    "neblagopriyatnoe_sobytie": {"ru": "Неблагоприятное событие", "ky": "Жагымсыз окуя"},
    "ser'eznyy_incident":       {"ru": "Серьёзный инцидент",     "ky": "Олуттуу окуя"},
    "ugroza_zhizni":            {"ru": "Угроза жизни/здоровью",  "ky": "Өмүргө/ден соолукка коркунуч"},
    "deffekt_kachestva":        {"ru": "Дефект качества",        "ky": "Сапат кемчилиги"},
    "otkaz_izdeliya":           {"ru": "Отказ изделия",          "ky": "Буюмдун иштебей калышы"},
    "drugoe":                   {"ru": "Другое",                 "ky": "Башка"},
}

ROLES = ["polzovatel", "med_organizaciya", "proizvoditel"]

STATUSES = ["received", "in_review", "resolved", "rejected"]

ALLOWED_EXT = {"pdf", "jpg", "jpeg", "png", "docx"}
ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILES = 5


def _classify_severity(event_type: str) -> str:
    if event_type == "ugroza_zhizni":
        return "critical"
    if event_type == "ser'eznyy_incident":
        return "serious"
    return "standard"


# ===== Models =====
class Attachment(BaseModel):
    id: str
    storage_path: str
    filename: str
    content_type: str
    size: int


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
    rejection_reason: Optional[str] = None
    attachments: List[Attachment] = []
    created_at: str
    updated_at: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ===== Routes: meta =====
@api_router.get("/")
async def root():
    return {"status": "ok", "service": "medical-device-monitoring"}


@api_router.get("/meta")
async def get_meta():
    return {
        "event_types": [
            {"value": v, "label": EVENT_TYPE_LABELS[v]["ru"], "label_ky": EVENT_TYPE_LABELS[v]["ky"]}
            for v in EVENT_TYPES
        ],
        "roles": [
            {"value": "polzovatel", "label": "Пользователь / Пациент", "label_ky": "Колдонуучу / Бейтап"},
            {"value": "med_organizaciya", "label": "Медицинская организация", "label_ky": "Медициналык уюм"},
            {"value": "proizvoditel", "label": "Производитель", "label_ky": "Өндүрүүчү"},
        ],
        "deadlines": [
            {"days": 2,  "severity": "critical", "label": "Угроза жизни/здоровью"},
            {"days": 10, "severity": "serious",  "label": "Смерть или серьёзный вред"},
            {"days": 30, "severity": "standard", "label": "Прочие неблагоприятные события"},
        ],
        "statuses": STATUSES,
        "max_files": MAX_FILES,
        "max_file_size": MAX_FILE_SIZE,
        "allowed_ext": sorted(ALLOWED_EXT),
    }


# ===== Routes: auth =====
@api_router.post("/auth/login", response_model=LoginResponse)
async def auth_login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token(user["id"], user["email"], user.get("role", "admin"))
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return LoginResponse(access_token=token, user=safe_user)


@api_router.get("/auth/me")
async def auth_me(admin: dict = Depends(get_current_admin)):
    return admin


# ===== Routes: incidents =====
import json as _json

@api_router.post("/incidents", response_model=Incident)
async def create_incident(
    payload: str = Form(...),
    files: List[UploadFile] = File(default=[]),
):
    try:
        data = _json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный формат данных")

    email = (data.get("email") or "").strip()
    event_type = (data.get("event_type") or "").strip()
    description = (data.get("description") or "").strip()
    incident_date = (data.get("incident_date") or "").strip()
    role = (data.get("role") or "polzovatel").strip()
    device_name = (data.get("device_name") or "").strip() or None
    organization = (data.get("organization") or "").strip() or None

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Укажите корректный email")
    if event_type not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail="Неизвестный тип события")
    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Описание слишком короткое")
    if not incident_date:
        raise HTTPException(status_code=400, detail="Укажите дату события")
    if role not in ROLES:
        role = "polzovatel"

    # Upload files
    if files and len(files) > MAX_FILES:
        raise HTTPException(status_code=400,
                            detail=f"Максимум {MAX_FILES} файлов на инцидент")

    attachments: List[dict] = []
    incident_id = str(uuid.uuid4())

    for f in files or []:
        if not f.filename:
            continue
        ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400,
                                detail=f"Недопустимый формат файла: {f.filename}")
        content = await f.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400,
                                detail=f"Файл превышает 10 МБ: {f.filename}")
        ct = f.content_type or "application/octet-stream"
        if ct not in ALLOWED_MIME and ext != "docx":
            # docx sometimes comes as octet-stream, accept by extension
            pass
        file_id = str(uuid.uuid4())
        path = f"{APP_NAME}/incidents/{incident_id}/{file_id}.{ext}"
        try:
            put_object(path, content, ct)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            raise HTTPException(status_code=502, detail="Не удалось загрузить файл")
        attachments.append({
            "id": file_id,
            "storage_path": path,
            "filename": f.filename,
            "content_type": ct,
            "size": len(content),
        })

    severity = _classify_severity(event_type)
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": incident_id,
        "email": email,
        "event_type": event_type,
        "event_type_label": EVENT_TYPE_LABELS[event_type]["ru"],
        "description": description,
        "incident_date": incident_date,
        "role": role,
        "device_name": device_name,
        "organization": organization,
        "status": "received",
        "severity": severity,
        "rejection_reason": None,
        "attachments": attachments,
        "created_at": now_iso,
        "updated_at": None,
    }
    await db.incidents.insert_one(doc.copy())
    return Incident(**doc)


@api_router.get("/incidents", response_model=List[Incident])
async def list_incidents(limit: int = 200, admin: dict = Depends(get_current_admin)):
    items = await db.incidents.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Incident(**i) for i in items]


@api_router.get("/incidents/stats")
async def incidents_stats(admin: dict = Depends(get_current_admin)):
    items = await db.incidents.find({}, {"_id": 0}).to_list(10000)
    total = len(items)
    by_severity = {"critical": 0, "serious": 0, "standard": 0}
    by_type: dict = {}
    by_role = {"polzovatel": 0, "med_organizaciya": 0, "proizvoditel": 0}
    by_status = {"received": 0, "in_review": 0, "resolved": 0, "rejected": 0}
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

    return {
        "total": total,
        "by_severity": by_severity,
        "by_type": [{"label": k, "count": v}
                    for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
        "by_role": by_role,
        "by_status": by_status,
        "timeline": [{"date": d, "count": c} for d, c in sorted(timeline.items())],
    }


@api_router.patch("/incidents/{incident_id}", response_model=Incident)
async def update_incident_status(
    incident_id: str,
    payload: StatusUpdate,
    admin: dict = Depends(get_current_admin),
):
    if payload.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Неизвестный статус")
    update = {
        "status": payload.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.status == "rejected":
        update["rejection_reason"] = (payload.rejection_reason or "").strip() or "Без указания причины"
    else:
        update["rejection_reason"] = None

    result = await db.incidents.find_one_and_update(
        {"id": incident_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Инцидент не найден")
    return Incident(**result)


# ===== Routes: file download =====
@api_router.get("/files/{file_id}")
async def download_attachment(
    file_id: str,
    auth: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    # Auth via Bearer header OR ?auth=token query param (so <a> tags work)
    token_str = None
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.split(" ", 1)[1]
    elif auth:
        token_str = auth
    if not token_str:
        raise HTTPException(status_code=401, detail="Не авторизован")
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Нет прав")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недействительный токен")

    incident = await db.incidents.find_one(
        {"attachments.id": file_id}, {"_id": 0, "attachments": 1}
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Файл не найден")
    att = next((a for a in incident["attachments"] if a["id"] == file_id), None)
    if not att:
        raise HTTPException(status_code=404, detail="Файл не найден")
    data, _ct = get_object(att["storage_path"])
    return Response(
        content=data,
        media_type=att.get("content_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f'attachment; filename="{att["filename"]}"'
        },
    )


# ===== Routes: PDF =====
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
         "эффективности медицинских изделий после их регистрации и допуска к обращению."),
        ("2. Цели мониторинга",
         "Своевременное выявление, оценка и снижение рисков, защита жизни и здоровья пациентов."),
        ("3. Основные понятия",
         "Неблагоприятное событие, корректирующее действие, серьёзная угроза здоровью."),
        ("4. Участники процесса",
         "Пользователь, медицинская организация, производитель, уполномоченный орган."),
        ("5. Процесс мониторинга",
         "1) Обнаружение события → 2) Классификация → 3) Отправка отчёта → 4) Анализ → 5) Принятие решения."),
        ("6. Отчётность",
         "2 дня — угроза жизни/здоровью; 10 дней — смерть/серьёзный вред; 30 дней — прочее."),
        ("7. Корректирующие действия",
         "Отзыв партии, ограничение применения, информационные письма, доработка."),
        ("8. Пострегистрационный мониторинг",
         "Постоянный сбор данных о реальной эксплуатации и обновление файла рисков."),
        ("9. Решения уполномоченного органа",
         "Приостановка обращения, отзыв изделия, корректирующие действия, обновление инструкций."),
        ("10. Ответственность и санкции",
         "Административная ответственность вплоть до запрета на обращение."),
    ]
    for title, text in sections:
        story.append(Paragraph(title, h2))
        story.append(Paragraph(text, body))
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Сроки отчётности", h2))
    data = [
        ["Срок", "Категория", "Когда применяется"],
        ["2 дня",  "Критический", "Угроза жизни или здоровью"],
        ["10 дней", "Серьёзный",   "Смерть или серьёзный вред"],
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
        buf, media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="medical-device-monitoring.pdf"'},
    )


# ===== Wire up =====
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# ===== Startup =====
async def seed_admin():
    email = ADMIN_EMAIL.lower().strip()
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Администратор",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin seeded: {email}")
    elif not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info(f"Admin password updated: {email}")


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Index create failed: {e}")
    await seed_admin()
    init_storage()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
