# PRD — Мониторинг безопасности медицинских изделий

## Original Problem Statement
Modern, professional Russian-language web platform that transforms a complex
regulatory document about monitoring the safety, quality and effectiveness of
medical devices into a clear, structured, government/healthcare-style website.

## User Personas
- **Медицинская организация** — фиксирует и отправляет сообщения о событиях.
- **Производитель** — расследует, классифицирует, реализует корректирующие меры.
- **Пользователь / Пациент** — сообщает о нежелательных событиях.
- **Уполномоченный орган** — анализирует данные, принимает решения.

## Tech Stack
- Frontend: React 19 + react-router-dom 7 + TailwindCSS + shadcn/ui + Recharts
- Backend: FastAPI + Motor (MongoDB) + ReportLab (PDF)
- Database: MongoDB (collection `incidents`)

## Architecture
- Frontend SPA with routes: `/`, `/document`, `/report`, `/admin`
- Backend API at `/api` prefix
- Stateless API; PDF is generated on-the-fly with reportlab

## API Endpoints
- `GET  /api/` — health
- `GET  /api/meta` — event types / roles / deadlines metadata
- `POST /api/incidents` — submit incident
- `GET  /api/incidents` — list (admin)
- `GET  /api/incidents/stats` — aggregated stats for charts
- `GET  /api/document/pdf` — download regulation PDF

## Implemented (2026-02-05)
- Landing page with hero, 3 CTAs, pillars grid, deadlines preview, bottom CTA
- Document page with sticky sidebar nav (10 sections), animated flowchart (5 steps),
  role tabs (3 roles), deadlines table, definitions hover-cards, warning callout
- Incident report form with full validation, success screen with report ID
- Admin dashboard: 4 KPIs, line chart (timeline), bar chart (severity), reports
  table with severity filter
- PDF document generation (Cyrillic via DejaVu / Helvetica fallback)
- Government white/blue palette (#0050A0), IBM Plex Sans + Inter typography
- All interactive elements tagged with `data-testid`
- Tested end-to-end via testing agent: 100% backend and frontend pass

## Backlog
- P1: Role-based dashboard filters (filter incidents by role of submitter)
- P1: Email notification on incident submission (Resend / SMTP)
- P2: Admin authentication (JWT or Emergent Google Auth)
- P2: Update incident status from admin panel (received → in_review → resolved)
- P2: File attachments for incidents (object storage)
- P3: Multi-language toggle (RU / EN / KZ)
- P3: Export incidents to CSV / XLSX

## Notes
- Admin route `/admin` is intentionally open (per user choice).
- All UI strings are in Russian (Cyrillic).
- No third-party LLM integrations used.
