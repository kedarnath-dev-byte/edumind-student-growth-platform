# Production Readiness Audit

## Current Production-Ready Items

- Render backend can use Supabase Postgres through `DATABASE_URL`.
- Vercel frontend can call the Render backend with CORS configured for previews.
- Supabase Email + Password login foundation exists.
- Backend can verify Supabase JWTs through JWKS.
- EduMind `AppUser` can map to student, teacher, and parent profiles.
- Role-aware frontend redirect exists after login.
- Frontend role dashboard route protection exists for student, teacher, and
  parent dashboards.
- Existing dashboards remain available for MVP demo use.

## Current Known Risks

- Existing dashboard data still uses hardcoded MVP IDs.
- Backend API routes are not protected yet.
- `POST /api/v1/dev/seed-demo-data` is still public and must be disabled or
  protected before public school rollout.
- `Base.metadata.create_all` creates missing tables but does not alter existing
  production tables.
- Supabase production tables may need manual migration SQL before new columns or
  indexes are available.
- No payment, plan, or access-level enforcement exists yet.

## Fixed In This Step

- Blank `AppUser.phone` values are normalized to `NULL`.
- Blank `ParentProfile.phone` values are normalized to `NULL`.
- Multiple users can be created without phone numbers.
- Duplicate user email now returns a clean onboarding error.
- Duplicate non-empty user phone now returns a clean onboarding error.
- Duplicate student, teacher, or parent profile for the same `user_id` now
  returns a clean onboarding error.
- Production database migration notes were added for Supabase manual cleanup.

## Must Wait For Later Steps

- Protecting private routes.
- Replacing hardcoded dashboard IDs with profile-derived IDs.
- Making `link-current-user` admin-only.
- Disabling or protecting dev seed endpoints.
- Adding Alembic or another migration system.
- Adding plan/access-level foundations.
