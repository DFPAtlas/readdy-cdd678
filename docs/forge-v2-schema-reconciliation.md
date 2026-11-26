# Forge V2 schema reconciliation and secret-RPC repair

Prepared 26 November 2026. Live inspection used catalogue metadata only: no secret values or customer rows were queried, no live DDL was executed and no paid resources were created.

## Confirmed security issue — deployment still required

All five `public.forge_integration_*secret` wrappers run as SECURITY DEFINER and have direct EXECUTE grants for `anon` and `authenticated`. Their bodies have no caller authorization check. Their owner can read the Vault view. The named reader accepts a name and returns plaintext; the ID reader, store, update and delete wrappers are exposed too. This is a confirmed privilege defect; this review does not establish whether anyone exploited it.

The existing source migration revokes PUBLIC only. That does not remove grants assigned directly to the two browser roles. The backend's `forge-integrations` function already calls these wrappers using the service-role client after its admin checks; no frontend caller was found in the repository.

`20261126203359_restrict_integration_secret_rpcs.sql` records the missing named-reader definition with its current signature and behaviour, revokes all function privileges from PUBLIC/anon/authenticated on all five wrappers, and explicitly retains service-role execution. Existing owners retain their normal database-owner privileges. The transaction changes no secret values, IDs, tables, encryption, or payment settings.

Apply this reviewed migration individually to Forge when authorized. Do not push the entire pending migration directory: earlier live/source history mismatches remain unresolved. Then run `supabase/tests/integration-secret-acl.sql`; all five rows must show `false / false / true`. Re-run the backend integration flow with a synthetic credential in staging. Review available access logs and assess credential rotation separately; no exposure history has been inferred from grants alone.

If a backend caller fails after deployment, verify it uses the intended service-role client and admin authorization. Do not restore anonymous/authenticated grants as a rollback. The previous function signatures and four existing function bodies are preserved.

## Schema supplement

The dated capture in `supabase/schema-captures/2026-11-26/` records all 35 table definitions absent from the migration files: 368 columns, 88 constraints and 64 secondary indexes, plus RLS flags and existing table ACLs. No policies, user triggers, owned sequences or public enum/domain dependencies were found on these tables. The four external parent tables are `forge_agents`, `integration_connections`, `projects` and `workspaces`.

`missing-tables.sql` is generated from the JSON catalogue by `node scripts/render-schema-supplement.mjs`. CI checks for stale output. All tables and their primary/unique keys are created before foreign keys. The capture preserves existing table privileges and deny-by-default RLS; it is evidence of current state, not approval of every captured grant.

The supplement is outside `supabase/migrations/` deliberately. It is for reviewed disposable replay after the baseline, requires an explicit `forge.schema_replay=disposable` marker and refuses existing tables. The marker prevents casual execution; it does not independently prove database identity. It is not a complete schema dump or restore plan, does not contain seeds or object data, and must not be run on live Forge or the credentials vault.

## Verification and remaining gates

- Embedded PostgreSQL tests replay all 35 tables, compare columns/nullability and constraint/index presence, reject invalid FK/check data, and verify browser-role read/write denial on synthetic data while the server role can read it.
- Secret tests reproduce the vulnerable direct grants with fake Vault APIs, apply the migration, deny actual calls by both browser roles, retain backend CRUD/named lookup and verify repeat application removes reintroduced grants.
- PGlite 0.6.0 uses PostgreSQL 19; live Forge uses PostgreSQL 17.6. This tests the captured SQL and role boundaries in a real embedded engine, not exact-version parity, Supabase Vault encryption, PostgREST/JWT, storage, or full migration replay.
- The 72-table baseline plus the 35-table supplement now records all 107 live public table names. Existing-table column/function/policy drift, migration-history reconciliation, a complete Supabase rebuild, synthetic database/storage restoration and browser UAT remain open.
- No hosted/local Supabase staging environment has been provisioned. The previous hosting decision can be made after the security repair is reviewed.
