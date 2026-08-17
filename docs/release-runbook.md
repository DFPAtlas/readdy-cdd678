# Forge — Release Runbook

This document describes how to move a **known-good Forge build** into production and roll it back safely. It reflects the repository as inspected (FORGE-40). Where a step cannot currently be executed from this environment, it is marked **UNVERIFIED** rather than assumed.

> No secret values appear in this document. Refer to the Supabase Dashboard > Edge Functions > Secrets and your external secret manager for actual values.

---

## 1. Prerequisites

Before starting any release:

- [ ] FORGE-33 (core UAT): no unresolved Critical/High blockers.
- [ ] FORGE-35 (checkout): no critical payment-security issue.
- [ ] FORGE-36 (security): no unresolved Critical.
- [ ] FORGE-37 (RLS): no cross-tenant vulnerability.
- [ ] FORGE-38 (recovery): database backup/recovery risk is understood and accepted.
- [ ] A frozen release candidate identified by an exact Git commit SHA (or Readdy workspace version number).
- [ ] Supabase Dashboard access (Edge Function secrets, SQL editor, migrations).

**Release candidate rule:** a release must correspond to an exact source revision. A build without a commit identifier is not a frozen release candidate.

---

## 2. Build

```bash
npm install        # NOTE: no lockfile exists — see risk below
npm run type-check # tsc --noEmit
npm run build      # vite build → ./out
```

**Current state (FORGE-40):**

| Item | State |
|---|---|
| Package manager | npm (no lockfile present) |
| `npm ci` | **Unavailable** — no `package-lock.json` |
| Type check | `tsc --noEmit --project tsconfig.app.json` (separate script) |
| Production build | `vite build` (verified passing) |

**Reproducibility risk:** there is no lockfile (`package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`). Dependency versions are declared as ranges in `package.json` and are therefore **not pinned**. Two builds on different days can resolve different dependency versions. Before treating the build as reproducible, generate and commit a lockfile (`npm install` then commit `package-lock.json`).

---

## 3. Migration check

**Current state (FORGE-40): NO migration history exists.**

- There is no `supabase/migrations/` directory and no `.sql` files in the repository.
- The entire schema (67 tables, ~47 functions, 23 triggers, all RLS policies) exists only in the live database.
- The FORGE-36/37/38 fixes were applied via direct SQL and are **not** captured in source.

**Gate:** deployment database gate = **UNVERIFIED** until the schema is captured. Recommended first step (from FORGE-38):

```bash
supabase db dump --schema-only > supabase/migrations/0000_forge_schema.sql
```

Then commit it so a clean rebuild is possible. Until this exists, no migration can be reviewed, ordered, or rolled forward reproducibly.

**Before any production migration:**

1. Backup/recovery readiness (FORGE-38) is understood.
2. The migration is reviewed.
3. Destructive operations (column drops, type changes) are identified.
4. Expected application compatibility is understood.

---

## 4. Edge Function check

Forge uses these Edge Functions (all under `supabase/functions/`):

| Function | Purpose | Required secrets (names only) |
|---|---|---|
| `forge-ai` | AI gateway | `FORGE_OPENAI_API_KEY`, `FORGE_ANTHROPIC_API_KEY`, `FORGE_GOOGLE_API_KEY`, `FORGE_MISTRAL_API_KEY`, `FORGE_GROQ_API_KEY`, `FORGE_OPENROUTER_API_KEY`, `FORGE_HOSTED_API_KEY`, `FORGE_CUSTOM_API_KEY`, `FORGE_CUSTOM_BASE_URL`, `FORGE_VAULT_KEY`, `FORGE_OLLAMA_URL`, `FORGE_OLLAMA_TOKEN`, `FORGE_ALLOWED_ORIGINS` |
| `forge-billing` | Plan catalogue, usage, entitlements | `SUPABASE_*`, `STRIPE_RESTRICTED_KEY` |
| `forge-create-checkout` | Stripe Checkout + Portal | `SUPABASE_*`, `STRIPE_RESTRICTED_KEY`, `FORGE_APP_URL`, `FORGE_ENABLE_AUTOMATIC_TAX` |
| `forge-stripe-webhook` | Stripe webhook processing | `SUPABASE_*`, `STRIPE_RESTRICTED_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `forge-providers` | Provider test/config | `SUPABASE_*`, `FORGE_VAULT_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `FORGE_OLLAMA_URL` |
| `forge-publish` | Hosting/DNS publish | `SUPABASE_*`, `FORGE_HOSTING_PROVIDER`, `FORGE_HOSTING_API_TOKEN`, `FORGE_DNS_API_TOKEN`, `FORGE_ALLOWED_ENVIRONMENTS` |
| `forge-submit-form` | Form submission + email | `SUPABASE_*`, `RESEND_API_KEY`, `RESEND_FROM_DOMAIN`, `FORGE_FORM_HASH_SECRET`, `FORGE_WEBHOOK_ENCRYPTION_KEY`, `TURNSTILE_SECRET_KEY` |
| `forge-templates` | Template catalogue | `SUPABASE_*` |
| `forge-admin` | Admin dashboard data | `SUPABASE_*`, `STRIPE_RESTRICTED_KEY` |

