# Forge — Deployment Runbook

> Deployment reference for the Forge application. Contains **no secret values**.
> Last reviewed: 2026-08-16 (FORGE-49 staging/deployment audit).

---

## 1. Deployment target

Forge is hosted on the **Readdy platform**. There is **no external hosting
configuration** in the repository — no `vercel.json`, `netlify.toml`,
`wrangler.toml`, `Dockerfile`, `docker-compose`, or GitHub Actions workflow. That is
intentional: Readdy provides the build, preview, and publish pipeline.

| Concern | Target |
|---|---|
| Application hosting | Readdy (Publish feature) |
| Database / Auth / Storage | SaaS Supabase (connected) |
| Server-side logic | Supabase Edge Functions |
| Payments | Stripe (TEST mode only for staging — **not yet connected**) |

**There is no dedicated staging/production environment split in Readdy.** The
platform's model is:

- **Preview / workspace** — the current version, rendered for in-workspace review.
- **Local staging** — download the project, run `npm install` + `npm run dev`.
- **Production** — the published custom domain via the Readdy Publish flow.

Treat the Readdy **preview as staging** and the **published custom domain as
production**. A preview is *not* a production deployment.

---

## 2. Release identity

The workspace does not expose Git metadata (no `.git`, no commit SHA, no branch).
Release identity is therefore **UNVERIFIED** from inside this environment. The
external Git repository (if any) is the source of truth for commit SHAs; do not
invent one. Use the Readdy **version number** as the workspace-level identifier.

---

## 3. Build

```bash
npm install        # NOTE: no lockfile is committed yet (see §4)
npm run type-check # tsc --noEmit --project tsconfig.app.json
npm run lint       # eslint src --ext ts,tsx --max-warnings 0
npm run build      # vite build -> ./out
```

- Build output directory: `./out` (per `vite.config.ts` `build.outDir`).
- Source maps are enabled (`build.sourcemap: true`) — review this for any
  secret-bearing assets before a public production publish (see §9).
- `vite build` currently passes.

### Reproducibility gate (from FORGE-46)

No lockfile (`package-lock.json`) is committed, so dependency resolution is not
pinned and `npm ci` cannot be run. Before treating a release as reproducible:

```bash
npm install --package-lock-only
git add package-lock.json
npm ci && npm run type-check && npm run lint && npm run build
```

Until the lockfile exists, **clean locked install = UNVERIFIED**.

---

## 4. Environment variables

Client-safe (`VITE_PUBLIC_*`) values live in the tracked `.env`. Never put a
secret in `VITE_*` — anything prefixed `VITE_` ships in the browser bundle.

| Name | Layer | Notes |
|---|---|---|
| `VITE_PUBLIC_SUPABASE_URL` | client | Supabase project URL (configured) |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase anon/publishable key (configured) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | client | **Missing** — needed for Stripe.js checkout (TEST key) |
| `STRIPE_SECRET_KEY` | Edge Function secret | Readdy Stripe integration stores this name (see §8) |
| `STRIPE_WEBHOOK_SECRET` | Edge Function secret | Webhook signature verification |
| `FORGE_APP_URL` | Edge Function secret | Trusted success/cancel return URL |

**Never** put the Supabase service-role key, Stripe secret key, webhook secret, or
AI provider keys in `VITE_*` or in committed source.

---

## 5. Supabase

- Provider: **SaaS Supabase** (not Readdy Backend).
- Staging currently shares the **same Supabase project** as development — there is
  no dedicated staging Supabase instance. This is a documented limitation; do not
  point an experimental build at valuable production data without an explicit
  decision.

### Auth redirect URLs

For login/signup/confirmation/password-recovery redirects to work on the real
deployed URL, add the deployed origin(s) to Supabase Dashboard → Authentication →
URL Configuration → Redirect URLs. Include the Readdy preview URL and the
published custom domain. Do **not** hardcode `localhost` as the only redirect, and
do not broaden allowed redirects to a wildcard.

---

## 6. Edge Functions

Deployed via the Supabase platform. Current functions:

