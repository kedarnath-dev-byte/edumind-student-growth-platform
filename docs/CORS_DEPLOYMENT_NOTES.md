# CORS Deployment Notes

## Purpose

Vercel frontend deployments must be allowed by the Render FastAPI backend before
the browser can call authenticated endpoints such as:

```text
GET /api/v1/auth/me/profile
```

## Allowed Origins

The backend allows local frontend development:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

The backend also allows Vercel deployments:

- `https://edumind-student-growth-platform.vercel.app`
- Vercel preview URLs matching `https://*.vercel.app`

Optional additional exact origins can be configured with:

```env
CORS_ORIGINS=https://your-custom-domain.com,https://another-origin.com
```

## Troubleshooting

If the browser shows a CORS error for `/api/v1/auth/me/profile`:

1. Confirm the Render backend has the latest deployment.
2. Confirm the frontend URL is a Vercel `https://*.vercel.app` URL or is listed
   in `CORS_ORIGINS`.
3. Confirm the request uses the correct backend URL through `VITE_API_BASE_URL`.
4. Redeploy the backend after changing CORS environment variables.

If the profile is not linked after CORS is fixed, the frontend should show the
friendly profile-not-linked message instead of a browser CORS error.
