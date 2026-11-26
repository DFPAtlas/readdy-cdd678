# Forge V2 rebuild tracker

Planning baseline: 26 November 2026. Mix-and-match is the preferred commercial model; fixed tiers remain optional bundles.

Scope: 16 milestone records, 73 pages or workspace views and 370 individual segments.

## Timeline assumptions

One primary engineer at 25–30 productive hours per week, with Martin reviewing weekly. Preparation starts now; the scheduled baseline starts 30 November 2026. There are 22 active working weeks, a planned break from 21 December to 3 January, and four weeks of contingency. Public holidays and delayed reviews consume that reserve. Re-estimate at F00 rather than treating these dates as a promise.

First usable internal builder: 12 February 2027. Content and guided AI target: 12 March. Full V2 release-candidate target: 14 May. Contingency window ends 11 June. Optional booking, automation service packs and dedicated backend products are later scope.

## Milestones

| ID | Milestone | Start | Target | Dependencies | Status |
|---|---|---|---|---|---|
| F00 | Baseline and safe test setup | 2026-11-30 | 2026-12-04 | None | In progress |
| F01 | Project identity and access | 2026-12-07 | 2026-12-11 | F00 | In progress |
| F02 | One real page document | 2026-12-14 | 2026-12-18 | F01 | Planned |
| F03 | Saving history and recovery | 2027-01-04 | 2027-01-08 | F02 | Planned |
| F04 | AI gateway and truthful status | 2027-01-11 | 2027-01-15 | F01, F03 | Planned |
| F05 | Calm workspace and direct editing | 2027-01-18 | 2027-01-29 | F03, F04 | Planned |
| F06 | Responsive preview and publishing | 2027-02-01 | 2027-02-12 | F05 | Planned |
| F07 | Sections assets and brand kit | 2027-02-15 | 2027-02-19 | F05, F06 | Planned |
| F08 | Dedicated Content view | 2027-02-22 | 2027-02-26 | F07 | Planned |
| F09 | Assisted prompts and Skills | 2027-03-01 | 2027-03-12 | F04, F08 | Planned |
| F10 | Contextual Ask Forge help | 2027-03-15 | 2027-03-19 | F09 | Planned |
| F11 | Effects preview library | 2027-03-22 | 2027-03-26 | F05, F10 | Planned |
| F12 | Visual Site Map | 2027-03-29 | 2027-04-02 | F02, F08 | Planned |
| F13 | Advanced code and feature access | 2027-04-05 | 2027-04-16 | F03, F06, F09 | Planned |
| F13B | Mix and match billing and Usage | 2027-04-19 | 2027-04-30 | F04, F06, F13 | Planned |
| F14 | Full UAT and release readiness | 2027-05-03 | 2027-05-14 | F00-F13B | Planned |

## Progress rules

Verified means a completed acceptance check with current evidence. In progress and in review do not count as complete. A working build alone does not sign off a milestone. Milestones close only after all required segments, security checks and end-to-end acceptance pass. Dates do not advance statuses automatically.

The first repair has 11 passing focused tests and a passing production build. The full TypeScript baseline still has 133 existing diagnostics. No migration, live payment, merge or production deployment has occurred. Browser UAT and tested database restoration remain outstanding.

## Detailed page and segment breakdown

### BASE Foundation and operations

Route or view: Repository and test environment. Milestone: F00.

- [x] **BASE-01 Code baseline and branch** — Verified. Acceptance: Record the starting commit and preserve an isolated repair branch. Evidence/notes: Repository baseline 303916be3b68090da3613cb3ddf699704d275f92; isolated branch codex/forge-project-foundations created 26 November 2026.
- [ ] **BASE-02 Dependency lock** — Planned. Acceptance: Create a real lockfile and prove a clean install.
- [ ] **BASE-03 TypeScript baseline** — Blocked. Acceptance: Resolve or explicitly track all 133 existing diagnostics before sign-off. Evidence/notes: 133 TypeScript diagnostics on pristine baseline and repair branch; none newly introduced. Full type-check is not passing.
- [ ] **BASE-04 Test environment** — Planned. Acceptance: Use synthetic accounts and separate test credentials with no live billing.
- [ ] **BASE-05 Schema baseline** — Planned. Acceptance: Compare migration history and test schema without destructive resets.
- [ ] **BASE-06 Backup and recovery** — Planned. Acceptance: Rehearse restoration before applying database or storage changes.
- [ ] **BASE-07 CI gates** — Planned. Acceptance: Run focused tests, type check and production build on the same commit.

### PUB01 Home

Route or view: /. Milestone: F05.

- [ ] **PUB01-01 Navigation** — Planned. Acceptance: Working links and clear sign-in and creation routes.
- [ ] **PUB01-02 Hero and calls to action** — Planned. Acceptance: Describe verified capabilities and lead to the correct flow.
- [ ] **PUB01-03 Product sections** — Planned. Acceptance: Match approved builder behaviour.
- [ ] **PUB01-04 Pricing teaser** — Planned. Acceptance: Use the same catalogue as subscriptions.
- [ ] **PUB01-05 FAQ and footer** — Planned. Acceptance: Accurate support, ownership and policy links.
- [ ] **PUB01-06 Mobile and keyboard** — Planned. Acceptance: No clipped headings or unreachable controls.

### PUB02 Subscriptions

Route or view: /pricing and /subscriptions. Milestone: F13B.

- [ ] **PUB02-01 Ready-made bundles** — Planned. Acceptance: Display plan price and actual allowances.
- [ ] **PUB02-02 Build your own entry** — Planned. Acceptance: Offer the approved modular route alongside bundles.
- [ ] **PUB02-03 Feature comparison** — Planned. Acceptance: Explain included and separately purchasable features.
- [ ] **PUB02-04 Billing interval** — Planned. Acceptance: Show annual total and effective monthly price correctly.
- [ ] **PUB02-05 Tax and limits** — Planned. Acceptance: Disclose tax presentation, pooled limits and exclusions.
- [ ] **PUB02-06 Best value comparison** — Planned. Acceptance: Recommend a cheaper equivalent bundle without hiding differences.

### PUB03 Checkout

Route or view: /checkout. Milestone: F13B.

- [ ] **PUB03-01 Order summary** — Planned. Acceptance: Match the selected versioned catalogue quote.
- [ ] **PUB03-02 Recurring and one-off amounts** — Planned. Acceptance: Distinguish add-ons from top-up packs.
- [ ] **PUB03-03 Customer and tax details** — Planned. Acceptance: Use confirmed billing treatment.
- [ ] **PUB03-04 Payment confirmation** — Planned. Acceptance: Use the correct Forge sandbox account.
- [ ] **PUB03-05 Idempotent fulfilment** — Planned. Acceptance: A repeated event cannot duplicate credits or access.
- [ ] **PUB03-06 Failed and cancelled payment** — Planned. Acceptance: Retain the chosen configuration and explain next steps.

