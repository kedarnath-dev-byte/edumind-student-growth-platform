# WhatsApp revision plan + morning digests

EduMind sends two WhatsApp notification types via the **Meta Cloud API**:

1. **Revision plan** — right after a student submits a learning log (all 5 spaced stages + due dates in Asia/Kolkata).
2. **Morning digest** — ~07:00 IST, one message per student listing **PENDING** `revision_tasks` due that IST calendar day (topic/subject + stage). Stages from one log fall on different days.

Until Meta templates are approved, keep **`WHATSAPP_DRY_RUN=true`** (default). Learning-log create never fails if WhatsApp errors.

## Recipient resolution (locked)

1. Student `AppUser.phone`
2. Else `student_profiles.guardian_contact`
3. Else linked parent `ParentProfile.phone` (ACTIVE `parent_student_links`)
4. Else skip + log (`whatsapp_recipient_skip`)

Phones are normalized to **E.164**. Bare 10-digit Indian numbers get `+91`.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `WHATSAPP_ENABLED` | `false` | Master switch |
| `WHATSAPP_DRY_RUN` | `true` | Log intended messages; do not call Meta |
| `WHATSAPP_TOKEN` | _(empty)_ | Meta permanent / system user token |
| `WHATSAPP_PHONE_NUMBER_ID` | _(empty)_ | Phone number ID from Meta app |
| `WHATSAPP_API_VERSION` | `v21.0` | Graph API version |
| `WHATSAPP_TEMPLATE_REVISION_PLAN` | `edumind_revision_plan` | Template name |
| `WHATSAPP_TEMPLATE_MORNING_DIGEST` | `edumind_morning_revisions` | Template name |
| `INTERNAL_JOB_SECRET` | _(empty)_ | Header `X-Internal-Job-Secret` for the morning cron |

Live send requires: `WHATSAPP_ENABLED=true`, `WHATSAPP_DRY_RUN=false`, and both credentials set.

## How to enable (production)

1. Create a Meta WhatsApp Business app + Cloud API phone number.
2. Submit the two templates below for approval (UTILITY category recommended).
3. On Render (web service), set:
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
   - `INTERNAL_JOB_SECRET` (long random string)
   - `WHATSAPP_ENABLED=true`
   - Keep `WHATSAPP_DRY_RUN=true` until a dry-run log looks correct, then set `WHATSAPP_DRY_RUN=false`
4. Deploy / ensure `render.yaml` cron service `edumind-morning-revision-whatsapp` has:
   - `BACKEND_BASE_URL` = `https://<your-web-service>.onrender.com`
   - Same `INTERNAL_JOB_SECRET`
5. Probe: `GET /api/v1/whatsapp/status` (public-ish flags only — no secrets).
6. Manual morning job (IST date optional):

```bash
curl -X POST "$BACKEND_BASE_URL/api/v1/internal/jobs/morning-revision-whatsapp" \
  -H "X-Internal-Job-Secret: $INTERNAL_JOB_SECRET"
```

Cron schedule in `render.yaml`: `30 1 * * *` UTC = **07:00 IST**.

> Free-tier note: sleeping web services may cold-start when the cron hits; that is OK. If you do not use Blueprint cron, configure an external scheduler (GitHub Actions / cron-job.org) with the same POST + header.

## Meta template bodies (submit exactly)

### 1. `edumind_revision_plan`

**Category:** UTILITY  
**Language:** English (`en`)  
**Body:**

```
Hi {{1}}, your EduMind revision plan for {{2}}:

{{3}}

Open EduMind to mark each stage when done. Consistency builds memory.
```

| Param | Meaning |
|---|---|
| `{{1}}` | Student display name |
| `{{2}}` | Subject — topic |
| `{{3}}` | Five lines `STAGE: DD Mon YYYY` (IST dates), newline-separated |

Example `{{3}}`:

```
24H: 25 Sep 2026
7D: 01 Oct 2026
1M: 24 Oct 2026
3M: 24 Dec 2026
6M: 24 Mar 2027
```

### 2. `edumind_morning_revisions`

**Category:** UTILITY  
**Language:** English (`en`)  
**Body:**

```
Good morning {{1}}! Revisions due {{2}} (IST):

{{3}}

Open EduMind → Revisions to complete today's stages.
```

| Param | Meaning |
|---|---|
| `{{1}}` | Student display name |
| `{{2}}` | Date like `24 Sep 2026` |
| `{{3}}` | Bullet lines `• Topic (Subject) — stage 24H` |

## Idempotency

Table `notification_sends` unique on `(kind, student_id, day_key)`:

- Morning digest: `day_key = YYYY-MM-DD` (IST)
- Revision plan: `day_key = log:<learning_log_id>`

Re-running the morning job the same IST day will not re-send.

## IST day bounds

Morning job uses `modules/student_growth/ist_time.py` (`ist_day_bounds_utc`) so “due today” means the Asia/Kolkata calendar day. Habit summary endpoints still use UTC date bounds unless migrated later.

## Phone requirements

- Prefer storing student/guardian phones as E.164 (`+9198xxxxxxxx`).
- 10-digit local Indian numbers are accepted and prefixed with `+91`.
- Sandbox / test numbers must be registered in Meta’s allowed list until the business is live.

## Safety

- Never commit real `WHATSAPP_TOKEN` or `INTERNAL_JOB_SECRET`.
- Status endpoint never returns secrets.
- WhatsApp failures are logged; learning-log POST still returns 200 with revision tasks.
