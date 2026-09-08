# Student and school release candidate

Status: NOT DEPLOYED. Do not distribute the current production address as this release.

## Included

- Database-backed roles and record ownership checks on student growth APIs.
- Student identity from the authenticated profile; teacher class and parent child selection.
- Classroom-scoped peer support; legacy AI/evaluation tools restricted to the platform owner.
- School/class/subject/topic management and transactional student, teacher and parent enrollment.
- Token forwarding from Supabase; default tab-only sessions and explicit persistent sign-in.
- Account activation using Supabase signup for a pre-enrolled email. Each sibling needs a distinct email.
- Atomic learning log/revision/reward saves and durable idempotency keys for retrying.
- PostgreSQL row locks for revision and peer-session transitions.
- India school-day calculations with UTC storage.
- Android install instructions, browser installation prompt, static-asset worker and offline reconnect page.
- No account/API responses are cached by the service worker. Drafts are per-account, tab-local and cleared on successful sign-out.
- Frontend code splitting and lint/build checks; isolated release integration tests.

## Deployment blockers observed

1. Connected Vercel app returned UNAUTHORIZED / reauthentication required.
2. Connected Supabase project edumind-ai-learning (nlcjzvcpuerskzitnlee) is INACTIVE. Confirm it is the intended database for this repository before changing it; do not alter the old deployed project.
3. Render access and the deployment target have not been verified. The repository's current Render service configuration still needs confirmed ownership and environment values.
4. No live account credentials were available for student/teacher/parent end-to-end tests. No student records were read or changed.
5. Local Python dependency installation was blocked by the execution environment. Run the GitHub Actions release suite and inspect its actual result.

## Required before real student release

- Reconnect hosting, confirm the correct production database, restore it, and configure DATABASE_URL and SUPABASE_URL on the backend.
- Configure VITE_API_BASE_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on the frontend. Backend URL must be HTTPS.
- Confirm exact frontend CORS origin; preview wildcard access was removed.
- Apply and review the migration in backend/migrations/20260908_student_release.sql. Existing tables must already match the models. Inspect Supabase Data API grants and RLS: backend authorization does not protect separately exposed Data API tables.
- Create the first platform ADMIN by a verified operator in the database and link to the owner's verified auth UUID. Do not expose ADMIN signup. School employees receive TEACHER accounts, not global ADMIN.
- Configure Supabase email confirmation, redirect URLs and email delivery. Test account activation using a real mailbox. Recovery flow is not yet implemented in the app.
- Test two students, an assigned teacher and a linked parent against production. Verify cross-account denial and class/school isolation, including Data API access.
- Test two simultaneous completion requests on PostgreSQL, repeated learning-log submissions and a failed save; verify exactly one reward/receipt.
- Verify Chrome Android install on an actual phone, shared-device sign-out, reconnect behaviour, and absence of stale student data after switching accounts.
- Confirm backups and perform a restore test before onboarding live student data.

## Commercial launch gaps

This change is not a certification of school-sale readiness. Remaining product/operational work includes school-scoped administrators (current ADMIN is platform-global), password recovery, durable private video upload, a complete mentor feedback/resolution flow, account suspension/deletion UI, school data export/retention, support ownership, pricing/contract terms and guardian-consent workflow. Automated payments and native APK/Play Store distribution are not included. The downloadable experience is the installed web app.

## Rollout and rollback

Deploy a preview against an isolated test database first. Only promote after the release checks and live role/device checks pass. Do not merge solely because the frontend builds. Keep the previous deployment and database snapshot recorded. If rollback is needed, restore the previous frontend/backend versions together. The new receipt table can remain; do not drop student learning records or rewrite history.
