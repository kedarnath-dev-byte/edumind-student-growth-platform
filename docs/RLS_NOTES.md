# Supabase RLS notes (do not enable blindly)

**Status:** Documentation only. **Do not** flip RLS on production tables without policies reviewed per role.

## Why caution

EduMind's API currently authorizes via FastAPI JWT + role checks. Enabling Postgres RLS without matching `auth.uid()` policies will break Render's service-role / connection-string access patterns and student reads.

## Safe next steps (human + engineer)

1. Inventory tables: `learning_logs`, `revision_tasks`, `product_events`, `notification_outbox`, social posts.
2. Decide: API service role bypasses RLS **or** every query sets `request.jwt.claim`.
3. Draft policies for student = own `student_id`; parent = linked children; teacher = classroom; admin = all.
4. Test on a branch DB; never enable on pilot DB in the same PR as feature work.

## Related

- AuthZ hard lock already on student_growth routes (P0).
- School/classroom filters remain application-level until RLS lands.
