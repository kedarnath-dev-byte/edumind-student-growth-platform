# WhatsApp go-live checklist (keep dry-run until Meta Approved)

**Status:** Templates reported **In review**. Do **not** set `WHATSAPP_DRY_RUN=false` until every box below is checked.

Related: [WHATSAPP_REVISION_REMINDERS.md](./WHATSAPP_REVISION_REMINDERS.md), ROADMAP T13/T16.

## Pillar reminder

Log + revision are primary. WhatsApp is the **habit channel** (plan after log + morning digest). Never block learning-log create on WhatsApp failures (already enforced).

## Pre-approval (safe anytime)

- [ ] `WHATSAPP_PROVIDER` chosen (`meta` or `gupshup`)
- [ ] Provider credentials set on Render (token / phone id **or** Gupshup key+app+source)
- [ ] `WHATSAPP_ENABLED=true` only if you want dry-run logging; else leave `false`
- [ ] **`WHATSAPP_DRY_RUN=true`** (default) — required until Approved
- [ ] `INTERNAL_JOB_SECRET` set on web + morning cron
- [ ] Apply `notification_outbox` migration; probe outbox drain in dry-run
- [ ] cron-job.org (or GHA) configured per docs/CRON_WHATSAPP_AND_OUTBOX.md
- [ ] Probe `GET /api/v1/whatsapp/status` → shows provider, configured flags, `live_send_allowed: false` while dry-run
- [ ] Submit / confirm templates:
  - Revision plan (`edumind_revision_plan` or Gupshup UUID)
  - Morning digest (`edumind_morning_revisions` or Gupshup UUID)
- [ ] Recipient path tested in dry-run logs: student phone → guardian → linked parent → skip

## After Meta (or Gupshup) **Approved**

- [ ] Template status = Approved (screenshot in pilot ops folder)
- [ ] One dry-run log create shows correct template name + E.164 recipient
- [ ] Morning cron dry-run lists PENDING due tasks for IST day
- [ ] Founder approval to go live (cost + opt-in parents)
- [ ] Set `WHATSAPP_DRY_RUN=false` on Render
- [ ] Re-probe status → `live_send_allowed: true`
- [ ] Send **one** real message to founder phone only
- [ ] Confirm deep link / copy points students to `/student-revisions`
- [ ] Watch Render logs for `whatsapp_sent` / skip for 24h

## Explicit non-goals for P0

- Do not flip dry-run in a feature PR “to try it”
- Do not add promotional/marketing templates in pilot
- Do not put marks, ranks, or full names in template variables

## Rollback

1. Set `WHATSAPP_DRY_RUN=true` (or `WHATSAPP_ENABLED=false`)
2. Redeploy / sync env
3. Probe status until `live_send_allowed: false`