### PUB04 Checkout completion

Route or view: /checkout/complete. Milestone: F13B.

- [ ] **PUB04-01 Payment state** — Planned. Acceptance: Do not claim success before authoritative confirmation.
- [ ] **PUB04-02 Entitlement state** — Planned. Acceptance: Show when purchased access is available.
- [ ] **PUB04-03 Receipt and account route** — Planned. Acceptance: Open the matching invoice and account.
- [ ] **PUB04-04 Return path** — Planned. Acceptance: Continue in the correct project.

### AUTH01 Sign in

Route or view: /login. Milestone: F01.

- [ ] **AUTH01-01 Credentials and session** — Planned. Acceptance: Accept valid sessions and show useful errors.
- [ ] **AUTH01-02 Return destination** — Planned. Acceptance: Restore a safe intended project route.
- [ ] **AUTH01-03 Expired session** — Planned. Acceptance: Recover without exposing another account's project.
- [ ] **AUTH01-04 Account switching** — Planned. Acceptance: Clear old project state and cached AI identity.

### AUTH02 Setup

Route or view: /setup. Milestone: F00.

- [ ] **AUTH02-01 Environment status** — Planned. Acceptance: Explain missing configuration truthfully.
- [ ] **AUTH02-02 Connection validation** — Planned. Acceptance: Validate only authorised configuration.
- [ ] **AUTH02-03 Safe defaults** — Planned. Acceptance: Never point test work at live billing silently.
- [ ] **AUTH02-04 Completion state** — Planned. Acceptance: Only advance after required checks pass.

### AUTH03 Onboarding

Route or view: /onboarding. Milestone: F05.

- [ ] **AUTH03-01 Welcome and business basics** — Planned. Acceptance: Capture relevant website goals.
- [ ] **AUTH03-02 Creation route** — Planned. Acceptance: Offer description or template.
- [ ] **AUTH03-03 Brand starting point** — Planned. Acceptance: Save chosen assets and style.
- [ ] **AUTH03-04 Resume and completion** — Planned. Acceptance: Return to the correct workspace and unfinished step.

### AUTH04 Email confirmation

Route or view: /confirm-email. Milestone: F01.

- [ ] **AUTH04-01 Token handling** — Planned. Acceptance: Validate the intended authentication flow.
- [ ] **AUTH04-02 Expired link** — Planned. Acceptance: Offer a working recovery path.
- [ ] **AUTH04-03 Destination** — Planned. Acceptance: Return to a safe authenticated route.

### AUTH05 Check email

Route or view: /check-email. Milestone: F01.

- [ ] **AUTH05-01 Instruction state** — Planned. Acceptance: Show the correct recipient context.
- [ ] **AUTH05-02 Resend action** — Planned. Acceptance: Handle cooldown and failure clearly.
- [ ] **AUTH05-03 Sign-in return** — Planned. Acceptance: Provide a useful next step.

### AUTH06 Password reset

Route or view: /reset-password. Milestone: F01.

- [ ] **AUTH06-01 Recovery token** — Planned. Acceptance: Use a valid recovery session.
- [ ] **AUTH06-02 New password** — Planned. Acceptance: Validate and submit securely.
- [ ] **AUTH06-03 Expired and used links** — Planned. Acceptance: Explain failure without leaking accounts.
- [ ] **AUTH06-04 Return to sign in** — Planned. Acceptance: Complete the session transition predictably.

### HELP Help

Route or view: /help. Milestone: F14.

- [ ] **HELP-01 Getting started** — Planned. Acceptance: Cover the actual builder workflow.
- [ ] **HELP-02 Usage and billing help** — Planned. Acceptance: Explain caps, credit charges and top-ups.
- [ ] **HELP-03 Editing and publishing help** — Planned. Acceptance: Explain save versus live versions.
- [ ] **HELP-04 Support route** — Planned. Acceptance: Provide the real support path.
- [ ] **HELP-05 Accessible search and navigation** — Planned. Acceptance: Find content with keyboard and mobile layouts.

### DASH My websites dashboard

Route or view: /dashboard. Milestone: F05.

- [ ] **DASH-01 Website cards** — Planned. Acceptance: Use real project names, thumbnails and draft or live state.
- [ ] **DASH-02 Continue editing** — Planned. Acceptance: Open the selected project ID.
- [ ] **DASH-03 Create first website** — Planned. Acceptance: Useful empty state with description or template.
- [ ] **DASH-04 Search and sort** — Planned. Acceptance: Filter actual project data.
- [ ] **DASH-05 Workspace identity** — Planned. Acceptance: Show the active account and workspace.
- [ ] **DASH-06 Service warnings** — Planned. Acceptance: Explain unavailable data without inventing totals.

### PROJECTS Website list

Route or view: /projects. Milestone: F05.

- [ ] **PROJECTS-01 Gallery and list views** — Planned. Acceptance: Show the same project records.
- [ ] **PROJECTS-02 Search and filters** — Planned. Acceptance: Maintain predictable results.
- [ ] **PROJECTS-03 Create action** — Planned. Acceptance: Open the website creation flow.
- [ ] **PROJECTS-04 Status and counts** — Planned. Acceptance: Derive page counts from real documents.
- [ ] **PROJECTS-05 Open project** — Planned. Acceptance: Preserve selected project identity.

### NEW Create website

Route or view: /projects/new. Milestone: F05.

- [ ] **NEW-01 Name and purpose** — Planned. Acceptance: Create a named project in the intended workspace.
- [ ] **NEW-02 Describe website** — Planned. Acceptance: Capture the initial brief.
- [ ] **NEW-03 Template choice** — Planned. Acceptance: Preview before applying.
- [ ] **NEW-04 Initial document** — Planned. Acceptance: Create a real draft page rather than a sample overlay.
- [ ] **NEW-05 Failure recovery** — Planned. Acceptance: Avoid duplicate projects after retries.
- [ ] **NEW-06 Editor destination** — Planned. Acceptance: Open the ID returned by creation.

### TEMPLATES Template gallery

Route or view: /templates. Milestone: F07.

