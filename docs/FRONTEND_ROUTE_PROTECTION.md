# Frontend Route Protection

## Purpose

EduMind now protects the main role dashboards in the frontend using Supabase
login state and EduMind profile role mapping.

This is frontend route protection only. Backend API route protection comes
later.

## Protected Routes

- `STUDENT` -> `/student-dashboard`
- `TEACHER` -> `/teacher-dashboard`
- `PARENT` -> `/parent-dashboard`

If a signed-in user tries to open a dashboard outside their role, the frontend
sends them to `/unauthorized`.

Role comparison is strict and normalized with trim + uppercase, so values such
as `teacher`, `TEACHER`, or ` TEACHER ` are treated consistently.

The guard also verifies that the loaded EduMind profile belongs to the current
Supabase user before allowing access. Stale profile state is cleared on
logout/session changes so switching from one account to another cannot reuse the
previous user's role.

## Public Routes

- `/login`

Some existing demo/support routes remain public for now while hardcoded MVP data
is still being replaced gradually.

## Profile Status

`/profile-status` requires login but does not require a linked EduMind profile.
This lets pilot users and the founder debug profile mapping safely.

If a user is signed in but their EduMind profile is not linked, they are not
logged out automatically.

## Unauthorized Page

`/unauthorized` shows:

- Access not allowed message
- Detected role when available
- Link to the correct role dashboard
- Link to `/profile-status`
- Logout button

## Current Limitations

- Backend APIs are not protected yet.
- Dashboard data still uses hardcoded MVP IDs.
- Dev seed endpoint is still public.
- Plan/access-level gating is not implemented yet.

## Next Steps

Step 40: Replace hardcoded IDs with profile-based IDs

Step 41: Protect backend APIs by role

Step 42: Disable/protect dev seed endpoint

Step 43: Plan/access-level foundation
