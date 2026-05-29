# EduMind MVP Checklist

This checklist captures the current EduMind Student Growth Platform MVP demo
foundation.

## Completed MVP Demo Pieces

- Student Dashboard
- Daily Learning Log
- Revision Dashboard
- Revision Proof Text
- RevisionAttempt History
- Future Revision Lock
- Successful Habits Backend
- Successful Habits Frontend
- Peer Learning Backend
- Peer Learning Frontend
- Teacher Dashboard Backend
- Teacher Dashboard Frontend
- Parent Dashboard Backend
- Parent Dashboard Frontend
- Demo Seed Endpoint
- Local Development Docs
- Demo Script
- Pilot Safety Docs
- Auth Planning
- Deployment Planning
- Mobile/PWA Planning
- Mobile/PWA Manifest
- Android Add to Home Screen Guide
- iPhone Add to Home Screen Guide
- Frontend Supabase Email + Password Login Foundation
- Login Route `/login`
- Login/Logout Layout State
- Backend JWT Verification Pending
- Backend Supabase JWT Verification Foundation
- Auth Test Endpoint `/api/v1/auth/me`
- Auth User/Profile Mapping Foundation
- Profile Endpoint `/api/v1/auth/me/profile`
- Role-Aware Frontend Redirect After Login
- Profile Status Route `/profile-status`
- Role-Aware Access Pending
- Plan/Access-Level Gating Pending

## Pitch And Marketing Assets Note

- Pitch PPT / marketing assets are still needed for school and investor demos.
- Recommended assets:
  - One-page school pitch
  - Founder demo deck
  - Product screenshots
  - Short walkthrough video
  - School pilot proposal

## Known Limitations

- No auth/login
- Hardcoded MVP IDs
- Local SQLite database
- No production deployment
- No video upload
- No notifications
- No real teacher/parent role mapping
- No mobile app
- No payment system
- No advanced analytics
- No AI video analysis

## Next Readiness Items

- Pilot safety docs
- Auth planning
- Deployment planning
- Mobile/PWA planning
- Parent consent process
- Real user and role mapping
- Cloud database migration
- Safe social media update process

## Demo Readiness Notes

- Use `POST /api/v1/dev/seed-demo-data` before demos.
- Start the frontend with `VITE_API_BASE_URL=http://127.0.0.1:8000`.
- Begin the demo at `/student-dashboard`.
- Show the full visible triangle:
  - Student journey
  - Teacher support signals
  - Parent growth signals
