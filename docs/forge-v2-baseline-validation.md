# Forge V2 baseline validation

Prepared 26 November 2026. This change is stacked on the project-identity repair in PR #11; neither change is a completed release gate.

## Changes

- Resolve the 133 application TypeScript diagnostics without changing compiler options or suppressing checks. Use explicit response discriminants and the actual service and catalogue types.
- Repair the theme scanner's control-style lookup, demo fixture initialization, overview activity timestamps and PromiseLike logging handlers.
- Send the AI request's abort signal through the pinned Functions SDK's custom fetch. Browser cancellation does not establish that server-side generation or billing stopped.
- Preserve completed deployments in the client status model, matching the edge function's existing rollback acceptance.
- Track an npm lockfile and add a GitHub Actions workflow for type checking, tests and production builds.

## Validation

- Application type check: passes, zero diagnostics (baseline: 133).
- Regression suite: 22 tests pass, including the existing 11 project-identity tests and 11 transport, scanner, timing, fixture and activity tests.
- Production build: passes. The existing large JavaScript bundle warning remains; splitting it is separate performance work.
- Lint: zero errors and 19 warnings. The pristine baseline has the same 19 warnings. The warning-as-error command still fails; no rules were disabled.
- Clean `npm ci` and checks against the resulting installation are recorded in the PR validation notes.

## Open acceptance work

- Run the workflow on GitHub against the pushed commit; adding the workflow is not evidence of a hosted CI pass.
- Establish an isolated Supabase test environment and compare the migration history.
- Rehearse database/storage restoration before schema or storage changes.
- Browser-test two projects and two accounts through edit, save, reload, preview, history and recovery, including failure and account-switch cases.
- Review the existing hook-dependency and Fast Refresh lint warnings before enabling the full lint gate.

No database migrations, live billing operations, merge or Forge application deployment are included.