All functions require the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Checklist:**

- [ ] Verify `verify_jwt` is enabled on user-facing functions (admin, billing, create-checkout, publish, providers, ai, templates).
- [ ] `forge-stripe-webhook` must be a **public** endpoint (webhook, no JWT) but must verify the Stripe signature. Confirm this before deploy.
- [ ] Confirm `FORGE_APP_URL` matches the production origin (used for CORS + return URLs).
- [ ] Confirm `FORGE_ALLOWED_ORIGINS` / `FORGE_ALLOWED_ENVIRONMENTS` list the production origin.

**Known issue (carried from FORGE-38):** `forge-submit-form` still falls back to `*-dev-only-rotate-me` literals when the real secrets are absent. These must be rotated to real values and made fail-closed before production.

---

## 5. Deployment

**Deployment target: UNVERIFIED.** No hosting configuration (`vercel.json`, `netlify.toml`, `wrangler.toml`, `fly.toml`, `render.yaml`, `Procfile`) and no CI/CD (`.github/workflows`) exist in this repository.

The application is a Vite React SPA; `vite build` emits to `./out`. The deployment mechanism (how `./out` reaches production) is not defined in source and must be confirmed with the hosting provider before this runbook can describe a concrete deploy step.

Edge Functions are deployed via the Supabase platform (Dashboard or CLI `supabase functions deploy`).

---

## 6. Smoke tests (post-deploy)

- [ ] `/` — homepage loads.
- [ ] `/login` — auth renders, no runtime errors.
- [ ] `/pricing` — plan catalogue renders (or honest "not configured" state).
- [ ] `/help` — help content loads.
- [ ] `/dashboard` — requires auth; redirects to login when unauthenticated.
- [ ] `/projects` — project list renders for an authenticated user.
- [ ] A safe test project overview opens.
- [ ] `/system/status` — health checks run; honest `unknown` states are acceptable.
- [ ] Checkout: verify the Stripe **publishable key** is configured (`VITE_STRIPE_PUBLISHABLE_KEY`) — do **not** make a real charge; confirm the session can be opened in Stripe **test** mode first.
- [ ] Admin routes (`/forge-admin`): authorised access only.

**Known config gap (FORGE-40):** the checkout page reads `VITE_STRIPE_PUBLISHABLE_KEY`, which is **not present** in `.env`. Checkout will show "Stripe's publishable key has not been configured" until it is set. This is a public client-safe key and must be added for the correct Stripe environment (test vs live).

---

## 7. Rollback

**Application:** redeploy/revert to a known-good commit (mechanism depends on the hosting provider — UNVERIFIED).

**Database:** restore from backup or forward-fix, per `docs/recovery-runbook.md`. No DOWN scripts exist; rollback relies on backup/forward-fix.

**Edge Functions:** redeploy the previous known-good function source.

**Stripe:** do **not** roll back payments by changing live products/prices casually. Payment state is reconciled via webhook; see `docs/recovery-runbook.md`.

**Configuration:** restore the previous verified environment/secret set through the platform's secret store.

> There is no one-click rollback. Rollback is a manual, stepwise process.

---

## 8. Post-release monitoring

- Watch the admin "Needs Attention" feed (export failures, build failures, service-health degradation).
- Watch Stripe webhook processing (`billing_events` `processing_status`, `safe_error`, `attempt_count`).
- Watch `service_health_checks` for `down` / `degraded` states.
- Refer to `docs/operations-runbook.md` for triage and escalation.

**Known gap (FORGE-39):** there is no external push alerting and no scheduled server-side monitor. A failure while nobody is looking is only visible on the next manual check.

---

## Release gates summary

| Gate | Status (FORGE-40) |
|---|---|
| Source-control freeze | UNVERIFIED (no `.git` in workspace) |
| Lockfile present | FAIL (none) |
| Production build | PASS |
| Migration history | FAIL (none) |
| Edge Function inventory | PASS |
| Hosting/deploy target | UNVERIFIED |
| Stripe environment | UNKNOWN (publishable key missing; restricted key unverified) |
| Rollback process | PARTIAL (manual only) |