- [ ] **TEMPLATES-01 Categories and search** — Planned. Acceptance: Filter available templates.
- [ ] **TEMPLATES-02 Live preview** — Planned. Acceptance: Show the template before installation.
- [ ] **TEMPLATES-03 Brand and placeholder setup** — Planned. Acceptance: Collect required replacements.
- [ ] **TEMPLATES-04 Install and merge** — Planned. Acceptance: Scope changes to the chosen project.
- [ ] **TEMPLATES-05 Version checkpoint** — Planned. Acceptance: Allow undo or restoration after installation.

### AGENTS Advanced AI tools

Route or view: /agents. Milestone: F09.

- [ ] **AGENTS-01 Capability list** — Planned. Acceptance: Explain each supported task.
- [ ] **AGENTS-02 Provider availability** — Planned. Acceptance: Show real usable capabilities.
- [ ] **AGENTS-03 Scoped configuration** — Planned. Acceptance: Respect workspace and project access.
- [ ] **AGENTS-04 Execution review** — Planned. Acceptance: Show task plan, cost and approval before mutations.
- [ ] **AGENTS-05 Activity** — Planned. Acceptance: Link to actual job results.

### CREDITS Credits and top-ups

Route or view: /credits. Milestone: F13B.

- [ ] **CREDITS-01 Included balance** — Planned. Acceptance: Separate monthly included and purchased credits.
- [ ] **CREDITS-02 Pack selection** — Planned. Acceptance: Show proposed price and validity before purchase.
- [ ] **CREDITS-03 Usage ledger** — Planned. Acceptance: Explain model-weighted charges and refunds.
- [ ] **CREDITS-04 Payment return** — Planned. Acceptance: Reflect confirmed top-up fulfilment.
- [ ] **CREDITS-05 Spend settings** — Planned. Acceptance: Link daily and monthly cash controls.
- [ ] **CREDITS-06 Empty and failed states** — Planned. Acceptance: Never interpret missing records as zero provider spend.

### ACTIVITY Workspace activity

Route or view: /activity. Milestone: F03.

- [ ] **ACTIVITY-01 Event feed** — Planned. Acceptance: Show real actions with actor and project.
- [ ] **ACTIVITY-02 Filters** — Planned. Acceptance: Filter by project and action.
- [ ] **ACTIVITY-03 Revision links** — Planned. Acceptance: Open the matching page or version.
- [ ] **ACTIVITY-04 Error state** — Planned. Acceptance: Distinguish no events from failed retrieval.
- [ ] **ACTIVITY-05 Access** — Planned. Acceptance: Prevent cross-workspace event exposure.

### PROF Account profile

Route or view: /settings/profile. Milestone: F01.

- [ ] **PROF-01 Profile fields** — Planned. Acceptance: Persist validated account details.
- [ ] **PROF-02 Session identity** — Planned. Acceptance: Show the signed-in user accurately.
- [ ] **PROF-03 Account actions** — Planned. Acceptance: Handle session exit without stale data.
- [ ] **PROF-04 Access checks** — Planned. Acceptance: Only update authorised profile records.

### APPEAR Appearance

Route or view: /settings/appearance. Milestone: F05.

- [ ] **APPEAR-01 Editor theme** — Planned. Acceptance: Persist light and dark preference.
- [ ] **APPEAR-02 Layout preference** — Planned. Acceptance: Keep the approved default available.
- [ ] **APPEAR-03 Responsive controls** — Planned. Acceptance: Remain readable on smaller devices.
- [ ] **APPEAR-04 Website separation** — Planned. Acceptance: Changing editor theme does not rewrite site branding.

### PROVIDERS AI providers

Route or view: /settings/providers. Milestone: F04.

- [ ] **PROVIDERS-01 Provider status** — Planned. Acceptance: Distinguish configured, reachable and failed.
- [ ] **PROVIDERS-02 Credential entry** — Planned. Acceptance: Store secrets only through the intended server path.
- [ ] **PROVIDERS-03 Masked display** — Planned. Acceptance: Never return raw secrets to the UI.
- [ ] **PROVIDERS-04 Connection test** — Planned. Acceptance: Explain test results without claiming AI readiness prematurely.
- [ ] **PROVIDERS-05 Usage association** — Planned. Acceptance: Attribute calls to the correct account.

### BILL Account subscription

Route or view: /settings/billing. Milestone: F13B.

- [ ] **BILL-01 Current configuration** — Planned. Acceptance: Show base, features and capacity.
- [ ] **BILL-02 Add or remove features** — Planned. Acceptance: Explain effective date and proration.
- [ ] **BILL-03 Bundle comparison** — Planned. Acceptance: Offer an equivalent cheaper plan.
- [ ] **BILL-04 Invoices and renewal** — Planned. Acceptance: Show authoritative billing dates and totals.
- [ ] **BILL-05 Cancellation and downgrade** — Planned. Acceptance: Preserve custom output and disclose reduced access.
- [ ] **BILL-06 Payment failure** — Planned. Acceptance: Explain account state and recovery.

### SYSTEMSET System settings

Route or view: /settings/system. Milestone: F00.

- [ ] **SYSTEMSET-01 Environment identity** — Planned. Acceptance: Clearly identify test versus production.
- [ ] **SYSTEMSET-02 Configuration health** — Planned. Acceptance: Report missing dependencies accurately.
- [ ] **SYSTEMSET-03 Diagnostics** — Planned. Acceptance: Provide bounded useful information without secrets.
- [ ] **SYSTEMSET-04 Recovery links** — Planned. Acceptance: Link the actual support and recovery runbooks.

### STATUS System status

Route or view: /system/status. Milestone: F04.

- [ ] **STATUS-01 Auth status** — Planned. Acceptance: Report verified connection state.
- [ ] **STATUS-02 Database status** — Planned. Acceptance: Report errors distinctly from empty data.
- [ ] **STATUS-03 AI gateway status** — Planned. Acceptance: Never show ready while unreachable.
- [ ] **STATUS-04 Storage status** — Planned. Acceptance: Do not invent capacity or zero usage.
- [ ] **STATUS-05 Refresh and timestamps** — Planned. Acceptance: Show when each check was measured.

### PREDIRECT Project entry

Route or view: /projects/:projectId. Milestone: F01.

- [ ] **PREDIRECT-01 ID resolution** — Planned. Acceptance: Use the requested ID without a default slug.
- [ ] **PREDIRECT-02 Access denial** — Planned. Acceptance: Fail closed for missing or unauthorised projects.
- [ ] **PREDIRECT-03 Destination** — Planned. Acceptance: Open the correct overview or editor.

### OVERVIEW Project overview

Route or view: /projects/:projectId/overview. Milestone: F01.

