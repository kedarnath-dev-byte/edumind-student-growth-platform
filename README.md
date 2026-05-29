# EduMind Student Growth Platform

EduMind helps students build successful learning habits by connecting daily
learning reflection, spaced revision, honest confusion sharing, successful
habits, and peer support.

> "There are no permanently successful people. There are only successful habits."

Schools teach. EduMind protects learning.

## MVP Foundation

This repository is an MVP foundation for the EduMind Student Growth Platform. It
is not a finished production product yet. The current build demonstrates the
core Student -> Teacher -> Parent learning visibility loop.

## Problem EduMind Solves

Students often forget what they learn after class or after exams. Many students
also hesitate to say what they did not understand, because confusion can feel
unsafe or embarrassing.

Teachers and parents usually see marks, homework, or attendance, but they do not
always see the daily learning process:

- What was taught today
- What the student understood
- What still needs support
- Whether revision happened at the right time
- Whether the student is building consistent learning habits

EduMind focuses on learning growth without shame, ranking, or public comparison.

## MVP Feature Overview

- Student Dashboard as the main demo entry point
- Daily Learning Log for what was taught, understood, and needs support
- Automatic revision schedule after 24H, 7D, 1M, 3M, and 6M
- Today's Revision Mission
- Memory Rescue for overdue revisions
- Revision proof text and RevisionAttempt history
- Future revision lock to protect spaced repetition
- Successful Habits dashboard
- Peer Learning Circle for safe support and explanation
- Teacher Dashboard for class-level support signals
- Parent Dashboard for child learning growth signals
- Demo seed endpoint for local demos

## Screenshot Gallery

![Student Dashboard](docs/screenshots/student-dashboard.png)

![Daily Learning Log](docs/screenshots/daily-learning-log.png)

![Revision Dashboard](docs/screenshots/revision-dashboard.png)

![Successful Habits](docs/screenshots/successful-habits.png)

![Peer Learning Circle](docs/screenshots/peer-learning-circle.png)

![Teacher Dashboard](docs/screenshots/teacher-dashboard.png)

![Parent Dashboard](docs/screenshots/parent-dashboard.png)

## Complete Demo Flow

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

- Python 3.11
- FastAPI
- SQLAlchemy
- Pydantic
- SQLite for local MVP development
- React
- Vite
- Tailwind CSS
- Existing RAG, ingestion, health, and evaluation modules preserved

## Architecture Overview

```text
backend/
  main.py
  core/
    database.py
  modules/
    health/
    ingestion/
    rag/
    evaluation/
    student_growth/
      learning logs
      revisions
      habits
      peer learning
      teacher dashboard
      parent dashboard

frontend/
  src/
    pages/
    services/
    components/
```

The Student Growth MVP uses a simple service-layer structure:

- Routes/controllers handle HTTP
- Services handle business logic
- SQLAlchemy models represent data
- Pydantic schemas validate API input and output

## Main Frontend Routes

- `/student-dashboard`
- `/student-growth`
- `/student-revisions`
- `/student-habits`
- `/student-peer-learning`
- `/teacher-dashboard`
- `/parent-dashboard`

The protected root route redirects to `/student-dashboard` for the demo flow.

## Backend API Groups

- Health APIs
- Ingestion APIs
- RAG APIs
- Evaluation APIs
- School setup APIs
- Learning log APIs
- Revision APIs
- Reward APIs
- Habit summary APIs
- Peer learning APIs
- Teacher dashboard APIs
- Parent dashboard APIs
- Development demo seed API

## Current MVP Status

Built:

- Student Dashboard
- Daily Learning Log frontend/backend
- Revision Dashboard frontend/backend
- Revision proof text
- RevisionAttempt history
- Future revision backend lock
- Successful Habits backend/frontend
- Peer Learning Circle backend/frontend
- Teacher Dashboard backend/frontend
- Parent Dashboard backend/frontend
- Demo seed endpoint
- Local development documentation
- Demo script
- MVP checklist

## Known Limitations

- No auth/login yet
- Hardcoded MVP demo IDs
- Local SQLite database
- No production deployment yet
- No video upload yet
- No notifications or reminders yet
- No real teacher/parent role mapping yet
- No mobile app
- No payment system
- No public leaderboard or ranking
- No AI video analysis

## Roadmap

1. Stabilize the MVP demo.
2. Add authentication and real student/teacher/parent roles.
3. Improve Teacher Dashboard with filters, names, and classroom workflows.
4. Improve Parent Dashboard with real parent-child mapping.
5. Add video proof upload.
6. Add reminders and notifications.
7. Prepare AWS/cloud deployment.
8. Run a small school or coaching-center pilot.

## Deployment

Backend deployment preparation for Render + Supabase Postgres is documented in
[Render Backend Deployment](docs/RENDER_BACKEND_DEPLOYMENT.md). Broader auth,
database, and deployment planning is tracked in
[Auth And Deployment Plan](docs/AUTH_AND_DEPLOYMENT_PLAN.md).

## Mobile/PWA

EduMind can be opened from a mobile browser and added to the home screen before
building native Android or iPhone apps. See the
[Mobile Install Guide](docs/MOBILE_INSTALL_GUIDE.md).

## Auth

Frontend login foundation uses Supabase Email + Password for manually created
pilot accounts. Existing MVP dashboards are not protected yet. See
[Frontend Supabase Login](docs/AUTH_FRONTEND_LOGIN.md).

Backend Supabase JWT verification foundation is available through
`GET /api/v1/auth/me`. Existing dashboard APIs are not protected yet. See
[Backend Supabase JWT Verification](docs/BACKEND_SUPABASE_JWT_VERIFICATION.md).

Verified Supabase users can now be mapped to EduMind `AppUser` and profile
records through `GET /api/v1/auth/me/profile`. See
[Auth User Profile Mapping](docs/AUTH_USER_PROFILE_MAPPING.md).

After login, the frontend now uses the mapped EduMind role to redirect students,
teachers, and parents to the right dashboard. Existing routes remain open. See
[Role-Aware Frontend Routing](docs/ROLE_AWARE_FRONTEND_ROUTING.md).

## Documentation

- [Local Development Guide](docs/LOCAL_DEVELOPMENT.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [MVP Checklist](docs/MVP_CHECKLIST.md)
- [Pilot Safety And Parent Consent](docs/PILOT_SAFETY_AND_CONSENT.md)
- [Auth And Deployment Plan](docs/AUTH_AND_DEPLOYMENT_PLAN.md)
- [Render Backend Deployment](docs/RENDER_BACKEND_DEPLOYMENT.md)
- [Mobile Install Guide](docs/MOBILE_INSTALL_GUIDE.md)
- [Frontend Supabase Login](docs/AUTH_FRONTEND_LOGIN.md)
- [Backend Supabase JWT Verification](docs/BACKEND_SUPABASE_JWT_VERIFICATION.md)
- [Auth User Profile Mapping](docs/AUTH_USER_PROFILE_MAPPING.md)
- [Role-Aware Frontend Routing](docs/ROLE_AWARE_FRONTEND_ROUTING.md)

## Product Principle

EduMind is not a ranking platform. It is designed to help students learn
honestly, revise scientifically, explain clearly, and help each other grow.
