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

## Demo Readiness Notes

- Use `POST /api/v1/dev/seed-demo-data` before demos.
- Start the frontend with `VITE_API_BASE_URL=http://127.0.0.1:8000`.
- Begin the demo at `/student-dashboard`.
- Show the full visible triangle:
  - Student journey
  - Teacher support signals
  - Parent growth signals