- [ ] **OVERVIEW-01 Project identity** — Planned. Acceptance: Match URL, title and settings.
- [ ] **OVERVIEW-02 Document summary** — Planned. Acceptance: Read page counts from the real blueprint.
- [ ] **OVERVIEW-03 Recent work** — Planned. Acceptance: Show current build, revision and AI activity.
- [ ] **OVERVIEW-04 Navigation** — Planned. Acceptance: Retain project ID across modules.
- [ ] **OVERVIEW-05 Missing and denied states** — Planned. Acceptance: Never substitute another project.

### CANVAS Builder canvas

Route or view: /projects/:projectId/sandbox. Milestone: F02.

- [ ] **CANVAS-01 Project bootstrap** — In progress. Acceptance: Load the requested accessible project before editing. Evidence/notes: Requested-project lookup implemented locally; 11 focused tests pass. Browser UAT and review still pending.
- [ ] **CANVAS-02 Real document rendering** — In progress. Acceptance: Remove hard-coded sample hero and feature cards. Evidence/notes: Hard-coded sample hero and feature cards removed locally; production build passes. Preview/browser verification pending.
- [ ] **CANVAS-03 Pages and Layers agreement** — Planned. Acceptance: Use the active page elements for all views.
- [ ] **CANVAS-04 Empty project** — In progress. Acceptance: Start with an actual draft Home page.
- [ ] **CANVAS-05 Selection and inspector** — Planned. Acceptance: Identify the correct element without changing data.
- [ ] **CANVAS-06 Preview agreement** — Planned. Acceptance: Render the current saved or explicitly labelled draft revision.

### EDIT Direct editing tools

Route or view: Builder selection toolbar. Milestone: F05.

- [ ] **EDIT-01 Inline text** — Planned. Acceptance: Edit selected copy directly.
- [ ] **EDIT-02 Element movement** — Planned. Acceptance: Move only within valid containers.
- [ ] **EDIT-03 Section reorder** — Planned. Acceptance: Show the intended insertion position.
- [ ] **EDIT-04 Alignment and spacing** — Planned. Acceptance: Apply controlled values to selection.
- [ ] **EDIT-05 Keyboard movement** — Planned. Acceptance: Support accessible focus and nudging.
- [ ] **EDIT-06 Undo** — Planned. Acceptance: Reverse the whole completed action.

### SAVE Save and history controls

Route or view: Builder top bar and recovery prompts. Milestone: F03.

- [ ] **SAVE-01 Save state** — In progress. Acceptance: Only show cloud saved after a returned update. Evidence/notes: Cloud update now requires returned project ID; failed and zero-row saves are covered by tests.
- [ ] **SAVE-02 Scoped local copy** — In progress. Acceptance: Separate account and project documents. Evidence/notes: Document cache scoped by user + project; shared legacy cache left untouched for explicit recovery.
- [ ] **SAVE-03 Undo and Redo** — Planned. Acceptance: Track the active page consistently.
- [ ] **SAVE-04 Autosave and crash recovery** — Planned. Acceptance: Recover the correct project's unsaved work.
- [ ] **SAVE-05 Concurrent saves** — Planned. Acceptance: Detect conflicts without silently replacing newer work.
- [ ] **SAVE-06 Failed save** — Planned. Acceptance: Keep usable work and clearly explain retry.

### CMS CMS collections

Route or view: /projects/:projectId/cms. Milestone: F08.

- [ ] **CMS-01 Collection definitions** — Planned. Acceptance: Preserve existing field types and validation.
- [ ] **CMS-02 Content records** — Planned. Acceptance: Create and edit records in the current project.
- [ ] **CMS-03 Bindings** — Planned. Acceptance: Show which page content uses each record.
- [ ] **CMS-04 Permissions** — Planned. Acceptance: Apply role and tenant boundaries.
- [ ] **CMS-05 Draft and publication** — Planned. Acceptance: Keep unpublished content separate from live output.

### MEMBERS Project members

Route or view: /projects/:projectId/members. Milestone: F01.

- [ ] **MEMBERS-01 Role list** — Planned. Acceptance: Show actual owner, editor and viewer access.
- [ ] **MEMBERS-02 Invitations** — Planned. Acceptance: Use scoped pending and accepted states.
- [ ] **MEMBERS-03 Permission changes** — Planned. Acceptance: Prevent unauthorised role escalation.
- [ ] **MEMBERS-04 Removal** — Planned. Acceptance: Revoke access to the intended project.
- [ ] **MEMBERS-05 Owner safeguards** — Planned. Acceptance: Prevent accidental loss of the final owner.

### WORKFLOWS Existing project workflows

Route or view: /projects/:projectId/workflows. Milestone: F09.

- [ ] **WORKFLOWS-01 Workflow list** — Planned. Acceptance: Show real project definitions.
- [ ] **WORKFLOWS-02 Editor** — Planned. Acceptance: Preserve valid existing configuration.
- [ ] **WORKFLOWS-03 Inputs and outputs** — Planned. Acceptance: Validate supported nodes and connections.
- [ ] **WORKFLOWS-04 Run visibility** — Planned. Acceptance: Show actual execution and failure states.
- [ ] **WORKFLOWS-05 Budgets** — Planned. Acceptance: Bound retries and paid calls before execution.

### FILES Project files

Route or view: /projects/:projectId/files. Milestone: F07.

- [ ] **FILES-01 File tree** — Planned. Acceptance: Show the correct project's files.
- [ ] **FILES-02 File preview** — Planned. Acceptance: Safely inspect supported file types.
- [ ] **FILES-03 Upload and rename** — Planned. Acceptance: Validate names and permissions.
- [ ] **FILES-04 Code entitlement** — Planned. Acceptance: Require the paid feature for edits rather than reads.
- [ ] **FILES-05 Errors and recovery** — Planned. Acceptance: Preserve files after failed operations.

### ASSETS Asset manager

Route or view: /projects/:projectId/assets. Milestone: F07.

- [ ] **ASSETS-01 Upload queue** — Planned. Acceptance: Validate type, size and completion.
- [ ] **ASSETS-02 Gallery and metadata** — Planned. Acceptance: Show name, alt text and real storage status.
- [ ] **ASSETS-03 Image fitting** — Planned. Acceptance: Apply crop, fit and focal values predictably.
- [ ] **ASSETS-04 Usage references** — Planned. Acceptance: Identify every affected page or component.
- [ ] **ASSETS-05 Replace and delete** — Planned. Acceptance: Explain effects and preserve recoverability.
- [ ] **ASSETS-06 Storage isolation** — In progress. Acceptance: Scope metadata and blobs by account and project.

### BUILDS Build history

