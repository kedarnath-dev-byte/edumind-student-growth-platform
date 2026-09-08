# Low-cost cloud deployment

Prepared 2026-09-08. Configuration only; no services purchased or deployed.

## Budget and scope

| Component | Minimum start | Recommended school service |
| --- | --- | --- |
| Render static frontend | $0/month | $0/month |
| Render API, 0.5 CPU / 512 MB | $7/month | $7/month initially |
| Supabase database + authentication | Free | Pro $25/month base, one Micro project within compute credit |
| Base total | $7/month | $32/month |

Estimates exclude tax, domain, email delivery, video storage/transfer, quota overages. AI is paused: no AI provider, vector database or model-training service is provisioned, so planned AI spend is $0. Free Supabase projects can pause after low activity over seven days and require independently managed exports/backups. Pro provides managed daily database backups; files in object storage need their own backup plan. Do not equate a free quota with a production reliability commitment.

The small deployment enables learning logs, revision schedules, school enrollment and role dashboards. It disables legacy document/RAG/AI endpoints using ENABLE_LEGACY_AI=false and a small requirements file. All existing AI modules remain preserved; both frontend and backend now default to AI disabled. Resuming AI requires explicit flags and the full backend dependency set. It does not provide durable video upload or native APK distribution. The Android client is an installable web app and requires connectivity for student records.

100 registered students is a reasonable sizing target, not a tested capacity guarantee. Begin with one API process and managed PostgreSQL; increase API memory/CPU when measured demand requires it. Do not add Kubernetes or separate microservices for this cohort. The 512 MB process must pass a memory/load check before live use. For 100 simultaneous active users, measure separately before promising service.

The $7/$32 base estimates are unchanged because the preceding budget already excluded AI. Pausing AI removes optional usage costs; it does not remove the database or server needed by learning logs and dashboards. No paid resources have been canceled or changed.

## Deployment procedure

1. Confirm that the intended Supabase project belongs to this new repository. The connected edumind-ai-learning project was INACTIVE; it may belong to the old deployment. Do not restore, migrate, or replace an old project's data without confirmation.
2. Provision or restore the confirmed target. Select the database region close to the API, accounting for any school residency requirements. For the Singapore API, prefer a nearby supported database region where appropriate.
3. Create a NEW Render Blueprint from deploy/render-student.yaml on the reviewed release commit. Check service names are unused. The root render.yaml is deliberately unchanged. Validate the Blueprint in Render before creation; provider validation has not been run here. Disable Blueprint Auto Sync during setup as well as service auto-deploys.
4. Supply backend DATABASE_URL from Supabase's PostgreSQL session-pooler connection string, with sslmode=require; keep it in Render secret environment settings. Set SUPABASE_URL to the same project's HTTPS URL. No database password or service-role key belongs in frontend variables or GitHub files.
5. Supply frontend VITE_API_BASE_URL as the API's actual public HTTPS origin; VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must match the backend project. The anon/publishable browser key is expected to be public and requires reviewed RLS. Set backend CORS_ORIGINS to the actual frontend origin. Rebuild the frontend after changing VITE variables.
6. Review the existing schema and take a recoverable backup. Apply the release SQL migration, review Data API RLS/grants, and bootstrap the first operator ADMIN through the verified database operator. Follow student-school-release.md for enrollment/authentication steps.
7. Configure signup email delivery and approved redirect URLs. Verify student, parent and teacher account flows against this target. Complete password recovery and remaining commercial launch gaps before school-sale claims.
8. Run the GitHub release checks, PostgreSQL concurrency tests and Android device checks. Health currently reports process health, not continuous database readiness; verify an authenticated database read as part of deployment acceptance.
9. Record the deploy IDs and backup location. Publish the actual frontend /install address only after acceptance. Promote frontend/backend versions together, and keep the preceding version available for rollback.

## Scaling acceptance

Use synthetic school accounts, never live student data, for load testing. Exercise login/profile, daily dashboard, learning-log POST, revision completion and teacher summaries with 12 active users, then 25 and 100. As proposed acceptance targets: no duplicate rewards, no cross-school access, less than 1% server errors, and p95 API time under 1 second excluding external authentication. Watch memory, CPU, database pool waits and query duration. These targets have not yet been measured.

Upgrade when sustained memory approaches the instance limit, CPU is saturated, or latency breaches the agreed target. Add indexes based on slow queries before adding replicas. Use Supabase pooling when adding API workers/instances. Keep uploads in private object storage with scoped signed access; never use the API's ephemeral filesystem for students' videos. Specify video size/retention before quoting a fixed school subscription price.

## Sources

- https://render.com/pricing
- https://render.com/docs/blueprint-spec
- https://render.com/docs/free
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/platform/backups
