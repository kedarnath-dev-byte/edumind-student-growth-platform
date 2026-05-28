# edumind-ai

An intelligent education platform built around RAG, LangGraph-style workflows, evaluation, ingestion, and a FastAPI backend with a frontend workspace.

## Portfolio Role

This repository is maintained by Mamani Kedarnath as an applied AI education platform project. It demonstrates backend API structure, document ingestion, RAG flow design, evaluation endpoints, and full-stack project organization.

## Core Capabilities

- FastAPI backend with modular routers
- Health, ingestion, RAG, and evaluation APIs
- Database initialization on application startup
- Timing middleware for evaluation/latency visibility
- Frontend workspace for the education UI
- Environment and dependency structure for local development

## Backend Entry Point

```text
backend/main.py
```

The FastAPI app registers:

- Health routes
- Ingestion routes
- RAG routes
- Evaluation routes
- Timing middleware

## Local Development Quickstart

Use the project virtual environment Python, not a system Python install. The
expected backend Python is `Python 3.11.x`.

### Backend

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

### Frontend

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

### Useful URLs

- Backend Swagger: `http://127.0.0.1:8000/docs`
- Student Dashboard: `http://localhost:<vite-port>/student-dashboard`
- Student Learning Log: `http://localhost:<vite-port>/student-growth`
- Student Revisions: `http://localhost:<vite-port>/student-revisions`
- Successful Habits: `http://localhost:<vite-port>/student-habits`

For demo data, start the backend, open Swagger, run
`POST /api/v1/dev/seed-demo-data`, then open the frontend pages.

See [Local Development Guide](docs/LOCAL_DEVELOPMENT.md) for cleanup and
troubleshooting notes.

## Complete MVP Demo Flow

For a founder-facing school demo script, see
[EduMind Demo Script](docs/DEMO_SCRIPT.md).
For a build-status checklist, see [MVP Checklist](docs/MVP_CHECKLIST.md).

1. Start the backend using the project venv Python 3.11.
2. Open Swagger at `http://127.0.0.1:8000/docs`.
3. Run `POST /api/v1/dev/seed-demo-data`.
4. Start the frontend with `VITE_API_BASE_URL=http://127.0.0.1:8000`.
5. Open `/student-dashboard`.
6. Demo the Student journey:
   - Daily Learning Log
   - Today's Revision
   - Successful Habits
   - Peer Learning Circle
7. Demo the Teacher Dashboard at `/teacher-dashboard`:
   - Topics needing support
   - Students to support
   - Revision health
8. Demo the Parent Dashboard at `/parent-dashboard`:
   - Latest learning logs
   - Revision summary
   - Parent support suggestions

## Tech Stack

- Python
- FastAPI
- RAG architecture
- LangGraph-oriented workflow design
- Database-backed backend modules
- JavaScript frontend workspace

## Future Improvements

- Add API examples for ingestion and RAG endpoints
- Add screenshots or a demo video
- Add `.env.example`
- Add tests for health, ingestion, and RAG routes
- Rename the repository from `edumind-ai-` to `edumind-ai-platform`

## EduMind Student Growth Platform Direction

EduMind AI is evolving into the EduMind Student Growth Platform: a school and college product for daily learning logs, honest understanding tracking, short student explanation videos, spaced revision, teacher visibility, and parent progress monitoring.

The core student loop is: teacher teaches a topic, student records what was taught, what they understood, what they did not understand yet, and a short explanation video. The app then creates revision tasks after 24H, 7D, 1M, 3M, and 6M so students build memory, confidence, and communication through consistent revision.

Future work should preserve the existing RAG, ingestion, health, and evaluation modules while adding new student-growth features through FastAPI, modular services, SQLAlchemy, Pydantic, React/Vite/Tailwind, and `/api/v1` APIs. Student benefit comes first: avoid shame, fear, fake understanding, and unhealthy comparison. Reward honesty, revision, improvement, consistency, and communication.
