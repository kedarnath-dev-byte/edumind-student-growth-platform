# Role-Aware Frontend Routing

## Purpose

After Supabase Email + Password login, the frontend now asks the backend for the
linked EduMind profile and redirects the user to the best dashboard for their
role.

Existing MVP routes are still open. This step does not protect private routes
yet.

## Profile Lookup After Login

After login succeeds, the frontend calls:

```text
GET /api/v1/auth/me/profile
```

with:

```http
Authorization: Bearer <supabase_access_token>
```

The backend returns the linked EduMind `AppUser` and any matching student,
teacher, or parent profile data.

## Role Redirects

- `STUDENT` -> `/student-dashboard`
- `TEACHER` -> `/teacher-dashboard`
- `PARENT` -> `/parent-dashboard`
- `ADMIN` -> `/student-dashboard` for now
- unknown or missing role -> `/student-dashboard`

## Profile Not Linked Behavior

If Supabase login succeeds but EduMind profile mapping is missing, the frontend
keeps the user signed in and shows:

```text
Login successful, but your EduMind profile is not linked yet. Please contact EduMind admin.
```

The user can open `/profile-status` to confirm their login and profile mapping
state.

## How To Prepare A Pilot User

1. Create Supabase Auth user.
2. Create EduMind `AppUser` with the same email.
3. Create the correct profile:
   - `StudentProfile`
   - `TeacherProfile`
   - `ParentProfile`
4. Login from the frontend.
5. The backend auto-links by email if `supabase_user_id` is empty.

## Current Limitations

- Existing routes are still not protected.
- Dashboard data still uses hardcoded MVP IDs.
- Role-aware routing only affects post-login redirect and display state.
- Admin still redirects to the student dashboard for now.
- Plan/access-level rules are not implemented yet.

## Next Steps

Step 39: Protect private routes

Step 40: Replace hardcoded IDs with profile-based IDs

Step 41: Plan/access-level foundation
