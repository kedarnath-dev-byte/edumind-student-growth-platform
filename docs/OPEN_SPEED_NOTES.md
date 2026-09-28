# EduMind open-speed notes (Render free + Capacitor)

## Measured (2026-09-28 IST)

| Probe | Typical warm TTFB |
| --- | --- |
| `GET /` | ~100–330ms |
| `GET /api/v1/health` (before fix) | ~2.0s every call |
| Unauthenticated `/api/v1/*` (before fix) | ~2.0s (401 still paid the cost) |
| Frontend HTML (Vercel) | ~0.4–0.6s TTFB |
| Main JS bundle | ~745KB transfer |

Root cause of the steady ~2s tax: `TimingMiddleware` wrote `api_metrics` with a **synchronous** SQLAlchemy `commit` **before** returning the response. Supabase is in `ap-south-1`; Render free web is often far away, so every student API paid cross-region DB latency. Concurrent boot fetches stacked on the pool (~5–6s).

## Fixes in `fix/open-speed-timing-middleware-warm-ux`

1. Metric writes run in a background thread pool; health/OPTIONS skipped.
2. `ApiWarmBanner` pings cheap `/` + Retry button.
3. Home loads Log/Revision wedge first; peer circle deferred; real error text + Retry.
4. GitHub Action keep-warm every 10m (01–17 UTC ≈ 07–23 IST) hitting `/` then health.
5. Cap SplashScreen auto-hide hint (requires APK rebuild / `npx cap sync`).
6. Long-cache headers for `/assets/*` on Vercel.

## Still needs human / paid plan

- **Render paid (Starter+)** to stop spin-down outside keep-warm / Action delays.
- Prefer Render region closer to Supabase (`singapore` / near `ap-south-1`) — human dashboard change.
- Re-auth Vercel MCP team scope `kedarnath-dev-bytes-projects` for runtime logs.
- Re-auth Render MCP for metrics/logs.
- Do **not** flip `WHATSAPP_DRY_RUN` or bulk-replace Render env as part of speed work.

## Keep-warm GitHub Action (manual enable)

This PR ships the workflow body at `docs/keep-warm.github-actions.yml` because
the automation token lacked the `workflow` scope to push `.github/workflows/*`.

To enable:

```bash
cp docs/keep-warm.github-actions.yml .github/workflows/keep-warm.yml
git add .github/workflows/keep-warm.yml
git commit -m "ci: keep Render warm every 10m during IST day"
git push
```

Or paste the same file in the GitHub UI under Actions → New workflow.
