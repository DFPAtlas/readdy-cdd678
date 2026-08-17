# Forge — Operations Runbook

> Operational monitoring & alerting reference. Contains **no secret values, phone numbers, or credentials**.
> Last reviewed: FORGE-39 (monitoring & alerting readiness audit).

## 0. How Forge is monitored today

Forge observability is **pull-based**: an admin must open the Forge Admin console
(`/forge-admin`) or System Status (`/system/status`) to see health. There is **no
push/pager alerting** and **no server-side scheduled monitor** (see §10).

What is real and server-authorised:

| Source | Where | Type |
|---|---|---|
| Platform dashboard metrics | `forge-admin` `dashboard` action | AVAILABLE |
| "Needs Attention" feed | `forge-admin` `attention` action | AVAILABLE |
| Service health probe (DB + provider status) | `forge-admin` `health` action, persisted to `service_health_checks` | PARTIAL |
| Build history + failures | `forge-admin` `builds.list` | AVAILABLE |
| Stripe webhook processing records | `billing_events` table (`processing_status`, `safe_error`) | AVAILABLE |
| AI job / provider failure records | `ai_jobs`, `ai_agent_runs`, `ai_usage_events`, `ai_providers` | AVAILABLE |
| Admin audit trail | `admin_audit_events` | AVAILABLE |
| Incidents | `platform_incidents` + `incident_events` | AVAILABLE |
| Frontend runtime errors | `ErrorBoundary` → `console.error` only | PARTIAL (not persisted) |
| Storage health | no probe | NOT AVAILABLE |
| Backup completion | no probe | NOT AVAILABLE |
| External alerting (email/Slack/n8n) | none | NOT CONFIGURED |

> Nothing here fabricates uptime, latency, or "99.9%" figures. If a service is not
> independently verifiable it is shown as `unknown` / `not verified` — never green.

---

## 1. Service failure triage

1. Open `/forge-admin` → **Overview** → **Needs Attention** first. This feed already
   surfaces failed builds, failed deployments, provider degradation, webhook failures,
   form delivery failures, export failures, and recent health-check degradation.
2. Cross-check `/system/status` for live client-side checks (auth, provider registry).
3. Open the **Incidents** tab and create a record for anything not yet tracked. Use
   severity per §8.
4. If the failure is not visible in any of these surfaces, the observability gap itself
   must be logged (§9) — do not assume the platform "would have caught it".

## 2. Database incident

- Symptoms: `/forge-admin` health shows `database: down`, or dashboard metrics fail to load.
- The `health` action performs a real read (`profiles` count); a failure there is a genuine
  DB reachability signal.
- Recovery steps and restore procedure: see `docs/recovery-runbook.md` (§1, §5, §7).
- ⚠️ Do not run a destructive restore against live data without a verified backup.

## 3. AI provider outage

- Symptoms: `ai_providers` marked `degraded`/`down` in the Attention feed; `ai_jobs` in
  `failed` status with `safe_error` codes like `PROVIDER_UNAVAILABLE`, `NO_PROVIDER`.
- Provider status is stored in `ai_providers.status`. This is the "latest known status"
  surface — do **not** add aggressive per-second paid API pings. Re-check manually or on
  the next admin visit.
- Recovery: confirm provider credential still decrypts (recovery runbook §12), then
  re-enable the provider or adjust routing via Admin → AI & Deployments.

## 4. Build failures

- Symptoms: `builds.status = 'failed'` surfaced in the Attention feed and Builds tab.
- Inspect recent failed builds (`builds.list`) — each row carries `failure_code`,
  `error_count`, `warning_count`.
- Repeated failures (same project or same `failure_code`) indicate a systemic issue,
  not a one-off. No failure-rate chart is generated; use the raw counts.

## 5. Stripe webhook failures

