# Forge V2 isolated test environment

Read-only preflight completed 26 November 2026 against Forge project `cpjqmetlqzielplxmzzn`. This is preparation, not a staging deployment or browser sign-off.

## Confirmed state

- Forge is healthy and has no Supabase development branches.
- The separate project `dnbvybmulsppfjntbsxz` ("Test Batabase") contains the credentials vault. It is not an empty Forge test target.
- Live Forge has 107 public tables, all with RLS enabled. Source migrations define 72 public tables. The 35 missing table definitions are listed in [the metadata inventory](forge-v2-schema-inventory-2026-11-26.json).
- There are 11 source migration files and four remote history entries. The original two remote migrations have no matching source files. The October profile and model changes have different local/remote version timestamps. Do not repair history or replay the baseline on the live project based only on these names.
- Local Docker, PostgreSQL client and Supabase CLI are unavailable in this execution environment. No local Supabase stack has been started.

The metadata inventory contains table names, core columns/policies, function signatures and migration identifiers. It contains no customer rows or credentials and cannot restore a database. RLS enablement alone does not prove cross-account isolation.

Follow-up: the 35 missing table definitions are now captured in a separately reviewed schema supplement, and a critical integration-secret RPC permission repair is prepared. See [the reconciliation report](forge-v2-schema-reconciliation.md). Full Supabase reconstruction and live deployment of that permission repair are still outstanding.

## Start the test frontend

After choosing and provisioning an isolated Supabase target, copy `.env.forge-test.example` to `.env.forge-test.local` and set:

| Variable | Value |
| --- | --- |
| `FORGE_TEST_PROJECT_REF` | The isolated hosted project ref, or `local` |
| `VITE_PUBLIC_SUPABASE_URL` | Matching hosted HTTPS origin, or a loopback Supabase origin |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | That target's publishable/anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Empty for the initial journey; a test key only for later billing tests |

Run `npm run dev:forge-test` or `npm run build:forge-test`. Vite validates its effective environment before serving/building. Missing configuration, protected project refs, URL/ref mismatches, legacy anon-key ref mismatches, privileged keys and live Stripe publishable keys stop startup. The example's empty values override the tracked live `.env` values; the real local file is ignored by Git.

Modern publishable keys do not expose a project-ref claim; use the selected target's key and verify connectivity after provisioning. These startup checks do not certify the target's schema, Edge Function configuration or third-party side effects. Direct normal-mode commands retain their existing behavior.

## Provisioning and schema gate

1. Choose a dedicated hosted Forge branch or a local Supabase stack. A nonzero hosted cost needs approval before creation.
2. Capture the current complete schema, grants, functions, triggers and storage policies using a read-only export. Resolve the 35 missing definitions and column/policy/function drift before relying on migration replay.
3. Reconstruct and compare only in the disposable target; do not reset or repair the live database. Verify all required tables, policies and grants, not just table counts.
4. Use fresh target-specific credentials. Do not copy live Stripe, email, AI-provider, OAuth, encryption or webhook secrets. Disable external callbacks and scheduled jobs for the initial journey; no paid AI or payment calls are needed.
5. Create two synthetic accounts in separate workspaces with separate projects. Use test-only inboxes or a local mail sink. Verify signup/profile/workspace triggers rather than assuming the old migration reproduces them.
6. Back up synthetic database rows and a synthetic asset; rehearse restoration in another disposable target and check access after restoration. A schema rebuild is not a data/storage restore.

## Required journey evidence

| Case | Expected result |
| --- | --- |
| Owner A opens project A | Correct identity; actual saved content or a blank draft |
| Edit, save, reload, preview | All views show the same document; save failures remain visible |
| Switch projects while an operation is pending | No write, asset, history or recovery entry lands in the other project |
| Account B requests A's project by URL/API | No read or write; verify with B's authenticated session, not a service-role connection |
| Switch accounts in another tab | Prior account's content cannot become the new account's local recovery/history |
| Clear browser cache and reopen | Cloud save remains intact |
| Restore synthetic data and storage | Content and objects return, with cross-account access still denied |

Record the application commit, target ref, test identities, actual results and evidence. Unit tests for the startup guard are not evidence of live RLS behavior or completed browser UAT.
