# Backend Supabase JWT Verification

## Purpose

EduMind backend can now verify a Supabase access token sent by the frontend:

```http
Authorization: Bearer <supabase_access_token>
```

This is a foundation step only. Existing Student, Teacher, and Parent dashboard
routes are not protected yet.

## Why JWKS/ECC Verification

This Supabase project uses JWT Signing Keys with ECC/P-256-compatible public
keys. Because of that, backend verification should use the Supabase JWKS
endpoint instead of the legacy `SUPABASE_JWT_SECRET`.

JWKS URL:

```text
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

## Required Backend Environment Variable

```env
SUPABASE_URL=https://nlcjzvcpuerskzitnlee.supabase.co
```

Do not commit real secrets or private keys.

## Frontend Token Header

After Supabase login, the frontend can call protected endpoints later with:

```http
Authorization: Bearer <supabase_access_token>
```

## Test Endpoint

```text
GET /api/v1/auth/me
```

If the token is valid, the backend returns:

```json
{
  "authenticated": true,
  "supabase_user_id": "...",
  "email": "...",
  "role": "authenticated",
  "aud": "authenticated"
}
```

Missing token:

```json
{
  "detail": "Missing authorization token"
}
```

Invalid or expired token:

```json
{
  "detail": "Invalid or expired authorization token"
}
```

## Current Limitations

- Existing dashboards are not protected yet.
- Backend JWT verification is not yet connected to `AppUser` or profile tables.
- Role-aware routing is not implemented yet.
- Hardcoded MVP demo IDs still exist.

## Next Steps

Step 37: AppUser/Profile mapping

Step 38: Role-aware routing

Step 39: Protect private routes
