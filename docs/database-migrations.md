# Forge — Database Migrations

This document describes how the Forge database schema is versioned, applied, and
reviewed. It exists so that the production schema can be reproduced from source
and so that release rollback and backup/restore have a clear, audited path.

## Background — BASELINE vs HISTORICAL MIGRATION RECORD

The Forge database was originally built manually (via the Supabase SQL editor /
dashboard). Only **two** migrations existed in the remote `supabase_migrations`
history before the baseline was authored:

| Version | Name |
| --- | --- |
| `20260815154220` | `harden_billing_limit_rpcs_and_add_builder_upgrade_path` |
| `20260815154625` | `use_security_invoker_for_user_billing_rpcs` |

These two are **historical** migrations — they genuinely ran against production.
The remaining ~65 tables, all RLS policies, triggers, and functions had **no**
migration record.

`supabase/migrations/20260815000000_forge_schema_baseline.sql` is the **BASELINE**.
It captures the full current schema (tables, constraints, indexes, functions,
triggers, RLS policies, storage bucket/policies) as discovered from the live
database. It is **not** a claim that these objects were historically created by
a migration — they were not.

### Known live drift

The baseline reflects **current** state, which can differ from the historical
migrations. One known example: `public.current_user_plan` is `SECURITY DEFINER`
and `plpgsql` in the live database, even though migration `20260815154625`
recorded switching it to `security invoker`. The baseline records the *current*
definition; reconciling intent (which state is correct) is a separate follow-up.

## Directory layout

```
supabase/migrations/
  20260815000000_forge_schema_baseline.sql   # canonical baseline (idempotent)
  <YYYYMMDDHHMMSS>_<name>.sql                # future migrations
```

Migration files use Supabase-compatible `YYYYMMDDHHMMSS` timestamp naming and
are applied in ascending version order.

## How to create a migration

1. Never modify the baseline file. Create a **new** file with the next timestamp.
2. Name it `<YYYYMMDDHHMMSS>_<short-description>.sql`, e.g.
   `20260816090000_add_team_limits.sql`.
3. Write forward-only DDL (tables, columns, indexes, functions, policies).
4. Make it idempotent where safe (`IF NOT EXISTS`, `OR REPLACE`, `DROP POLICY IF
   EXISTS` before `CREATE POLICY`).
5. Add destructive operations (see below) only with an explicit rollback plan.

## How to review a migration

- Check RLS: every new table gets `enable row level security` plus explicit
  `create policy` statements. No broad `using (true)` policies for
  project-scoped, billing, or admin data.
- Check tenancy: project-scoped policies must reference `auth.uid()` via
  `is_project_member`, `forge_project_role`, or workspace ownership helpers.
- Check billing/admin: never grant normal users the ability to modify
  `subscriptions.plan_key`, `status`, `stripe_*` fields, or `platform_admins`.
- Check secrets: no API keys, Stripe keys, or credentials in SQL.
- Grep for destructive keywords before merging (see audit list below).

## How to apply safely

- **Fresh database**: `supabase db push` (or `db reset` in local dev) applies the
  baseline then any subsequent migrations in order.
- **Existing production database**: the baseline must be marked as already
  applied WITHOUT re-running it, because the objects already exist:

  ```bash
  supabase migration repair --status applied 20260815000000
  ```

  The baseline is written idempotently, so even if it is executed against the
  live database it will not duplicate or destroy objects — but `migration
  repair` is the recommended, zero-touch approach.
- Always verify with `supabase migration list` after applying.

## How to confirm remote state

```bash
supabase migration list                 # compare local files vs remote history
supabase db diff --linked               # show drift between repo and remote
```

Also confirm at the SQL level:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

## Never edit an already-applied migration

A migration that has already run against production is immutable. If its outcome
is wrong, write a **new** migration that corrects it. Editing an applied file
changes its recorded hash and corrupts the migration history.

## Backup requirement for destructive changes

Any migration containing `DROP TABLE`, `TRUNCATE`, `DELETE FROM`, `DROP SCHEMA`,
`CASCADE`, or `ALTER ... DROP COLUMN` requires:

1. An explicit justification recorded in the migration comment header.
2. A verified backup (or equivalent point-in-time restore) of production taken
   before the migration is applied.
3. A documented rollback path.

The baseline contains **none** of these destructive operations.

## Destructive SQL audit list

Search migration files for:

- `DROP TABLE`
- `TRUNCATE`
- `DELETE FROM`
- `DROP SCHEMA`
- `CASCADE`
- `ALTER ... DROP COLUMN`

`DROP TRIGGER IF EXISTS` and `DROP POLICY IF EXISTS` (immediately recreated) are
acceptable idempotent patterns and are not considered destructive here.