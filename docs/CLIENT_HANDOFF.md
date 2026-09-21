# EduMind — Client Handoff

**Date:** 2026-09-21 (IST / Asia/Calcutta)

## Live URLs

| Layer | URL |
|-------|-----|
| Frontend (Vercel) | https://edumind-student-growth.vercel.app |
| Backend API (Render) | https://edumind-backend-69e4.onrender.com |
| API docs (OpenAPI) | https://edumind-backend-69e4.onrender.com/docs |

## Pilot accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | edumind.admin.pilot@gmail.com | AdminPilot123! |
| Student | edumind.pilot.54b7@gmail.com | PilotTest123! |

> Rotate these passwords after the pilot kickoff. Do not share outside the pilot group.

## Demo flows

1. **Learning Log (photos + video)**  
   Student login → Daily Learning Log → subject/topic → optional textbook/notes photos + selfie explanation video → Save → review **My past logs** (date, subject/topic, confidence, media).

2. **Subject Worlds**  
   Student → Subject Feed / Worlds → browse or post.  
   Admin → **Subject Feed** tab → list recent posts → **Remove / Hide**.

3. **Admin Pulse / assign school**  
   Admin → Student Pulse (at-risk board) → student timeline.  
   Schools & Curriculum + People & Roles → assign school/classroom so the log form prefills.

4. **Install on phone**  
   Open the Vercel URL (or WhatsApp link) → Install / Add to Home Screen hint.  
   Guide: `docs/MOBILE_INSTALL_GUIDE.md`. APK path: `docs/ANDROID_APK.md`.

## Known limits (pilot)

- **Render free cold start:** first API call after idle can take 30–60s. Wait and retry — avoid frantic refresh.
- **Drive playback fallback:** some Drive videos/images open via Drive when inline playback is blocked.
- **PWA vs APK:** use PWA for pilots; Capacitor APK is scaffolded but not shipped as a binary from this environment.

## Support checklist

- [ ] Admin sees Student Pulse and Subject Feed moderation  
- [ ] Student saves a learning log with at least one notes photo  
- [ ] Past logs gallery shows after save  
- [ ] Install hint appears on mobile login / dashboard  
