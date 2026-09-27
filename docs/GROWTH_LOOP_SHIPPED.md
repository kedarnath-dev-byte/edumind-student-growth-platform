# Growth loop shipped (Wave 1-3 foundation)

This drop starts the competitive gaps vs Duolingo / ClassDojo / Seesaw.

## Built now

- JWT required on learning logs, revisions, rewards, parent summary
- Learning logs always save as the logged-in student (no spoofed student_id)
- Class 6-letter join codes
- Parent invite codes
- In-app notification inbox + quiet-hour preferences
- Auto in-app notice after a learning log, including linked parents
- Google OAuth button (enable Google provider in Supabase)
- Student/parent dashboards use linked profile IDs instead of hardcoded 1
- Demo seed remains admin-only and blocked in production

## Enable Google

Supabase -> Authentication -> Providers -> Google.
