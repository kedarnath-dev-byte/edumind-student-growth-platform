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

## GitHub Actions (recommended for 06:00 IST)

Workflow template: [`docs/ci/morning-whatsapp-digest.yml`](./ci/morning-whatsapp-digest.yml)

| Trigger | When |
|---------|------|
| `schedule` cron `30 0 * * *` | **06:00 Asia/Kolkata** (00:30 UTC) |
| `workflow_dispatch` | Manual smoke; optional `for_date` and `run_outbox_drain` |

### Install the workflow (one-time)

GitHub rejects creating/updating files under `.github/workflows/` unless the token has the **`workflow`** scope. Until then, keep the YAML in `docs/ci/` and either:

1. **Paste in the UI:** GitHub → **Add file** → create `.github/workflows/morning-whatsapp-digest.yml` → paste contents from `docs/ci/morning-whatsapp-digest.yml` → commit to `main` (or merge this PR then paste), **or**
2. **Re-push with workflow scope:** grant the PAT `workflow`, then `cp docs/ci/morning-whatsapp-digest.yml .github/workflows/` and push.

### Repo secret setup (required once)

1. Copy the value of **`INTERNAL_JOB_SECRET`** from Render → your backend service → Environment.
2. GitHub → repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `INTERNAL_JOB_SECRET` (exact). Value: same as Render. Save.
4. After the workflow file exists under `.github/workflows/`: Actions → **EduMind — morning WhatsApp digest** → **Run workflow** for a smoke test.

Do **not** paste the secret into YAML. Keep **`WHATSAPP_DRY_RUN=true`** on Render until Meta templates are Approved — this workflow does not change that env.

## Outbox behavior

- Learning Log create **enqueues** `notification_outbox` (`revision_plan:log:<id>`).
- Background thread + drain job send (still dry-run when env says so).
- Apply migration: `supabase/migrations/20260928_notification_outbox.sql`

## Explicit non-goals

- Do not invent Meta template approval.
- Do not set `WHATSAPP_DRY_RUN=false` from automation.
