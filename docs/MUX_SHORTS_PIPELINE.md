# Mux Shorts media pipeline (foundation)

## Why Mux (not Drive) for live Shorts

Google Drive quota is broken for the trial live feed. EduMind uses **Mux** for selfie / Shorts video (Learning Log + Subject Worlds). Drive remains archive-only for proofs/documents and temporary photo uploads until Cloudflare Images.

## Env vars (Render)

Set on the backend service (never commit secrets):

| Variable | Required | Purpose |
|---|---|---|
| `MUX_TOKEN_ID` | yes for uploads | Mux API access token id |
| `MUX_TOKEN_SECRET` | yes for uploads | Mux API access token secret |
| `MUX_CORS_ORIGIN` | optional | Direct-upload CORS (default `*`) |
| `MUX_WEBHOOK_SECRET` | optional later | Webhook signature verification |

Create tokens in [Mux Access Tokens](https://dashboard.mux.com/settings/access-tokens) with **Mux Video** write.

When env is missing, API returns **503** with detail **`Video uploads coming online`**. UI shows the same message — never a Drive quota error on this path.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/mux/status` | none | `{ configured, message, min/max duration }` |
| POST | `/api/v1/mux/uploads` | STUDENT JWT | Creates Mux direct upload → `{ upload_id, upload_url }` |
| GET | `/api/v1/mux/uploads/{upload_id}` | STUDENT JWT | Poll until ready; enforces **30–180s** when duration known |
| POST | `/api/v1/mux/attach` | STUDENT JWT | Attach ready asset to learning log / subject post |
| POST | `/api/v1/mux/webhooks` | none (deferred) | Acknowledges only — processing deferred |

## Duration policy

- Target Shorts length: **30 seconds – 3 minutes (180s)**.
- Client MediaCapture caps recording at 180s and hints ~30s minimum.
- Server enforces duration when Mux asset reports `duration` (poll path).
- **Webhook deferred:** wire Mux Dashboard → `POST /api/v1/mux/webhooks` for `video.asset.ready` later; verify `MUX_WEBHOOK_SECRET`, then reject/flag out-of-range assets. Until then, poll `GET /uploads/{id}` is the source of truth.

## DB columns

See `supabase/migrations/20260922_mux_shorts_fields.sql`:

- `learning_logs`: `mux_asset_id`, `mux_playback_id`, `mux_upload_id`, `video_duration_seconds`
- `subject_posts`: same

`explanation_video_url` / `media_url` still store the HLS URL (`https://stream.mux.com/{playback_id}.m3u8`) for backward-compatible players.

## How to test

1. Without Mux env: open Learning Log → enable selfie → see “Video uploads coming online”; `GET /api/v1/mux/status` → `configured: false`.
2. With Mux env on Render: create upload via Swagger or UI; PUT a 30–90s clip to `upload_url`; poll until `ready`; confirm playback in Shorts player (Worlds / Log → Watch Shorts).
3. Admin / teacher / parent shells unchanged (no Mux UI on those routes).
4. Photos on Learning Log still use Drive (or fail with Drive errors — video path does not).

## Frontend

- `muxUploadService.js` — create / PUT / poll / attach
- `ShortsPlayer.jsx` — vertical snap feed, autoplay muted, tap unmute (hls.js CDN when needed)
- `MediaCapture.jsx` — max 180s, ~30s hint
- Learning Log + Subject Feed — video → Mux; photos unchanged for now
