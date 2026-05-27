# Local Development Guide

This guide keeps EduMind AI local setup predictable on Windows.

## Backend

Use the project virtual environment Python. The expected version is:

```text
Python 3.11.x
```

CMD, using the project venv directly:

```cmd
cd C:\Users\mkeda\edumind-ai-\backend
C:\Users\mkeda\edumind-ai-\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Activated venv:

```cmd
cd C:\Users\mkeda\edumind-ai-
.venv\Scripts\activate
cd backend
python --version
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend

The frontend must call the FastAPI backend at `http://127.0.0.1:8000`.

CMD:

```cmd
cd C:\Users\mkeda\edumind-ai-\frontend
set VITE_API_BASE_URL=http://127.0.0.1:8000
npm run dev
```

PowerShell:

```powershell
cd C:\Users\mkeda\edumind-ai-\frontend
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

If Vite says port `5173` is busy, use the new port shown in the terminal.

## URLs

- Backend Swagger: `http://127.0.0.1:8000/docs`
- Student Dashboard: `http://localhost:<vite-port>/student-dashboard`
- Student Learning Log: `http://localhost:<vite-port>/student-growth`
- Student Revisions: `http://localhost:<vite-port>/student-revisions`
- Successful Habits: `http://localhost:<vite-port>/student-habits`
- Peer Learning Circle: `http://localhost:<vite-port>/student-peer-learning`

## Recommended Demo Path

1. Open `/student-dashboard` first.
2. Open `/student-growth`.
3. Open `/student-revisions`.
4. Open `/student-habits`.
5. Open `/student-peer-learning`.

## Demo Data

Local demo data can disappear if `backend/edumind.db` is restored from git.
Recreate demo data through Swagger:

1. Start the backend.
2. Open `http://127.0.0.1:8000/docs`.
3. Run `POST /api/v1/dev/seed-demo-data`.
4. Open the frontend pages.

The seed endpoint creates or reuses setup data and creates a demo learning log
with revision tasks for Memory Rescue, Today's Revision, Next 7 Days, and Future
Locked Revisions.

## Git Cleanup

Always stop backend and frontend servers before restoring the local database.
`backend/edumind.db` can be locked while uvicorn is running.

From the project root:

```cmd
git restore backend/__pycache__ backend/core/__pycache__ backend/modules/__pycache__ backend/modules/evaluation/__pycache__ backend/modules/health/__pycache__ backend/modules/ingestion/__pycache__ backend/edumind.db
```

If the database restore fails because the file is locked, stop uvicorn. If a
Python process is still holding the file, use:

```cmd
taskkill /IM python.exe /F
```

## Troubleshooting

- If the backend says `ModuleNotFoundError: chromadb`, you probably used Python
  3.14 or another system Python. Use
  `C:\Users\mkeda\edumind-ai-\.venv\Scripts\python.exe`, which should be Python
  3.11.x.
- If frontend dropdowns are empty, confirm the backend is running and
  `VITE_API_BASE_URL` is set to `http://127.0.0.1:8000`.
- If the frontend receives HTML instead of JSON, it is calling Vite instead of
  the backend. Set `VITE_API_BASE_URL=http://127.0.0.1:8000` and restart Vite.
- If `git restore backend/edumind.db` fails with an unlink or locked-file error,
  stop uvicorn or run `taskkill /IM python.exe /F`.
- If Vite port `5173` is busy, open the new localhost port shown by Vite.
