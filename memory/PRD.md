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

## Implemented (2026-02-05 — Iteration 2)
- **JWT auth** for admin panel: `/admin/login`, ProtectedRoute, bcrypt password
  hashing, admin seeded from `.env`, 8h token TTL.
- **Status management**: per-row dropdown (received → in_review → resolved → rejected).
  Selecting "rejected" opens modal asking for `rejection_reason`.
- **File attachments** via Emergent Object Storage: drag-drop in form,
  max 5 files / 10 MB, types pdf/jpg/jpeg/png/docx. Admin can download with
  authenticated link.
- **Bilingual UI (RU + KY)**: header `LanguageSwitcher`, full UI string i18n,
  bilingual content (sections, definitions, role descriptions). Persisted in
  localStorage key `medsafety_lang`.
- Testing agent: 100% backend (29/29) and 100% frontend (9/9 critical flows).

## Backlog
- P1: Role-based dashboard filters (filter incidents by role of submitter)
- P1: Email notification on incident submission (Resend / SMTP)
- P1: Date-range filter in admin
- P2: Per-status filter chips in admin table
- P2: Admin can add internal comments to an incident
- P3: Add EN locale alongside RU/KY
- P3: Export incidents to CSV / XLSX
- P3: Forgot-password flow for admin

## Notes
- New endpoints (auth-protected): `GET /api/incidents`, `GET /api/incidents/stats`,
  `PATCH /api/incidents/{id}`, `GET /api/files/{file_id}`, `GET /api/auth/me`.
- Public: `POST /api/incidents` (multipart), `GET /api/document/pdf`, `GET /api/meta`,
  `POST /api/auth/login`.
- Admin credentials in `/app/memory/test_credentials.md` and `/app/backend/.env`.
- Object storage uses `EMERGENT_LLM_KEY` from `.env`.
