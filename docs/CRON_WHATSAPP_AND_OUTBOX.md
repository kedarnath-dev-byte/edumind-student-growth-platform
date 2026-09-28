# Cron setup — morning WhatsApp + outbox drain (no secrets in git)

**Keep `WHATSAPP_DRY_RUN=true` until Meta templates Approved.** See [WHATSAPP_GO_LIVE_CHECKLIST.md](./WHATSAPP_GO_LIVE_CHECKLIST.md).

## Endpoints (Render backend)

| Job | Method | Path | Header |
|-----|--------|------|--------|
| Morning digest | `POST` | `/api/v1/internal/jobs/morning-revision-whatsapp` | `X-Internal-Job-Secret: <INTERNAL_JOB_SECRET>` |
| Outbox drain | `POST` | `/api/v1/internal/jobs/drain-notification-outbox?limit=50` | same |

Optional query: `for_date=YYYY-MM-DD` on morning job (IST calendar).

## cron-job.org (human click)

1. Create account → **Create cronjob**
2. Title: `EduMind morning revision WA (IST)`
3. URL: `https://<your-render-host>/api/v1/internal/jobs/morning-revision-whatsapp`
4. Schedule: `30 2 * * *` (02:30 UTC ≈ **08:00 IST**)
5. Request method: **POST**
6. Headers: `X-Internal-Job-Secret` = value from Render env (do **not** commit)
7. Second job: outbox drain every 5–10 min during pilot daytime, same secret header

## GitHub Actions alternative (no secret in YAML body)

Use a repo secret `INTERNAL_JOB_SECRET` and a scheduled workflow that curls the endpoints. Do not paste the secret into the workflow file text.

## Outbox behavior

- Learning Log create **enqueues** `notification_outbox` (`revision_plan:log:<id>`).
- Background thread + drain job send (still dry-run when env says so).
- Apply migration: `supabase/migrations/20260928_notification_outbox.sql`

## Explicit non-goals

- Do not invent Meta template approval.
- Do not set `WHATSAPP_DRY_RUN=false` from automation.