Route or view: /projects/:projectId/builds. Milestone: F06.

- [ ] **BUILDS-01 Build list** — Planned. Acceptance: Show actual jobs and statuses.
- [ ] **BUILDS-02 Revision identity** — Planned. Acceptance: Link each artifact to its source revision.
- [ ] **BUILDS-03 Logs** — Planned. Acceptance: Show bounded errors without secrets.
- [ ] **BUILDS-04 Cancel and retry** — Planned. Acceptance: Avoid duplicate or unbounded work.
- [ ] **BUILDS-05 Isolation** — Planned. Acceptance: Do not run customer code in the Forge control service.

### VERSIONS Version history

Route or view: /projects/:projectId/versions. Milestone: F03.

- [ ] **VERSIONS-01 Revision list** — Planned. Acceptance: Merge only the current project's local and cloud versions.
- [ ] **VERSIONS-02 Comparison** — Planned. Acceptance: Show meaningful page and content differences.
- [ ] **VERSIONS-03 Checkpoints** — Planned. Acceptance: Create named recovery points.
- [ ] **VERSIONS-04 Restore** — Planned. Acceptance: Restore the intended revision with a recovery point.
- [ ] **VERSIONS-05 Local history** — Planned. Acceptance: Never mix accounts or projects.

### EXPORTS Project export

Route or view: /projects/:projectId/exports. Milestone: F06.

- [ ] **EXPORTS-01 Format choice** — Planned. Acceptance: Explain supported portable output.
- [ ] **EXPORTS-02 Package generation** — Planned. Acceptance: Build from an identified revision.
- [ ] **EXPORTS-03 Asset inclusion** — Planned. Acceptance: Include authorised referenced assets.
- [ ] **EXPORTS-04 Secrets check** — Planned. Acceptance: Exclude service keys and private credentials.
- [ ] **EXPORTS-05 Download and retry** — Planned. Acceptance: Provide a usable archive and clear failures.

### PSET Project settings

Route or view: /projects/:projectId/settings. Milestone: F01.

- [ ] **PSET-01 Project name and identity** — Planned. Acceptance: Match the current route everywhere.
- [ ] **PSET-02 Workspace and environment** — Planned. Acceptance: Show the intended owner and test or live state.
- [ ] **PSET-03 Domain settings** — Planned. Acceptance: Verify ownership before routing.
- [ ] **PSET-04 Access and destructive actions** — Planned. Acceptance: Apply server permissions and explicit intent.
- [ ] **PSET-05 Save and errors** — Planned. Acceptance: Confirm only successful changes.

### CONTENT Content view

Route or view: Proposed project Content view. Milestone: F08.

- [ ] **CONTENT-01 Page selection** — Planned. Acceptance: Scope drafts to the chosen page.
- [ ] **CONTENT-02 Headings and copy** — Planned. Acceptance: Build editable text sections.
- [ ] **CONTENT-03 Images and alt text** — Planned. Acceptance: Choose assets and accessible descriptions.
- [ ] **CONTENT-04 FAQs and calls to action** — Planned. Acceptance: Create structured reusable content.
- [ ] **CONTENT-05 AI assistance** — Planned. Acceptance: Show cost and proposed changes before application.
- [ ] **CONTENT-06 Review and reuse** — Planned. Acceptance: Apply accepted content without overwriting unrelated edits.

### MAP Site Map

Route or view: Proposed project Site Map view. Milestone: F12.

- [ ] **MAP-01 Page nodes** — Planned. Acceptance: Reflect actual pages and status.
- [ ] **MAP-02 Internal link edges** — Planned. Acceptance: Use stored links rather than inferred decoration.
- [ ] **MAP-03 Open page** — Planned. Acceptance: Navigate to the correct selected node.
- [ ] **MAP-04 Broken links** — Planned. Acceptance: Identify missing destinations accurately.
- [ ] **MAP-05 Isolated pages** — Planned. Acceptance: Show missing incoming links with context.
- [ ] **MAP-06 Visitor journey** — Planned. Acceptance: Highlight a chosen route without changing links.

### CODE Advanced code editor

Route or view: Proposed Advanced view. Milestone: F13.

- [ ] **CODE-01 Selected source** — Planned. Acceptance: Open the relevant component or styles.
- [ ] **CODE-02 Editing and validation** — Planned. Acceptance: Show syntax and build errors clearly.
- [ ] **CODE-03 Live preview** — Planned. Acceptance: Identify which draft is being rendered.
- [ ] **CODE-04 Code and visual sync** — Planned. Acceptance: Preserve unsupported custom components.
- [ ] **CODE-05 Manual-edit protection** — Planned. Acceptance: AI must show a diff before replacing manual work.
- [ ] **CODE-06 Rollback and downgrade** — Planned. Acceptance: Restore versions and preserve read-only custom output.

### USAGE Account Usage

Route or view: Proposed Account Usage view. Milestone: F13B.

- [ ] **USAGE-01 Today's use** — Planned. Acceptance: Show credits consumed and reserved.
- [ ] **USAGE-02 Monthly balances** — Planned. Acceptance: Separate included, purchased and expired credits.
- [ ] **USAGE-03 Daily cap** — Planned. Acceptance: Owner can set or explicitly override within remaining balance.
- [ ] **USAGE-04 Thresholds** — Planned. Acceptance: Warn at 80 percent and pause AI at 100 percent.
- [ ] **USAGE-05 Per-job estimate** — Planned. Acceptance: Reserve the displayed maximum atomically.
- [ ] **USAGE-06 Auto top-up** — Planned. Acceptance: Default off, with explicit amount and cash ceiling.
- [ ] **USAGE-07 Timezone and reset** — Planned. Acceptance: Show the next reset and prevent reset abuse.
- [ ] **USAGE-08 Site continuity** — Planned. Acceptance: Limits do not stop manual editing or published sites.

### CUSTOM Build your own plan

Route or view: Proposed subscription configurator. Milestone: F13B.

- [ ] **CUSTOM-01 Base subscription** — Planned. Acceptance: Include saving, security, Undo and recovery.
- [ ] **CUSTOM-02 Feature selection** — Planned. Acceptance: Offer supported separately purchasable premium capabilities.
- [ ] **CUSTOM-03 Capacity selection** — Planned. Acceptance: Show websites, storage, editors and recurring AI allowance.
- [ ] **CUSTOM-04 Live quote** — Planned. Acceptance: Update total, tax display and dependencies together.
- [ ] **CUSTOM-05 Bundle comparison** — Planned. Acceptance: Compare equivalent entitlements and limits.
- [ ] **CUSTOM-06 Checkout agreement** — Planned. Acceptance: Quote, invoice and server permissions must match.
- [ ] **CUSTOM-07 Renewal and cancellation** — Planned. Acceptance: Explain proration and downgrade behaviour.