- Source of truth: `billing_events` (`processing_status`, `safe_error`, `attempt_count`).
- Operationally important states:
  - `processing_status = 'failed'` → processing error (retriable via `billing.replay`).
  - `safe_error` values like `no_user_mapping`, `unknown_price`, `db_error` → triage target.
  - Repeated attempts (`attempt_count` climbing) → investigate, don't blindly re-replay.
- Signature failures are rejected before any DB write and are **not** persisted as rows —
  flag this as a visibility limitation (§9).
- Never expose `STRIPE_*` secrets or raw event payloads in logs or admin UI.

## 6. Storage issue

- Storage has **no independent health probe**. `forge-admin` `health` reports it as
  `unknown` / "No health probe configured" — treat as **not independently verified**.
- Export/asset symptoms may be the first observable sign of a storage problem. Reference
  recovery runbook §6 for the `forge-assets` bucket.

## 7. Auth incident

- Practical indicators available today:
  - `/system/status` auth check fails (`unavailable`) — real `getSession()` probe.
  - Login/bootstrap errors reported by users (not yet auto-captured — see §9).
- Recovery: recovery runbook §9. Never log or store passwords, JWTs, or Authorization
  headers in operational logs.

## 8. Severity & alert priorities

| Severity | Triggers |
|---|---|
| CRITICAL | auth unavailable, database unavailable, cross-tenant/security event, Stripe payment processing fundamentally broken, application unavailable |
| HIGH | AI provider unavailable, build system consistently failing, exports broken, webhook processing failing |
| MEDIUM | individual build/export failure, optional provider degraded |
| LOW | non-critical warning |

Do **not** alert on every minor event — CRITICAL/HIGH only should wake a human.

## 9. Escalation & alerting

- **No external operational alerting is configured.** The admin dashboard alone will not
  wake anyone during an outage.
- Alert delivery status: **UNVERIFIED**.
- Escalation placeholders (fill in when a channel exists):

| Role | Channel | Contact |
|---|---|---|
| Primary on-call | _to be configured_ | _placeholder_ |
| Secondary on-call | _to be configured_ | _placeholder_ |
| Security/billing escalation | _to be configured_ | _placeholder_ |

- Deduplication requirement: if alerting is later added, repeated identical notifications
  must be suppressed (cooldown / idempotent alert key). Document this before building.

## 10. Heartbeat / check frequency

- There is **no server-side scheduled monitor**. Health checks run only when an admin or
  user triggers them on-demand. A browser tab left open on `/system/status` is **not**
  continuous monitoring.
- Limitation: critical failures that occur while no one is looking are effectively
  invisible until someone opens a surface. This is the single biggest operational gap.

## 11. When to enter maintenance / freeze state

- Enter maintenance for a scope (`platform`, `ai`, `publishing`, `billing`, `forms`,
  `templates`) via Admin → **Settings** → maintenance controls.
- Freeze writes when a data-integrity issue is suspected (recovery runbook §2).
- Freeze **before** a destructive restore, not after.

## 12. Recovery runbook reference

- Full disaster-recovery procedure: `docs/recovery-runbook.md`.
- This operations runbook covers *detection and triage*; the recovery runbook covers
  *restoration and validation*.

## 13. Alert testing

- No safe test-alert function exists. **Alert delivery — UNVERIFIED.** Do not fabricate
  a test alert.

## 14. Error budget / SLA

- **No formal SLA configured.** No uptime commitments, latency targets, or error budgets
  are defined or claimed.

## 15. Log security & correlation

- Redact from operational logs: Authorization headers, cookies, JWTs, API keys, Stripe
  secrets, provider credentials, passwords. Preserve safe identifiers (build IDs, project
  IDs, event IDs) for diagnosis.
- The `forge-admin` backend already returns a `requestId` per response; the Stripe webhook
  keys off `stripe_event_id`. Surface these where useful — do not redesign logging just to
  add tracing.

---

*This runbook documents process only. It does not contain credentials, keys, or secrets.*