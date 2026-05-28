# Render Backend Deployment

## Purpose

This guide prepares the EduMind FastAPI backend for Render deployment using a
Supabase Postgres `DATABASE_URL`.

The current goal is deployment readiness for the MVP foundation. This does not
add authentication, production permissions, or payment/mobile/video features.

## Prerequisites

- GitHub repository pushed and available to Render.
- Supabase Postgres `DATABASE_URL` ready.
- `psycopg2-binary` present in `backend/requirements.txt`.
- Backend already works locally with either SQLite fallback or Supabase
  Postgres.

## Render Service Setup

1. Open Render.
2. Create a **New Web Service**.
3. Connect the EduMind GitHub repository.
4. Use these settings:

```text
Root Directory: backend
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

If you prefer using the helper script, the start command can be:

```text
bash render_start.sh
```

## Environment Variables

Set these in Render environment settings. Do not commit real secrets to GitHub.

```env
DATABASE_URL=postgresql+psycopg2://postgres:<password>@<host>:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
```

Future auth-related variables may include:

```env
SUPABASE_JWT_SECRET=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only add future auth secrets when the auth implementation is actually built.

## Important Notes

- Do not put `.env` files with real passwords in GitHub.
- Prefer the Supabase Transaction Pooler `DATABASE_URL` for hosted backend
  deployment.
- If Supabase pooler DNS fails locally, try a stable Wi-Fi connection or test
  the direct database connection string.
- Render stores secrets in service environment variables.
- The local SQLite fallback remains useful for development when `DATABASE_URL`
  is not set.

## After Deployment Test

After Render deploys successfully:

1. Open:

```text
https://your-render-url/docs
```

2. Run:

```text
POST /api/v1/dev/seed-demo-data
```

3. Verify parent dashboard summary:

```text
GET /api/v1/parent-dashboard/student/1/summary
```

4. Verify teacher dashboard summary:

```text
GET /api/v1/teacher-dashboard/classroom/1/summary
```

5. Confirm the responses show Supabase-backed data.

## Known Limitations

- Auth is not implemented yet.
- Hardcoded MVP IDs are still used by the demo frontend.
- `POST /api/v1/dev/seed-demo-data` should be protected or disabled before any
  public production launch.
- `Base.metadata.create_all` is acceptable for MVP deployment checks, but
  Alembic migrations are needed before repeated production schema changes.
- This guide does not cover Vercel frontend deployment yet.