### PROMPT Assisted prompt builder

Route or view: Builder Ask Forge panel. Milestone: F09.

- [ ] **PROMPT-01 Quick starts** — Planned. Acceptance: Build a business site or improve selected content.
- [ ] **PROMPT-02 Guided questions** — Planned. Acceptance: Ask only relevant business, audience and outcome questions.
- [ ] **PROMPT-03 Editable instruction** — Planned. Acceptance: Show the assembled prompt before execution.
- [ ] **PROMPT-04 Review plan** — Planned. Acceptance: Explain the affected pages and sections.
- [ ] **PROMPT-05 Accept or reject** — Planned. Acceptance: Keep changes scoped and reversible.

### SKILLS Skills library

Route or view: Inside assisted prompt builder. Milestone: F09.

- [ ] **SKILLS-01 Brand voice** — Planned. Acceptance: Use saved tone and brand constraints.
- [ ] **SKILLS-02 Page structure** — Planned. Acceptance: Offer an understandable site or page outline.
- [ ] **SKILLS-03 Copy polish** — Planned. Acceptance: Show suggested copy changes for review.
- [ ] **SKILLS-04 SEO** — Planned. Acceptance: Prepare specific metadata and structure suggestions.
- [ ] **SKILLS-05 Accessibility** — Planned. Acceptance: Show actionable findings with verification limits.
- [ ] **SKILLS-06 Custom presets** — Planned. Acceptance: Reuse workspace instructions without leaking other projects.

### ASK Ask about this

Route or view: Selected-element contextual action. Milestone: F10.

- [ ] **ASK-01 Element identity** — Planned. Acceptance: Explain whether selection is a card, widget or effect.
- [ ] **ASK-02 Plain-language explanation** — Planned. Acceptance: Describe its purpose and trigger.
- [ ] **ASK-03 Suggested actions** — Planned. Acceptance: Offer relevant edit, move and style options.
- [ ] **ASK-04 Reviewable mutation** — Planned. Acceptance: Explanation alone never alters the page.
- [ ] **ASK-05 Context scope** — Planned. Acceptance: Pass only authorised selected-page information.

### EFFECTS Effects panel

Route or view: Design Effects view. Milestone: F11.

- [ ] **EFFECTS-01 Animated cards** — Planned. Acceptance: Demonstrate fade, slide, hover, scroll and parallax presets.
- [ ] **EFFECTS-02 Try on selection** — Planned. Acceptance: Preview without committing the effect.
- [ ] **EFFECTS-03 Replay** — Planned. Acceptance: Replay scroll effects without reloading the whole site.
- [ ] **EFFECTS-04 Controls** — Planned. Acceptance: Adjust bounded speed, delay and intensity.
- [ ] **EFFECTS-05 Reduced motion** — Planned. Acceptance: Respect user preference in preview and export.
- [ ] **EFFECTS-06 Remove and conflicts** — Planned. Acceptance: Offer No effect and block incompatible combinations.

### BRAND Brand and section library

Route or view: Design and Add section views. Milestone: F07.

- [ ] **BRAND-01 Brand tokens** — Planned. Acceptance: Share colours, fonts, logos and button styles.
- [ ] **BRAND-02 Section previews** — Planned. Acceptance: Preview headers, galleries, pricing and contact blocks.
- [ ] **BRAND-03 Insertion** — Planned. Acceptance: Place a section at the indicated target.
- [ ] **BRAND-04 Reuse** — Planned. Acceptance: Manage components and variants predictably.
- [ ] **BRAND-05 Global changes** — Planned. Acceptance: Explain affected pages and preserve rollback.

### PUBLISH Publish checks and domains

Route or view: Builder Publish flow. Milestone: F06.

- [ ] **PUBLISH-01 Preflight** — Planned. Acceptance: Check mobile, links, assets and basic SEO or accessibility.
- [ ] **PUBLISH-02 Unknown findings** — Planned. Acceptance: Distinguish verified passes from checks not run.
- [ ] **PUBLISH-03 Saved revision** — Planned. Acceptance: Publish an identified immutable build.
- [ ] **PUBLISH-04 Domain verification** — Planned. Acceptance: Verify ownership and HTTPS before live routing.
- [ ] **PUBLISH-05 Preview isolation** — Planned. Acceptance: Keep editor sessions and credentials off customer origins.
- [ ] **PUBLISH-06 Rollback** — Planned. Acceptance: Switch to an identified prior revision.
- [ ] **PUBLISH-07 Hosting benchmark** — Planned. Acceptance: Compare Cloudflare and AWS using equivalent workloads and staff time.

### ADMINLOGIN Admin sign in

Route or view: /forge-admin/login. Milestone: F01.

- [ ] **ADMINLOGIN-01 Admin session** — Planned. Acceptance: Use the intended admin authentication flow.
- [ ] **ADMINLOGIN-02 Authority check** — Planned. Acceptance: Require server-verified platform privileges.
- [ ] **ADMINLOGIN-03 Failure and expiry** — Planned. Acceptance: Fail closed and clear stale access.
- [ ] **ADMINLOGIN-04 Return route** — Planned. Acceptance: Open the requested authorised admin page.

### ADMINHOME Admin overview

Route or view: /forge-admin. Milestone: F14.

- [ ] **ADMINHOME-01 Customer metrics** — Planned. Acceptance: Distinguish real data from missing records.
- [ ] **ADMINHOME-02 Platform health** — Planned. Acceptance: Link actual status and incident evidence.
- [ ] **ADMINHOME-03 Commercial summary** — Planned. Acceptance: Show authoritative subscription and usage totals.
- [ ] **ADMINHOME-04 Actions** — Planned. Acceptance: Only expose authorised administrative operations.

### CUSTOMERS Admin customers

Route or view: /forge-admin/customers. Milestone: F14.

- [ ] **CUSTOMERS-01 Customer search** — Planned. Acceptance: Return scoped paginated records.
- [ ] **CUSTOMERS-02 Account detail** — Planned. Acceptance: Show configuration and project ownership accurately.
- [ ] **CUSTOMERS-03 Subscription history** — Planned. Acceptance: Link to authoritative billing state.
- [ ] **CUSTOMERS-04 Support context** — Planned. Acceptance: Minimise unnecessary private data exposure.
- [ ] **CUSTOMERS-05 Actions and audit** — Planned. Acceptance: Record actor and outcome for privileged changes.

