# Forge

## 1. Project Description
Forge is an AI website builder. A Master Agent plans the site, specialist agents (UI, code, data, content, quality, deployment) build it, and the user refines everything in a live preview, then publishes (custom domains supported) or exports a standard static website to host anywhere.

**Target users**: Founders, freelancers, agencies and developers who want a professional website fast without giving up control of how it is built or where it lives.

**Core value**: You can see the AI work (plan, tasks, every change), and you keep the result (clean export, reversible versions, no lock-in).

### Positioning rules (keep the public site consistent with these)
- Do NOT describe Forge as "local-first". It runs on Supabase, a hosted AI gateway and Stripe.
- Do NOT promise "bring your own API keys" — workspace keys are legacy; AI is routed centrally.
- Accurate claims: exports a standard static site (HTML, CSS, assets); routes each task to a suitable model across OpenAI, Anthropic and Google with automatic fallback; every build is a restorable version; publishing with custom domains.
- Write plainly and confidently. Avoid hedges like "designed to support", "help", "is being designed".
- Never show internal notes on the public site (e.g. "No fabricated testimonials").
- App chrome (status bar, sidebar, top bar, sandbox footer) must show only real service health from `systemStatusService` — never mock data.

## 2. Page Structure
### Public Pages
- `/` - Landing page (hero, workspace walkthrough, features, how it works, agents, ownership, use cases, pricing teaser, FAQ, final CTA)
- `/login` - Login page (placeholder)
- `/setup` - First-run setup (placeholder)
- `/onboarding` - Onboarding flow (placeholder)

### Main Application Pages
- `/dashboard` - Dashboard overview
- `/projects` - Project list
- `/projects/new` - New project wizard
- `/templates` - Template gallery
- `/agents` - Agent management
- `/activity` - Activity feed
- `/settings` - Global settings
  - `/settings/profile` - User profile
  - `/settings/appearance` - Theme settings
  - `/settings/providers` - AI provider connections
  - `/settings/system` - System configuration

### Project Pages
- `/projects/:projectId` - Project redirect (to overview)
- `/projects/:projectId/overview` - Project overview
- `/projects/:projectId/sandbox` - AI sandbox workspace
- `/projects/:projectId/files` - File manager
- `/projects/:projectId/assets` - Asset manager
- `/projects/:projectId/builds` - Build history
- `/projects/:projectId/versions` - Version history
- `/projects/:projectId/exports` - Export manager
- `/projects/:projectId/settings` - Project settings

### System Pages
- `/system/status` - System health dashboard
- `/help` - Help and documentation (placeholder)

## 3. Core Features (Phase 1 — Foundation)
- [x] Dark/light theme system with CSS variables
- [x] Multiple layout types (Public, MainApp, Project, Sandbox)
- [x] Top application bar with workspace selector and status indicators
- [x] Collapsible primary sidebar with active route state
- [x] Bottom status bar with system health indicators
- [x] Complete routing with placeholder pages
- [x] Reusable UI component library (35+ components)
- [x] Typed entity definitions
- [x] Mock service architecture with demo data
- [x] State management stores (theme, sidebar, notifications, etc.)
- [x] Global interactions (toast system, command palette, keyboard shortcuts)
- [x] Responsive layout (desktop optimized, tablet/mobile supported)

### Future Phases
- Phase 2: Hero page, landing experience, login/setup flows
- Phase 3: Full chat workspace, sandbox, AI prompt system
- Phase 4: Build pipeline, versioning, export system
- Phase 5: Provider connections, n8n integration, preview manager

## 4. Data Model Design
(Will be implemented when Supabase is connected)

## 5. Backend / Third-party Integration Plan
- **Supabase**: Will be used for auth, database, and real-time features (P4+)
- **Local Forge API**: Will be the primary backend (P4+)
- **n8n**: Local workflow automation (P4+)
- **Ollama**: Local AI model hosting (P4+)
- **Preview Manager**: Local preview server (P4+)

## 6. Development Phase Plan

### Phase 1: Application Foundation (Current)
- Goal: Build the complete visual foundation, routing, layouts, theme system, navigation, reusable components, and typed architecture
- Deliverable: Fully functional application shell with all routes, dark/light themes, responsive layouts, and placeholder pages

### Phase 2: Landing and Authentication (Current)
- Goal: Build hero page with cinematic video background, branded loading screen, public navigation, product workflow section, and trust strip
- Deliverable: Complete public-facing hero page with boot transition, loading screen, and functional CTA routing

### Phase 3: AI Sandbox Workspace
- Goal: Build the full chat workspace, prompt system, preview integration
- Deliverable: Functional AI development environment with real-time preview

### Phase 4: Build and Export Pipeline
- Goal: Implement project building, versioning, and export capabilities
- Deliverable: End-to-end build and export workflow

### Phase 5: Provider and Service Integration
- Goal: Connect local services (Forge API, n8n, Ollama, Supabase)
- Deliverable: Fully integrated local-first development environment