| Function | Purpose | `verify_jwt` |
|---|---|---|
| `forge-ai` | AI gateway | enabled |
| `forge-billing` | plan catalogue / usage / entitlements | enabled |
| `forge-create-checkout` | Stripe Checkout + Portal | enabled |
| `forge-stripe-webhook` | Stripe webhook processing | **public** (Stripe signature verified) |
| `forge-providers` | provider test/config | enabled |
| `forge-publish` | hosting/DNS publish | enabled |
| `forge-submit-form` | form submission + email | enabled |
| `forge-templates` | template catalogue | enabled |
| `forge-admin` | admin dashboard data | enabled |
| `forge-analytics` | site analytics | enabled |

Checklist per function: `verify_jwt` correct, CORS/origin allowlist includes the
staging origin (never switch sensitive functions to wildcard `*`), and required
secrets present. No secret values are printed here.

---

## 7. Stripe (TEST only for staging)

Staging **must** use Stripe **test mode** — no live charge. Current state
(FORGE-48): **Stripe is not connected**, so `VITE_STRIPE_PUBLISHABLE_KEY` is
missing and no test checkout has been executed.

Before any staging checkout verification:

1. Connect Stripe in **test mode**.
2. Set `VITE_STRIPE_PUBLISHABLE_KEY` (test publishable key) in `.env`.
3. Reconcile the secret name: `forge-create-checkout` and
   `forge-stripe-webhook` read `STRIPE_RESTRICTED_KEY`, while the Readdy Stripe
   integration stores `STRIPE_SECRET_KEY`. Align these.
4. Set `STRIPE_WEBHOOK_SECRET` and `FORGE_APP_URL` (pointing at the staging URL).
5. Create test-mode prices for `starter` / `builder` / `pro` / `agency` (+
   `-yearly`) with matching `forge_plan_key` product metadata.

Do **not** deploy live payment configuration into staging just to make checkout
work. If only live Stripe is available, Stripe staging verification is **BLOCKED**.

---

## 8. SPA routing

Forge is a React Router SPA using `BrowserRouter` with basename `__BASE_PATH__`
and Vite `base = process.env.BASE_PATH || "/"`. Direct requests to routes like
`/login`, `/pricing`, or `/projects/:projectId/overview` must be rewritten to the
SPA entry point. Readdy handles this via the base-path mechanism; on a custom
domain `base` is `/`. After deploy, confirm a refresh on a nested route does not
return a 404. HTTPS is expected to be supplied by the platform — do not claim
transport security for local HTTP.

---

## 9. Secrets in build assets

Source maps are enabled. Before a public production publish, confirm the emitted
`./out` assets expose no secrets. Only public `VITE_PUBLIC_*` values should appear
in the bundle. Disable or strip source maps if they would leak sensitive source.

---

## 10. Smoke tests (post-deploy)

Public:

- `/` homepage loads
- `/login` renders, no runtime errors
- `/signup` renders
- `/pricing` renders (or honest "not configured" state)
- `/help` loads

Authenticated:

- `/dashboard` redirects to login when unauthenticated, loads when authenticated
- `/projects` renders for a logged-in user
- `/settings/profile`, `/settings/providers`, `/system/status` load

Project (one safe test project):

- overview, sandbox, files/assets, builds, versions, exports, settings open

Sandbox regression (from FORGE-45):

- the bottom Activity / Logs / Problems / Changes / Console bar stays at the
  bottom, beside (not under) the left sidebar, and behaves when the sidebar
  expands/collapses.

Auth:

- real Supabase login / refresh / logout / protected-route redirect (no demo auth).

Responsive: check 390px, 768px, and desktop on Homepage, Login, Dashboard,
Sandbox, Pricing.

---

## 11. Rollback

- **Application**: revert to a known-good Readdy version or redeploy the previous
  version; on a custom domain, republish the prior build.
- **Database**: restore from backup or forward-fix — see `docs/recovery-runbook.md`.
  No DOWN scripts exist.
- **Edge Functions**: redeploy the previous known-good function source.
- **Stripe**: do not roll back payments by mutating live products/prices; reconcile
  via webhook.
- **Configuration**: restore the previous verified secret/env set.

There is no one-click rollback; rollback is manual and stepwise.

---

*This runbook documents process only. It does not contain credentials, keys, or
secrets.*