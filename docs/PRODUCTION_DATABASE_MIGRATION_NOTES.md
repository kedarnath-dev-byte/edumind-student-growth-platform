# Production Database Migration Notes

## Why Manual Migration Is Needed

`Base.metadata.create_all` creates missing tables, but it does not alter existing
tables. If Supabase already has an older table shape, new columns and indexes may
need manual SQL.

Before real pilot onboarding, confirm the production database schema matches the
current backend models.

## Required Known SQL

Run this in Supabase SQL Editor if the production database was created before
`supabase_user_id` existed:

```sql
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR;

CREATE UNIQUE INDEX IF NOT EXISTS ix_app_users_supabase_user_id
ON app_users (supabase_user_id)
WHERE supabase_user_id IS NOT NULL;
```

Clean old blank phone values:

```sql
UPDATE app_users
SET phone = NULL
WHERE phone = '';

UPDATE parent_profiles
SET phone = NULL
WHERE phone = '';
```

## Phone Field Rule

- `NULL` phone is allowed for many users.
- Empty string phone should not be stored.
- Non-null phone should be unique where the model requires uniqueness.

## Future Recommendation

Add Alembic migrations before repeated production schema changes. Manual SQL is
acceptable for this MVP pilot transition, but it should not remain the long-term
database migration process.
