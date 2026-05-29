# Auth User Profile Mapping

## Purpose

EduMind now has a backend bridge between Supabase Auth users and EduMind
application users/profiles.

Supabase Auth proves who signed in. EduMind `AppUser` and profile tables explain
what that person can become inside the product: student, teacher, parent, or
admin.

## Supabase User vs EduMind AppUser

Supabase Auth user:

- Created in Supabase Authentication.
- Owns the login identity and access token.
- Has a Supabase `sub` user id.

EduMind `AppUser`:

- Stored in the EduMind database.
- Stores product role such as `STUDENT`, `TEACHER`, `PARENT`, or `ADMIN`.
- Links to student, teacher, or parent profile records.
- Stores `supabase_user_id` to connect to the Supabase Auth user.

## supabase_user_id Mapping

`AppUser.supabase_user_id` stores the Supabase Auth `sub` claim.

When `GET /api/v1/auth/me/profile` is called:

1. Backend verifies the Supabase JWT.
2. Backend reads `sub` and `email` from the token.
3. Backend finds `AppUser.supabase_user_id == sub`.
4. If not found, backend can safely auto-link by email when:
   - token email exists
   - `AppUser.email` matches token email
   - `AppUser.supabase_user_id` is still empty

If no linked user is found, the API asks the user to contact EduMind admin.

## Admin-Created Pilot Users

For the pilot, EduMind admin should create users manually:

1. Create Supabase Auth user.
2. Create EduMind `AppUser`.
3. Create the matching profile:
   - `StudentProfile`
   - `TeacherProfile`
   - `ParentProfile`
4. Create links where needed:
   - parent to student
   - student to classroom
   - teacher to classroom

## How To Link

### Option A: Matching Email Auto-Link

1. Create Supabase Auth user with email.
2. Create EduMind `AppUser` with the same email and empty `supabase_user_id`.
3. User logs in.
4. Call:

```text
GET /api/v1/auth/me/profile
```

The backend links `supabase_user_id` automatically if the email match is safe.

### Option B: Link Current User Helper

Call:

```text
POST /api/v1/auth/link-current-user
```

Body:

```json
{
  "app_user_id": 1
}
```

This sets the current Supabase token user id onto that `AppUser`.

This is a pilot helper and should become admin-only later.

## Role/Profile Response

`GET /api/v1/auth/me/profile` returns:

- `app_user`
- `student_profile` for students
- `teacher_profile` and `teacher_classrooms` for teachers
- `parent_profile` and `parent_children` for parents
- `app_user` only for admins for now

## Current Limitations

- Dashboards still use hardcoded MVP IDs.
- Routes are not protected yet.
- `link-current-user` should become admin-only later.
- Login does not yet drive frontend role-aware routing.
- Plan/access-level permissions are not implemented yet.

## Next Steps

Step 38: Role-aware frontend routing

Step 39: Protect private routes

Step 40: Replace hardcoded IDs with profile-based IDs

Step 41: Plan/access levels
