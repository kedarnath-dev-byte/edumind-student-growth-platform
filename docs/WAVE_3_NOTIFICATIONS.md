# Wave 3 — notifications that protect memory

POST /api/v1/growth/notifications/me/refresh
POST /api/v1/growth/notifications/dispatch

Creates in-app rows, one per person per day per task:
- REVISION_DUE
- MEMORY_RESCUE
- PARENT_DIGEST (allowed in quiet hours)
- TEACHER_SUPPORT

Quiet hours default 20:00-07:00 Asia/Kolkata.
Student dashboard shows the latest unread banner.
After first successful learning log, browser may ask notification permission.
