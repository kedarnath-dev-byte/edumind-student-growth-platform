# Frontend Supabase Login

## A. Purpose

EduMind now has a frontend Supabase Email + Password login foundation.

This is a safe first step toward real pilot accounts. Existing MVP dashboards
remain open for now, so the current demo flow is not blocked.

## B. Auth Choice

- Current auth method: Email + Password.
- Phone OTP is not used yet.
- Public signup is not enabled.
- Pilot users are created manually by EduMind admin.

## C. Required Env Variables

Local frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://nlcjzvcpuerskzitnlee.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Vercel:

```env
VITE_API_BASE_URL=<Render backend URL>
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase publishable key>
```

Do not commit real keys or secrets into the repository.

## D. How To Create Pilot Users

In Supabase Dashboard:

```text
Authentication -> Users -> Add user
```

Example pilot users:

- `student1@edumind.local`
- `parent1@edumind.local`
- `teacher1@edumind.local`
- `admin@edumind.local`

Use temporary passwords for the pilot. Ask users to change them later when a
password reset flow exists.

## E. Current Limitation

- Login exists, but pages are not protected yet.
- Backend does not verify JWT yet.
- Login does not yet map to `AppUser` or profile tables.
- Dashboards still use hardcoded demo IDs.
- Phone OTP is later.
- Plans such as FREE, PLUS, PRO, and SCHOOL are later.

## F. Next Technical Steps

Step 36: Backend Supabase JWT verification using JWKS/ECC keys

Step 37: Map Supabase user to AppUser/Profile

Step 38: Role-aware routing

Step 39: Protect pages

Step 40: Add plan/access-level foundation

Step 41: Replace hardcoded IDs gradually