### ADMINPROJECTS Admin projects

Route or view: /forge-admin/projects. Milestone: F14.

- [ ] **ADMINPROJECTS-01 Project search** — Planned. Acceptance: Identify exact project and workspace.
- [ ] **ADMINPROJECTS-02 Read access** — Planned. Acceptance: Require platform authority beyond customer membership.
- [ ] **ADMINPROJECTS-03 Health summary** — Planned. Acceptance: Use measured deployment and build status.
- [ ] **ADMINPROJECTS-04 Privileged actions** — Planned. Acceptance: Record explicit administrative operations.

### ADMINBILL Admin billing

Route or view: /forge-admin/billing. Milestone: F13B.

- [ ] **ADMINBILL-01 Product catalogue** — Planned. Acceptance: Version base, feature and capacity prices.
- [ ] **ADMINBILL-02 Subscription configuration** — Planned. Acceptance: Show bundles and custom selections consistently.
- [ ] **ADMINBILL-03 Webhook state** — Planned. Acceptance: Detect failures and support idempotent replay.
- [ ] **ADMINBILL-04 Top-up fulfilment** — Planned. Acceptance: Prevent duplicate or negative credit balances.
- [ ] **ADMINBILL-05 Reconciliation** — Planned. Acceptance: Compare invoices, entitlements and usage ledger.

### ADMINUSAGE Admin usage

Route or view: /forge-admin/usage. Milestone: F13B.

- [ ] **ADMINUSAGE-01 Provider spend** — Planned. Acceptance: Separate tokens, credits and actual invoices.
- [ ] **ADMINUSAGE-02 Model attribution** — Planned. Acceptance: Cost each specialist and attempt at its own rate.
- [ ] **ADMINUSAGE-03 Retries and failures** — Planned. Acceptance: Account for paid unsuccessful work.
- [ ] **ADMINUSAGE-04 Tenant budgets** — Planned. Acceptance: Enforce account and platform spend ceilings.
- [ ] **ADMINUSAGE-05 Contribution model** — Planned. Acceptance: Re-estimate custom baskets from measured costs.

### ADMINAI Admin AI operations

Route or view: /forge-admin/ai. Milestone: F04.

- [ ] **ADMINAI-01 Provider health** — Planned. Acceptance: Show actual configured and reachable state.
- [ ] **ADMINAI-02 Jobs** — Planned. Acceptance: Track queued, running, succeeded and failed attempts.
- [ ] **ADMINAI-03 Routing** — Planned. Acceptance: Apply supported model policies.
- [ ] **ADMINAI-04 Costs** — Planned. Acceptance: Attribute all paid attempts.
- [ ] **ADMINAI-05 Failure controls** — Planned. Acceptance: Bound retries and expose operational errors.

### KEYS Admin API keys

Route or view: /forge-admin/api-keys. Milestone: F04.

- [ ] **KEYS-01 Credential list** — Planned. Acceptance: Show metadata without raw secret values.
- [ ] **KEYS-02 Create and revoke** — Planned. Acceptance: Apply authorised server-side operations.
- [ ] **KEYS-03 Scope and expiry** — Planned. Acceptance: Disclose and enforce access boundaries.
- [ ] **KEYS-04 Audit** — Planned. Acceptance: Record privileged key lifecycle operations.

### INTEGRATIONS Admin integrations

Route or view: /forge-admin/integrations. Milestone: F09.

- [ ] **INTEGRATIONS-01 Connection inventory** — Planned. Acceptance: Show supported configured services.
- [ ] **INTEGRATIONS-02 Authorisation** — Planned. Acceptance: Use the intended credential and permission flow.
- [ ] **INTEGRATIONS-03 Health and sync** — Planned. Acceptance: Report real results and errors.
- [ ] **INTEGRATIONS-04 Revocation** — Planned. Acceptance: Stop further access and execution.
- [ ] **INTEGRATIONS-05 Costs** — Planned. Acceptance: Expose paid external-service dependencies.

### ADMINAGENTS Admin agents

Route or view: /forge-admin/agents. Milestone: F09.

- [ ] **ADMINAGENTS-01 Agent catalogue** — Planned. Acceptance: Define supported capabilities.
- [ ] **ADMINAGENTS-02 Prompt and model configuration** — Planned. Acceptance: Version changes and validate inputs.
- [ ] **ADMINAGENTS-03 Access policy** — Planned. Acceptance: Limit available projects and tools.
- [ ] **ADMINAGENTS-04 Job monitoring** — Planned. Acceptance: Trace actual execution results.
- [ ] **ADMINAGENTS-05 Budget policy** — Planned. Acceptance: Enforce bounded provider spending.

### ADMINBUILDS Admin builds

Route or view: /forge-admin/builds. Milestone: F06.

- [ ] **ADMINBUILDS-01 Job inventory** — Planned. Acceptance: Find builds by project and revision.
- [ ] **ADMINBUILDS-02 Worker limits** — Planned. Acceptance: Bound CPU, memory, runtime and network.
- [ ] **ADMINBUILDS-03 Artifacts** — Planned. Acceptance: Trace origin and retention.
- [ ] **ADMINBUILDS-04 Failure handling** — Planned. Acceptance: Show safe retry and cancellation states.
- [ ] **ADMINBUILDS-05 Logs** — Planned. Acceptance: Avoid exposing customer secrets.

### ADMINTEMPLATES Admin templates

Route or view: /forge-admin/templates. Milestone: F07.

- [ ] **ADMINTEMPLATES-01 Template records** — Planned. Acceptance: Manage approved metadata and categories.
- [ ] **ADMINTEMPLATES-02 Preview and validation** — Planned. Acceptance: Test actual installable manifests.
- [ ] **ADMINTEMPLATES-03 Publication state** — Planned. Acceptance: Separate drafts from available templates.
- [ ] **ADMINTEMPLATES-04 Versioning** — Planned. Acceptance: Preserve existing installed customer output.

### MODERATION Admin moderation

Route or view: /forge-admin/moderation. Milestone: F14.

- [ ] **MODERATION-01 Flag queue** — Planned. Acceptance: Show actual reported items and context.
- [ ] **MODERATION-02 Review state** — Planned. Acceptance: Track pending and resolved decisions.
- [ ] **MODERATION-03 Actions** — Planned. Acceptance: Apply authorised scoped changes.
- [ ] **MODERATION-04 Audit trail** — Planned. Acceptance: Retain decision actor and reason.

### INCIDENTS Admin incidents

Route or view: /forge-admin/incidents. Milestone: F14.

