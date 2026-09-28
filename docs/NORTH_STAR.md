# EduMind north-star KPI

**Date:** 2026-09-28 IST  
**Source:** System Design + PM PDFs → ROADMAP T3; Admin Pulse.

## Definition

**% of enrolled students with ≥4 Daily Learning Logs in the trailing 7 IST calendar days AND same-IST-day completion of revisions due today.**

- **Enrolled:** `StudentProfile` rows (optionally filtered by school/classroom in Admin).
- **≥4 logs / 7d:** `LearningLog.created_at` within `[today_IST − 6 days, tomorrow_IST)`.
- **Same-IST-day due complete:** among students with ≥1 revision due on today's Asia/Kolkata calendar day, those who completed **all** of today's dues.
- **North-star hit:** student has ≥4 logs/7d **and** (no dues today **or** all today's dues completed).

## Where it lives

- API: `GET /api/v1/admin/north-star` (ADMIN JWT)
- UI: Admin → Student Pulse north-star cards
- Honesty: revision lock / `completed_on_due_date` / habit "today" use IST helpers (`ist_time.py`)

## Explicit non-goals

- Not Shorts volume, not WhatsApp open rate (supporting channels).
- No Kafka / warehouse — `product_events` + this aggregate are enough for pilot.
