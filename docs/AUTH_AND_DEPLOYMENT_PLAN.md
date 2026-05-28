# Auth And Deployment Plan

## A. Why Auth Is Needed Before Real Usage

The current MVP uses hardcoded IDs:

- `student_id = 1`
- `helper_student_id = 2`
- `school_id = 1`
- `classroom_id = 1`
- `subject_id = 1`
- `topic_id = 1`

This is acceptable for a controlled local demo, but it is risky for real pilot
usage.

Risks:

- Student data can mix.
- A parent may see the wrong child data.
- A teacher may see the wrong classroom.
- Privacy trust can break.
- Pilot feedback can become confusing because actions are not tied to real
  accounts.

Auth and role mapping should be added before collecting real student learning
data at scale.

## B. Recommended Technical Order

1. Pilot safety docs
2. Auth and roles
3. Replace hardcoded IDs
4. Cloud database
5. Backend deployment
6. Frontend deployment
7. PWA/mobile browser install
8. Android APK later
9. iPhone/TestFlight later
10. Pilot metrics dashboard

## C. Roles Needed

- `ADMIN` / `FOUNDER`
- `STUDENT`
- `TEACHER`
- `PARENT`

## D. Suggested User/Profile Tables

Future tables:

- `users`
- `student_profiles`
- `teacher_profiles`
- `parent_profiles`
- `parent_student_links`
- `classroom_students`
- `schools`
- `classrooms`
- `subjects`
- `topics`

These tables should support real role-based access instead of hardcoded MVP IDs.

## E. Auth Choices

### Option 1: Supabase Auth + Supabase Postgres

Pros:

- Auth and Postgres in one platform
- Faster pilot setup
- Helps move away from local SQLite
- Good fit for web and future mobile/PWA usage

Cons:

- Requires learning Supabase patterns
- Some backend integration work is needed

### Option 2: Firebase Auth

Pros:

- Mature auth platform
- Good mobile ecosystem

Cons:

- Database choice may become split if backend still uses SQLAlchemy/Postgres
- More adaptation needed for current FastAPI/SQLAlchemy direction

### Option 3: Custom FastAPI JWT Auth

Pros:

- Full control
- Fits directly inside the current backend

Cons:

- More security responsibility
- Slower to build safely
- Password reset, email verification, and account management require extra work

### Recommendation

Use Supabase Auth + Supabase Postgres for the pilot because it provides auth and
Postgres together and helps move away from local SQLite.

## F. Deployment Recommendation

For the first web pilot:

- Backend: Render FastAPI
- Database: Supabase Postgres
- Frontend: Vercel
- Frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend-url
```

This keeps the first deployment simple while still being close to production
patterns.

## G. Mobile Readiness Plan

### Phase 1

- Mobile browser web app
- Add to Home Screen

### Phase 2

- PWA install

### Phase 3

- Android APK using Capacitor

### Phase 4

- iPhone TestFlight/App Store later

Do not start APK work before auth because all data may mix under hardcoded IDs.

## H. Android APK Note

- APK can be shared on WhatsApp later.
- Parents may see security warnings when installing an APK directly.
- A web/PWA link is safer for the first pilot.
- Capacitor can wrap the React app later.

## I. iPhone Note

- iPhone cannot install APK files.
- First use a web link or Add to Home Screen.
- Later use Apple Developer/TestFlight if needed.

## J. Next Implementation Steps

Step 28: Backend user/role/profile tables

Step 29: Login + JWT or Supabase auth integration

Step 30: Replace hardcoded IDs in frontend/service layer

Step 31: Deploy backend + database

Step 32: Deploy frontend

Step 33: PWA/mobile install