- [ ] **INCIDENTS-01 Incident list** — Planned. Acceptance: Record severity and affected services.
- [ ] **INCIDENTS-02 Evidence** — Planned. Acceptance: Link measured errors and logs.
- [ ] **INCIDENTS-03 Resolution** — Planned. Acceptance: Track owner, mitigation and recovery.
- [ ] **INCIDENTS-04 Communication state** — Planned. Acceptance: Distinguish prepared updates from sent notices.

### SUPPORT Admin support

Route or view: /forge-admin/support. Milestone: F14.

- [ ] **SUPPORT-01 Ticket queue** — Planned. Acceptance: Show actual open and closed requests.
- [ ] **SUPPORT-02 Account and project context** — Planned. Acceptance: Use authorised records only.
- [ ] **SUPPORT-03 Notes and responses** — Planned. Acceptance: Record state and sender accurately.
- [ ] **SUPPORT-04 Escalation** — Planned. Acceptance: Link incidents or engineering work.
- [ ] **SUPPORT-05 Access** — Planned. Acceptance: Keep private customer content appropriately restricted.

### ANNOUNCE Admin announcements

Route or view: /forge-admin/announcements. Milestone: F14.

- [ ] **ANNOUNCE-01 Draft and preview** — Planned. Acceptance: Review the exact message.
- [ ] **ANNOUNCE-02 Audience and schedule** — Planned. Acceptance: Show intended recipients and timing.
- [ ] **ANNOUNCE-03 Publication state** — Planned. Acceptance: Distinguish draft, scheduled and published.
- [ ] **ANNOUNCE-04 History** — Planned. Acceptance: Record edits and publication outcomes.

### FLAGS Admin features

Route or view: /forge-admin/features. Milestone: F13B.

- [ ] **FLAGS-01 Feature catalogue** — Planned. Acceptance: Use stable capability identifiers.
- [ ] **FLAGS-02 Rollout state** — Planned. Acceptance: Separate rollout flags from purchased access.
- [ ] **FLAGS-03 Dependencies** — Planned. Acceptance: Validate combinations before sale.
- [ ] **FLAGS-04 Entitlement enforcement** — Planned. Acceptance: Use server-authoritative access checks.
- [ ] **FLAGS-05 Audit** — Planned. Acceptance: Record policy and catalogue changes.

### ADMINS Admin access

Route or view: /forge-admin/admins. Milestone: F01.

- [ ] **ADMINS-01 Administrator list** — Planned. Acceptance: Show server-recognised privilege assignments.
- [ ] **ADMINS-02 Grant and revoke** — Planned. Acceptance: Require authorised explicit changes.
- [ ] **ADMINS-03 Least privilege** — Planned. Acceptance: Limit actions by platform role.
- [ ] **ADMINS-04 Self-protection** — Planned. Acceptance: Avoid accidentally removing final administrative access.
- [ ] **ADMINS-05 Audit** — Planned. Acceptance: Record actor and result.

### AUDIT Admin audit

Route or view: /forge-admin/audit. Milestone: F14.

- [ ] **AUDIT-01 Event source** — Planned. Acceptance: Use authoritative privileged-operation records.
- [ ] **AUDIT-02 Filters** — Planned. Acceptance: Filter by actor, action, time and target.
- [ ] **AUDIT-03 Integrity** — Planned. Acceptance: Prevent ordinary users from changing audit evidence.
- [ ] **AUDIT-04 Access** — Planned. Acceptance: Avoid private data exposure in exports.
- [ ] **AUDIT-05 Pagination** — Planned. Acceptance: Inspect bounded stable result pages.

### ADMINSET Admin settings

Route or view: /forge-admin/settings. Milestone: F00.

- [ ] **ADMINSET-01 Platform identity** — Planned. Acceptance: Separate production and test configuration.
- [ ] **ADMINSET-02 Billing mode** — Planned. Acceptance: Verify the intended Forge account and mode.
- [ ] **ADMINSET-03 Operational settings** — Planned. Acceptance: Validate required support and system values.
- [ ] **ADMINSET-04 Secret handling** — Planned. Acceptance: Keep secret values off ordinary response payloads.
- [ ] **ADMINSET-05 Change evidence** — Planned. Acceptance: Record actor and effective configuration.

### ADMINSYS Admin system

Route or view: /forge-admin/system. Milestone: F04.

- [ ] **ADMINSYS-01 Service checks** — Planned. Acceptance: Report database, storage, AI and billing separately.
- [ ] **ADMINSYS-02 Error evidence** — Planned. Acceptance: Distinguish unavailable telemetry from healthy service.
- [ ] **ADMINSYS-03 Environment view** — Planned. Acceptance: Show intended test or live target.
- [ ] **ADMINSYS-04 Recovery status** — Planned. Acceptance: Show tested backup and restore evidence.
- [ ] **ADMINSYS-05 Refresh** — Planned. Acceptance: Record when checks actually ran.

### RELEASE Release acceptance

Route or view: Whole Forge V2 product. Milestone: F14.

- [ ] **RELEASE-01 Two-project journey** — Planned. Acceptance: Open, edit, save, preview and return without mixed state.
- [ ] **RELEASE-02 Two-account isolation** — Planned. Acceptance: Prove cross-account requests are denied.
- [ ] **RELEASE-03 Role journeys** — Planned. Acceptance: Owner, editor, viewer and admin get correct actions.
- [ ] **RELEASE-04 Mobile and accessibility** — Planned. Acceptance: Test representative devices, keyboard and reduced motion.
- [ ] **RELEASE-05 Billing journeys** — Planned. Acceptance: Verify custom plan, add-on, renewal, top-up, failure and cancellation in sandbox.
- [ ] **RELEASE-06 Restore rehearsal** — Planned. Acceptance: Restore database and relevant asset or document backups.
- [ ] **RELEASE-07 Deployment rollback** — Planned. Acceptance: Rehearse source and published-site rollback.
- [ ] **RELEASE-08 Launch evidence** — Planned. Acceptance: Attach current-commit results and resolve release blockers.

### LATER Optional service modules

Route or view: After core V2 release. Milestone: Deferred.

- [ ] **LATER-01 Booking connector** — Deferred. Acceptance: Cost and verify one supported integration before selling it.
- [ ] **LATER-02 Automation execution pack** — Deferred. Acceptance: Define bounded actions, runtime and paid external costs.
- [ ] **LATER-03 Dedicated app backends** — Deferred. Acceptance: Quote Supabase compute, storage and management separately.
- [ ] **LATER-04 Ecommerce and messaging** — Deferred. Acceptance: Cost provider fees and support before offering a module.
