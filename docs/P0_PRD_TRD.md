# P0 PRD + TRD — Log + Revision Launch Integrity

**Date:** 2026-09-28 IST  
**North-star (proposed):** % enrolled students with ≥4 Daily Logs/week **and** same-IST-day completion of due revisions.

## PRD (product)

### Problem
Pilot trust breaks when Home shows the wrong student’s data (`STUDENT_ID=1`), Worlds outrank revision, cold starts look like outages, and face Shorts lack consent.

### Users
- Primary: Class 6–10 student (phone-first)
- Supporting: Parent (WhatsApp digest later), Teacher (moderation later)

### In scope (P0)
1. Correct student-scoped Home / Revisions / Habits
2. Home: Today’s Revision Mission + Log CTA first
3. Cold-start warm banner
4. Face Shorts consent acknowledgment stub
5. WhatsApp stay on dry-run; go-live checklist in repo
6. Hide portfolio Chat from student nav

### Out of scope
Play Store, live WhatsApp, Worlds algorithm, event warehouse, microservice split.

### Success metrics
- Linked students see only their revision counts
- Time-to-first-meaningful-Home after cold start explained (banner), not abandoned
- Zero face Shorts without consent ack in pilot builds

### Failure modes (user-visible)
| Failure | UX |
|---------|-----|
| API cold | Warm banner + retry; never “permanently down” |
| Mux fail after log | Log kept; Retry video |
| WhatsApp error | Log kept; dry-run or skip logged |
| Unlinked profile | Prompt to Profile Status; no silent id=1 |

## TRD (technical)

### Components
- Frontend: `useStudentId`, `ApiWarmBanner`, `faceConsent` localStorage, Home reorder
- Backend: unchanged in this slice (AuthZ/seed/events = next P0)
- Providers: Mux create-then-attach (existing); WA dry-run (existing)

### APIs (contract unchanged)
- `GET` habit summary / revisions by `student_id` (must be profile id)
- `POST` learning log → revision tasks; WA side effect non-blocking
- `GET /api/v1/whatsapp/status` for warm ping + readiness

### NFRs
- Log text durability > media > notifications
- Stateless API; JWT auth (harden routes next)
- IST for revision due/digest semantics

### Consent stub storage
`localStorage.edumind_face_shorts_consent_v1` → migrate to profile flag in P1.
