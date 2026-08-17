# Forge — Disaster Recovery Runbook

> Operational readiness document. Contains **no secret values**.
> Last reviewed: 2026-08-16 (FORGE-50 recovery drill — see §0.1).

## 0.1 Recovery drill status (FORGE-50)

Each recovery path is marked **TESTED** / **PARTIALLY TESTED** / **UNVERIFIED**.
A result is UNVERIFIED when no safe disposable environment was available to
execute the drill, so no evidence could be produced — not because it failed.

| Recovery path | Status | Evidence |
|---|---|---|
| Frontend rollback | UNVERIFIED (BLOCKED) | No staging env; no deploy/rollback from workspace (FORGE-49) |
| Known-good Git revision | UNVERIFIED | No `.git` in workspace; no commit SHA |
| Edge Function rollback | PARTIAL | 9/10 functions in source; `forge-analytics` has **no source in repo** |
| Database backup | UNVERIFIED | No backup timestamp/ID confirmable from workspace |
| Database restore | UNVERIFIED (BLOCKED) | No disposable restore target; production untouched |
| Migration rebuild | PARTIAL | Baseline (339 CREATE stmts) + auth bridge exist; not executed on empty DB |
| RLS after restore | PARTIAL | Enabled on all 67 tables live; preserved in baseline; post-restore untested |
| Storage recovery | FAIL | 1 private bucket (`forge-assets`); no object backup identified |
| Auth recovery | PARTIAL | `handle_new_user` captured in migrations; `auth.users` is Supabase-managed |
| Stripe reconciliation | PARTIAL | `billing.replay` + webhook idempotency; no full re-sync-from-Stripe |

## 0. Scope & assumptions

Forge persistence consists of:

| Layer | System | Notes |
|---|---|---|
| Database | SaaS Supabase (PostgreSQL) | 67 tables, all RLS-enabled; 47 functions, 23 triggers |
| Object storage | Supabase Storage | Single private bucket `forge-assets` |
| Application source | Readdy workspace + external Git | Version history tracked; Git tag/release strategy UNVERIFIED |
| Config/secrets | Supabase Edge Function secrets + `.env` | Public config only in `.env`; secrets server-side |
| External system of record | Stripe | Payments/subscriptions; must be reconciled after restore |
| AI provider config | BYOK, AES-GCM encrypted in `workspace_ai_keys` | Encryption key is a server-side secret |

---

## 1. Incident assessment

1. Determine blast radius: database loss? storage loss? bad deploy? corrupt migration? config failure?
2. Record the incident start time and affected components.
3. Decide severity: full outage vs degraded vs data-integrity concern.
4. Do **not** rush a destructive restore without first preserving current state (see §4).

## 2. Freeze writes if required

- For data-corruption incidents, pause the write paths that mutate the affected tables (checkout, CMS, build/export, form ingestion) while the extent is assessed.
- For a pure read outage, skip this step.

## 3. Identify last known good state

1. Check Supabase Dashboard → Database → **Backups** for the most recent restore point.
2. Note the restore timestamp vs the incident start — quantify expected data loss.
3. If point-in-time recovery is enabled (plan-dependent), prefer the latest pre-incident point.

## 4. Backup current damaged state where useful

- Before restoring over the live database, take a snapshot of the current state if it may be forensically useful.
- Supabase Dashboard supports a manual backup / export (pg_dump) — use it to preserve the damaged state before overwriting.

## 5. Database restore procedure

> **Do not run a destructive restore against valuable production data without a verified backup.** This procedure must be re-validated in a safe (non-production) environment before first production use.

1. Confirm the chosen backup is complete and, ideally, has been tested before.
2. Restore via Supabase Dashboard → Database → Backups → Restore.
3. After restore, immediately verify (§12) — do not assume success.

> ✅ Resolved in FORGE-47: `supabase/migrations/` now exists and holds an
> idempotent schema baseline (`20260815000000_forge_schema_baseline.sql`) plus an
> auth bridge (`20260816000000_create_profiles_on_signup.sql`). The schema is
> **captured**, but a fresh empty-DB rebuild is still **UNVERIFIED** (see §0.1).

## 6. Storage recovery

- The `forge-assets` bucket is **private** and holds uploaded assets/exports.
- A database restore **does not** recover bucket objects — they are stored separately.
- Recovery depends on Supabase Storage's own backup/retention (bucket-level).
- **Verify object-level recovery** is part of the platform backup before relying on it. If not backed up, uploads are lost on storage failure.

## 7. Rebuild schema from scratch (migration recovery)

Schema is now captured in source (FORGE-47). To **prove** a clean rebuild:

1. Create a disposable local/throwaway Supabase project.
2. Apply `supabase/migrations/*.sql` **in filename order** against the empty DB.
3. Verify the 67 tables, functions, triggers, RLS policies, and the
   `forge-assets` bucket all exist, and RLS is enabled on every table.

> Migration rebuild (schema reconstruction) is distinct from **database backup
> restore** (data recovery). The baseline reconstructs schema only — it contains
> no data. Do not treat the two as equivalent.
>
> Status: baseline + auth bridge exist (PARTIAL); fresh rebuild UNVERIFIED.

## 8. Deploy known-good application version

1. Identify the last known-good application commit/tag.
2. Redeploy that version (revert commit or redeploy the tagged release — whichever the current deploy process supports).
3. Confirm the deployed version matches the restore point.

## 9. Validate authentication

- Log in with a test account.
- Confirm session bootstrap and protected routes work.
- Confirm admin sign-in and admin routes work.

## 10. Validate projects

- Spot-check that projects, members, and their role assignments are present and correct.
- Confirm a member can access their permitted project and **cannot** access another tenant's project (isolation intact).

## 11. Validate billing/subscription state

- Confirm `subscriptions`, `billing_customers`, and usage state reconcile.
- ⚠️ Stripe is the external system of record. A database restored from an older backup may hold **stale** subscription state. Reconcile by re-syncing from Stripe (webhook replay or subscription fetch) — do not trust the restored DB alone for billing truth.

## 12. Validate AI providers

- Confirm provider connections still decrypt successfully (the AES-GCM encryption key must be present in server secrets).
- ⚠️ If the encryption key secret was lost, encrypted BYOK keys are **unrecoverable** — flag immediately.

## 13. Validate exports/storage

- Confirm uploaded assets and generated exports are reachable (signed URLs resolve to real objects).
- Confirm `forge-assets` objects are present, not just referenced.

## 14. Reopen service

- Re-enable any frozen write paths.
- Announce recovery and set a post-incident review.

---

## Post-restore validation checklist

- [ ] Login works (regular + admin)
- [ ] Project records present
- [ ] Member access correct / cross-tenant isolation intact
- [ ] RLS active (verify with a non-owner query attempt)
- [ ] Files/assets accessible
- [ ] Latest versions available
- [ ] Subscriptions reconciled with Stripe
- [ ] Admin access works

## Open risks (tracked)

| Severity | Area | Action |
|---|---|---|
| Critical | No migration history — schema not reproducible from source | Capture & commit schema dump (§7) |
| High | AI encryption key is a single server secret | Back up/record key securely; consider `supabase_vault` |
| High | Secrets/config have no external secure record | Establish a secret-manager / runbook of key names + owners |
| Medium | Hard-delete only, no soft-delete/archive | Add recovery window or document deletion as irreversible |
| Medium | `forge-submit-form` has dev-only fallback secrets | Rotate to real values, fail-closed |

---

*This runbook documents process only. It does not contain credentials, keys, or secrets.*