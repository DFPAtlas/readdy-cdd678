/* ──────────────────────────────────────────────────────────────
   Forge Help Centre — documentation content.

   This is static, data-driven documentation describing the real
   Forge product. Categories and articles map to features that
   genuinely exist (routes, tables and services in the codebase).
   Nothing here documents planned or unsupported capabilities.
   ────────────────────────────────────────────────────────────── */

export type CalloutKind = 'note' | 'tip' | 'important' | 'warning';

export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'code'; language?: string; code: string }
  | { type: 'callout'; kind: CalloutKind; text: string };

export interface HelpCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  keywords: string[];
  related: string[];
  body: HelpBlock[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', label: 'Getting Started', description: 'Understand Forge and build your first project.', icon: 'rocket' },
  { id: 'projects', label: 'Projects', description: 'Create, manage and configure your projects.', icon: 'folder' },
  { id: 'workspace', label: 'Forge Workspace', description: 'The Sandbox: plan, build and preview.', icon: 'layout' },
  { id: 'ai-providers', label: 'AI & Providers', description: 'Configure AI providers and agents.', icon: 'sparkles' },
  { id: 'builds-versions', label: 'Builds & Versions', description: 'Builds, snapshots and version history.', icon: 'git-branch' },
  { id: 'files-assets', label: 'Files & Assets', description: 'Manage project files and media.', icon: 'file-code' },
  { id: 'content', label: 'Content (CMS)', description: 'Structured collections and content items.', icon: 'database' },
  { id: 'collaboration', label: 'Collaboration', description: 'Members, roles and invitations.', icon: 'users' },
  { id: 'workflows', label: 'Workflows', description: 'Automations with triggers and actions.', icon: 'workflow' },
  { id: 'exports', label: 'Exports', description: 'Export clean, portable source code.', icon: 'package' },
  { id: 'account-billing', label: 'Account & Billing', description: 'Profile, appearance and your plan.', icon: 'credit-card' },
  { id: 'troubleshooting', label: 'Troubleshooting', description: 'Fix common issues and configuration problems.', icon: 'wrench' },
  { id: 'legal', label: 'Legal', description: 'Privacy policy and terms of service.', icon: 'scale' },
];

export const HELP_ARTICLES: HelpArticle[] = [
  /* ─────────────── Getting Started ─────────────── */
  {
    slug: 'what-is-forge',
    title: 'What is Forge?',
    category: 'getting-started',
    excerpt: 'Forge is a local-first AI development workspace for planning, building, refining and exporting production-ready websites.',
    keywords: ['forge', 'overview', 'workspace', 'local-first', 'ai', 'introduction'],
    related: ['create-first-project', 'open-the-sandbox', 'how-forge-ai-works'],
    body: [
      { type: 'paragraph', text: 'Forge is a workspace for planning, building, refining and exporting production-ready websites. It combines an AI assistant — the **Master Agent** — with a visual, drag-and-drop workspace, so you stay in control from the first prompt through to export.' },
      { type: 'heading', level: 2, text: 'Core concepts' },
      { type: 'list', items: [
        '**Projects** — each website lives in its own project, with its own pages, files, members and settings.',
        '**Sandbox** — the visual workspace where you plan, build and preview a project.',
        '**Agents** — the Master Agent and its specialist agents that plan and perform work on your behalf.',
        '**Builds** — automated build runs that compile and validate your project.',
        '**Versions** — snapshots of your project that you can review and restore.',
        '**Exports** — portable source code you own and can take anywhere.',
      ] },
      { type: 'callout', kind: 'note', text: 'Forge is local-first by design. You own the source code you produce and choose which AI providers to use.' },
    ],
  },
  {
    slug: 'create-first-project',
    title: 'Create your first project',
    category: 'getting-started',
    excerpt: 'Create a project from a template or blank, then open it in the Sandbox to start building.',
    keywords: ['create', 'project', 'new', 'start', 'template', 'blank'],
    related: ['choose-a-template', 'open-the-sandbox', 'configure-ai-provider'],
    body: [
      { type: 'paragraph', text: 'A project is where a website lives. Every page, file, member and setting belongs to a project.' },
      { type: 'heading', level: 2, text: 'Create a project' },
      { type: 'list', ordered: true, items: [
        'Open the [Projects](/projects) page.',
        'Choose **New project**.',
        'Pick a template or start **blank**.',
        'Give the project a name.',
        'Forge opens the Sandbox for that project.',
      ] },
      { type: 'paragraph', text: 'You can create as many projects as your plan allows. Each one is isolated from the others.' },
      { type: 'callout', kind: 'tip', text: 'If this is your first project, configure an AI provider first so the Master Agent can assist you — see [Configure an AI provider](/help?topic=configure-ai-provider).' },
    ],
  },
  {
    slug: 'choose-a-template',
    title: 'Choose a template',
    category: 'getting-started',
    excerpt: 'Start from a starter template to get a head start, or begin with a blank project.',
    keywords: ['template', 'starter', 'kit', 'blank', 'start'],
    related: ['create-first-project', 'open-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'Templates give you a structured starting point for common site types. You can also begin from a blank project and build everything yourself.' },
      { type: 'heading', level: 2, text: 'Using a template' },
      { type: 'list', items: [
        'Browse the [Templates](/templates) page to preview available starter kits.',
        'Select a template to see its preview.',
        'Install it into a new project, or start blank.',
      ] },
      { type: 'callout', kind: 'note', text: 'Templates are starting points, not locked designs. Once installed, you can change every page, element and style.' },
    ],
  },
  {
    slug: 'open-the-sandbox',
    title: 'Open the Sandbox',
    category: 'workspace',
    excerpt: 'The Sandbox is the visual workspace where you plan, build, edit and preview a project.',
    keywords: ['sandbox', 'workspace', 'editor', 'open', 'canvas'],
    related: ['work-in-the-sandbox', 'create-first-project', 'preview-and-publish'],
    body: [
      { type: 'paragraph', text: 'The **Sandbox** is Forge\u2019s visual workspace. It is where you describe changes, edit the canvas and preview your site.' },
      { type: 'heading', level: 2, text: 'Open the Sandbox' },
      { type: 'list', items: [
        'From the [Dashboard](/dashboard), open a project.',
        'Choose **Open Sandbox** from the project overview.',
        'Or navigate directly to the project\u2019s Sandbox route.',
      ] },
      { type: 'heading', level: 2, text: 'What you will see' },
      { type: 'list', items: [
        '**Pages & elements** — the left panel lists your pages and reusable elements.',
        '**Canvas** — the central area shows a live preview of your site.',
        '**Master Agent** — the right panel is where you describe changes in plain English.',
        '**Build activity** — the bottom drawer shows agent and build progress.',
      ] },
    ],
  },
  {
    slug: 'work-in-the-sandbox',
    title: 'Work in the Sandbox',
    category: 'workspace',
    excerpt: 'Describe a change, review the plan, and shape the result visually in the Sandbox.',
    keywords: ['sandbox', 'build', 'edit', 'elements', 'prompt', 'canvas'],
    related: ['open-the-sandbox', 'how-forge-ai-works', 'understand-versions'],
    body: [
      { type: 'paragraph', text: 'The Sandbox lets you combine AI assistance with precise manual control.' },
      { type: 'heading', level: 2, text: 'The workflow' },
      { type: 'list', ordered: true, items: [
        '**Describe** what you need in the Master Agent panel.',
        '**Review** the plan — which agents will work and what they will change.',
        '**Build** — approve the plan and watch the agents work.',
        '**Edit** — drag elements, change content, or ask the AI for a change.',
        '**Preview** — check desktop, tablet and mobile layouts.',
      ] },
      { type: 'heading', level: 2, text: 'Elements and components' },
      { type: 'paragraph', text: 'Use the elements library to add sections, headings, text, images, buttons and containers, then customise each one directly on the canvas.' },
      { type: 'callout', kind: 'tip', text: 'Save a version from time to time so you can always restore an earlier state if you change your mind.' },
    ],
  },
  {
    slug: 'preview-and-publish',
    title: 'Preview and publish',
    category: 'workspace',
    excerpt: 'Check responsive layouts, run checks, and publish your project to a hosted preview.',
    keywords: ['preview', 'publish', 'deploy', 'responsive', 'device', 'check'],
    related: ['understand-builds', 'export-project', 'work-in-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'Before sharing a project, preview it across device sizes and run the available checks.' },
      { type: 'heading', level: 2, text: 'Preview' },
      { type: 'list', items: [
        'Switch between desktop, tablet and mobile views in the Sandbox.',
        'Review each page for layout and content issues.',
        'Run checks to surface problems before publishing.',
      ] },
      { type: 'heading', level: 2, text: 'Publish' },
      { type: 'paragraph', text: 'Publishing produces a hosted deployment of your project. Deployments appear in your project\u2019s deployment history.' },
      { type: 'callout', kind: 'note', text: 'Publishing and exporting are separate. Publish to host a preview; export to download the source code.' },
    ],
  },

  /* ─────────────── Projects ─────────────── */
  {
    slug: 'project-overview',
    title: 'Project overview',
    category: 'projects',
    excerpt: 'The project overview summarises health, progress, recent activity and what needs attention.',
    keywords: ['project', 'overview', 'health', 'progress', 'activity', 'dashboard'],
    related: ['project-settings', 'open-the-sandbox', 'understand-versions'],
    body: [
      { type: 'paragraph', text: 'Each project has an overview page that brings together the most useful signals about its current state.' },
      { type: 'heading', level: 2, text: 'What the overview shows' },
      { type: 'list', items: [
        '**Health** — checks and issues that may need attention.',
        '**Progress** — how far along the project is.',
        '**Version snapshot** — the current saved version.',
        '**Recent activity** — recent changes and events.',
      ] },
      { type: 'paragraph', text: 'Use the overview as a starting point before jumping into the Sandbox or another area.' },
    ],
  },
  {
    slug: 'project-settings',
    title: 'Project settings',
    category: 'projects',
    excerpt: 'Edit project details and collaboration access, and understand what is project-level versus workspace-level.',
    keywords: ['project', 'settings', 'name', 'description', 'access', 'collaboration'],
    related: ['project-overview', 'project-members', 'configure-ai-provider'],
    body: [
      { type: 'paragraph', text: 'Project settings control what belongs to a single project. Open them from the project\u2019s **Settings** area.' },
      { type: 'heading', level: 2, text: 'What you can edit' },
      { type: 'list', items: [
        '**Name** — the project\u2019s display name.',
        '**Description** — an optional description.',
        '**Access** — collaboration settings such as approval requirements and notifications.',
      ] },
      { type: 'heading', level: 2, text: 'Read-only details' },
      { type: 'paragraph', text: 'The project ID, creation date, last-updated time and status are shown as read-only technical details.' },
      { type: 'callout', kind: 'important', text: 'AI provider configuration is managed at the **workspace** level, not per project. See [Configure an AI provider](/help?topic=configure-ai-provider).' },
    ],
  },

  /* ─────────────── AI & Providers ─────────────── */
  {
    slug: 'configure-ai-provider',
    title: 'Configure an AI provider',
    category: 'ai-providers',
    excerpt: 'Connect an AI provider at the workspace level so Forge can assist with development.',
    keywords: ['ai', 'provider', 'configure', 'api key', 'model', 'workspace'],
    related: ['how-forge-ai-works', 'provider-connection-failed', 'ai-provider-not-configured'],
    body: [
      { type: 'paragraph', text: 'Forge uses AI providers for AI-assisted development. Providers are configured once at the **workspace** level and shared across all your projects.' },
      { type: 'heading', level: 2, text: 'Supported providers' },
      { type: 'list', items: [
        'Anthropic',
        'OpenAI',
        'Google Gemini',
        'Mistral',
        'Groq',
        'OpenRouter',
        'Local Ollama',
        'Custom endpoint',
        'Forge-hosted',
      ] },
      { type: 'heading', level: 2, text: 'Add a provider' },
      { type: 'list', ordered: true, items: [
        'Open [AI Providers](/settings/providers).',
        'Choose a provider and select **Configure**.',
        'Paste your API key (shown as a password field).',
        'Forge tests the connection before saving.',
      ] },
      { type: 'code', language: 'text', code: 'YOUR_API_KEY' },
      { type: 'callout', kind: 'note', text: 'Your API key is stored server-side and only ever shown as a masked suffix. Forge never returns full keys to the browser.' },
      { type: 'paragraph', text: 'Manage providers from [AI Providers](/settings/providers).' },
    ],
  },
  {
    slug: 'how-forge-ai-works',
    title: 'How Forge AI works',
    category: 'ai-providers',
    excerpt: 'The Master Agent plans work, assigns specialist agents, and shows the plan before anything changes.',
    keywords: ['ai', 'master agent', 'agents', 'plan', 'build', 'assistant'],
    related: ['agents', 'configure-ai-provider', 'work-in-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'The **Master Agent** is the assistant that interprets your instructions and coordinates the specialist agents that perform the work.' },
      { type: 'heading', level: 2, text: 'How it works' },
      { type: 'list', ordered: true, items: [
        'You describe a change in plain English.',
        'The Master Agent prepares a build plan and assigns the right agents.',
        'You review the plan — including what will change and the estimated cost — before anything runs.',
        'You approve the plan and the agents begin.',
      ] },
      { type: 'callout', kind: 'important', text: 'AI-assisted work may consume AI credits depending on your plan. The estimated cost is shown before a build begins.' },
    ],
  },
  {
    slug: 'agents',
    title: 'Agents',
    category: 'ai-providers',
    excerpt: 'The Master Agent coordinates specialist agents with controlled, scoped tools.',
    keywords: ['agents', 'master agent', 'specialist', 'tools'],
    related: ['how-forge-ai-works', 'configure-ai-provider', 'work-in-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'Agents are the workers that carry out tasks in the Sandbox. The **Master Agent** coordinates a set of **specialist agents**.' },
      { type: 'heading', level: 2, text: 'Agent control' },
      { type: 'list', items: [
        'Agents have controlled, scoped tools rather than unrestricted access.',
        'You review the plan before agents start.',
        'You can review every file change and undo or restore a version.',
      ] },
      { type: 'paragraph', text: 'Explore agents and their capabilities from the [Agents](/agents) page.' },
    ],
  },

  /* ─────────────── Builds & Versions ─────────────── */
  {
    slug: 'understand-builds',
    title: 'Understand builds',
    category: 'builds-versions',
    excerpt: 'Builds compile and validate your project, with logs you can inspect when something goes wrong.',
    keywords: ['build', 'pipeline', 'compile', 'validate', 'logs', 'status'],
    related: ['understand-versions', 'build-failed', 'preview-and-publish'],
    body: [
      { type: 'paragraph', text: 'A **build** compiles and validates your project. Builds run when you publish, export, or trigger them from the Sandbox.' },
      { type: 'heading', level: 2, text: 'Build status' },
      { type: 'list', items: [
        'Each build has a status, such as queued, running, completed or failed.',
        'Build logs show what happened and help you diagnose issues.',
        'Failed builds do not block editing — you can fix and rebuild.',
      ] },
      { type: 'paragraph', text: 'View build history from your project\u2019s **Builds** area.' },
    ],
  },
  {
    slug: 'understand-versions',
    title: 'Understand versions',
    category: 'builds-versions',
    excerpt: 'Versions are snapshots of your project that you can review, compare and restore.',
    keywords: ['version', 'snapshot', 'history', 'restore', 'checkpoint', 'compare'],
    related: ['understand-builds', 'work-in-the-sandbox', 'export-project'],
    body: [
      { type: 'paragraph', text: 'A **version** is a saved snapshot of your project at a point in time.' },
      { type: 'heading', level: 2, text: 'Version history' },
      { type: 'list', items: [
        'Save versions from the Sandbox to checkpoint your work.',
        'Browse the version timeline to see earlier states.',
        'Compare versions and restore an earlier one when needed.',
      ] },
      { type: 'callout', kind: 'tip', text: 'Save a version before making a large or experimental change, so you can always go back.' },
    ],
  },

  /* ─────────────── Files & Assets ─────────────── */
  {
    slug: 'manage-files',
    title: 'Manage files',
    category: 'files-assets',
    excerpt: 'Browse and manage the files that make up your project.',
    keywords: ['files', 'project', 'structure', 'code', 'manage'],
    related: ['manage-assets', 'work-in-the-sandbox', 'export-project'],
    body: [
      { type: 'paragraph', text: 'Every project has a set of files — pages, components and configuration. The **Files** area shows their structure.' },
      { type: 'heading', level: 2, text: 'Working with files' },
      { type: 'list', items: [
        'Browse the project structure from the Files area.',
        'Select a file to see its details.',
        'Changes made in the Sandbox are reflected in the project files.',
      ] },
    ],
  },
  {
    slug: 'manage-assets',
    title: 'Manage assets',
    category: 'files-assets',
    excerpt: 'Upload and organise images and media used across your project.',
    keywords: ['assets', 'images', 'media', 'upload', 'files'],
    related: ['manage-files', 'work-in-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'The **Assets** area holds images and media you use in your project.' },
      { type: 'heading', level: 2, text: 'Working with assets' },
      { type: 'list', items: [
        'Upload images and other media.',
        'Browse assets in a grid or list view.',
        'Select an asset to see its details and reuse it across pages.',
      ] },
    ],
  },

  /* ─────────────── Content (CMS) ─────────────── */
  {
    slug: 'cms-collections',
    title: 'CMS collections and items',
    category: 'content',
    excerpt: 'Model structured content with collections and fields, and manage items with draft and published states.',
    keywords: ['cms', 'collection', 'fields', 'content', 'items', 'draft', 'published'],
    related: ['understand-workflows', 'work-in-the-sandbox'],
    body: [
      { type: 'paragraph', text: 'The **CMS** lets you model structured content with collections and fields, then manage individual content items.' },
      { type: 'heading', level: 2, text: 'Collections and fields' },
      { type: 'list', items: [
        'A **collection** groups related content (for example, blog posts or testimonials).',
        '**Fields** define the shape of each item, with types such as text, rich text and dates.',
      ] },
      { type: 'heading', level: 2, text: 'Items' },
      { type: 'list', items: [
        'Create items within a collection.',
        'Items move through states such as draft and published.',
        'Schedule publishing and unpublishing for an item.',
      ] },
    ],
  },

  /* ─────────────── Collaboration ─────────────── */
  {
    slug: 'project-members',
    title: 'Project members and roles',
    category: 'collaboration',
    excerpt: 'Roles define what each collaborator can do within a project.',
    keywords: ['members', 'roles', 'permissions', 'collaboration', 'team'],
    related: ['invite-members', 'project-settings'],
    body: [
      { type: 'paragraph', text: 'Collaborators join a project as members. Each member has a **role** that determines what they can do.' },
      { type: 'heading', level: 2, text: 'Roles' },
      { type: 'list', items: [
        '**Owner** — full control including billing and transferring ownership.',
        '**Admin** — manage members, edit, build and publish.',
        '**Designer** — edit the canvas, assets and design system.',
        '**Developer** — edit code and technical settings.',
        '**Copywriter** — edit text and SEO content.',
        '**Client** — limited access for reviewing and providing feedback.',
        '**Reviewer** — view and comment only.',
      ] },
      { type: 'callout', kind: 'note', text: 'Access is enforced server-side. Roles describe the actual permissions, not just labels.' },
    ],
  },
  {
    slug: 'invite-members',
    title: 'Invite members',
    category: 'collaboration',
    excerpt: 'Invite collaborators to a project and assign them a role.',
    keywords: ['invite', 'members', 'collaborators', 'role', 'team'],
    related: ['project-members', 'project-settings'],
    body: [
      { type: 'paragraph', text: 'Invite collaborators from the project\u2019s **Members** area.' },
      { type: 'heading', level: 2, text: 'Inviting someone' },
      { type: 'list', ordered: true, items: [
        'Open the Members area for your project.',
        'Choose **Invite**.',
        'Enter the person\u2019s email and select a role.',
        'They receive an invitation and appear as pending until they accept.',
      ] },
    ],
  },

  /* ─────────────── Workflows ─────────────── */
  {
    slug: 'understand-workflows',
    title: 'Understand workflows',
    category: 'workflows',
    excerpt: 'Build automations with triggers, conditions and actions, saved as versioned definitions.',
    keywords: ['workflow', 'automation', 'trigger', 'action', 'condition', 'connection'],
    related: ['cms-collections', 'configure-ai-provider'],
    body: [
      { type: 'paragraph', text: 'A **workflow** defines a sequence of steps that run in response to a trigger. Workflows are built visually and saved as versioned definitions.' },
      { type: 'heading', level: 2, text: 'Building blocks' },
      { type: 'list', items: [
        '**Triggers** — what starts a workflow, such as a form submission, a CMS item being published, or a scheduled run.',
        '**Conditions** — branch logic based on values.',
        '**Actions** — what the workflow does, such as sending an email or a signed webhook.',
      ] },
      { type: 'heading', level: 2, text: 'Connections' },
      { type: 'paragraph', text: 'Connections represent integrations your workflow can use, such as email delivery, an external automation service, or an approved HTTP endpoint.' },
      { type: 'callout', kind: 'note', text: 'Workflows are saved as versions and record a run history, so you can review what ran and when.' },
    ],
  },

  /* ─────────────── Exports ─────────────── */
  {
    slug: 'export-project',
    title: 'Export your project',
    category: 'exports',
    excerpt: 'Download clean, portable source code that you own.',
    keywords: ['export', 'source', 'code', 'download', 'portable', 'ownership'],
    related: ['understand-builds', 'understand-versions', 'export-unavailable'],
    body: [
      { type: 'paragraph', text: 'Exporting produces clean, portable source code for your project, ready for your chosen host.' },
      { type: 'heading', level: 2, text: 'Before you export' },
      { type: 'list', items: [
        'A **current version** must be available.',
        'The **latest build** should have completed successfully.',
      ] },
      { type: 'heading', level: 2, text: 'Exporting' },
      { type: 'list', items: [
        'Open the project\u2019s **Exports** area.',
        'Review export readiness.',
        'Create an export to download the source.',
      ] },
      { type: 'callout', kind: 'important', text: 'You own the source code you produce. Exports are portable and not locked to Forge.' },
    ],
  },

  /* ─────────────── Account & Billing ─────────────── */
  {
    slug: 'account-profile',
    title: 'Account and profile',
    category: 'account-billing',
    excerpt: 'Edit your display name and review your account details.',
    keywords: ['account', 'profile', 'display name', 'email', 'user'],
    related: ['appearance-theme', 'billing-plans', 'login-session-issues'],
    body: [
      { type: 'paragraph', text: 'Your profile holds the personal details tied to your Forge account.' },
      { type: 'heading', level: 2, text: 'What you can edit' },
      { type: 'list', items: [
        '**Display name** — how your name appears across Forge.',
      ] },
      { type: 'heading', level: 2, text: 'Read-only details' },
      { type: 'list', items: [
        '**Email** — managed by authentication and shown as read-only.',
        '**Account created** — the date your account was created.',
        '**User ID** — a technical identifier.',
      ] },
      { type: 'paragraph', text: 'Edit your profile from [Profile](/settings/profile).' },
    ],
  },
  {
    slug: 'appearance-theme',
    title: 'Appearance and theme',
    category: 'account-billing',
    excerpt: 'Choose between dark, light, or system theme.',
    keywords: ['appearance', 'theme', 'dark', 'light', 'system'],
    related: ['account-profile'],
    body: [
      { type: 'paragraph', text: 'Forge supports three themes: **dark**, **light** and **system**.' },
      { type: 'heading', level: 2, text: 'Choosing a theme' },
      { type: 'list', items: [
        '**Dark** — the default, low-light interface.',
        '**Light** — a brighter interface.',
        '**System** — follows your operating system preference.',
      ] },
      { type: 'paragraph', text: 'Theme changes apply immediately and are saved automatically. Manage them from [Appearance](/settings/appearance).' },
    ],
  },
  {
    slug: 'billing-plans',
    title: 'Billing and plans',
    category: 'account-billing',
    excerpt: 'View current plans and manage your subscription.',
    keywords: ['billing', 'plan', 'subscription', 'pricing', 'credits', 'upgrade'],
    related: ['account-profile', 'configure-ai-provider'],
    body: [
      { type: 'paragraph', text: 'Forge offers plans with different allowances for AI credits, pages, published sites and custom domains.' },
      { type: 'heading', level: 2, text: 'Viewing plans' },
      { type: 'paragraph', text: 'See current plans and prices on the [Pricing](/pricing) page. Plan prices and allowances live there so documentation never goes stale.' },
      { type: 'callout', kind: 'note', text: 'Your active plan is shown on your profile. Manage your subscription from the same area.' },
    ],
  },

  /* ─────────────── Troubleshooting ─────────────── */
  {
    slug: 'ai-provider-not-configured',
    title: 'AI provider not configured',
    category: 'troubleshooting',
    excerpt: 'AI features require a configured provider at the workspace level.',
    keywords: ['ai', 'provider', 'not configured', 'setup', 'troubleshoot'],
    related: ['configure-ai-provider', 'provider-connection-failed'],
    body: [
      { type: 'paragraph', text: 'If AI features show as unavailable, you likely have not configured an AI provider yet.' },
      { type: 'heading', level: 2, text: 'Fix it' },
      { type: 'list', ordered: true, items: [
        'Open [AI Providers](/settings/providers).',
        'Choose a supported provider and select **Configure**.',
        'Paste your API key and let Forge test the connection.',
      ] },
      { type: 'callout', kind: 'note', text: 'Providers are configured once at the workspace level and apply to all your projects.' },
    ],
  },
  {
    slug: 'provider-connection-failed',
    title: 'Provider connection failed',
    category: 'troubleshooting',
    excerpt: 'What to check when a provider connection cannot be verified.',
    keywords: ['provider', 'connection', 'failed', 'api key', 'troubleshoot'],
    related: ['configure-ai-provider', 'ai-provider-not-configured'],
    body: [
      { type: 'paragraph', text: 'If a provider connection fails, Forge shows a safe, high-level message rather than raw errors.' },
      { type: 'heading', level: 2, text: 'Things to check' },
      { type: 'list', items: [
        'The API key is entered correctly and has not expired.',
        'The key has the permissions required by the provider.',
        'The provider is reachable from your network.',
      ] },
      { type: 'callout', kind: 'important', text: 'Never share your API key or paste it anywhere outside the secure provider configuration form.' },
    ],
  },
  {
    slug: 'project-not-loading',
    title: 'Project not loading',
    category: 'troubleshooting',
    excerpt: 'Steps to take when a project fails to open or appears empty.',
    keywords: ['project', 'loading', 'empty', 'error', 'troubleshoot'],
    related: ['login-session-issues', 'project-overview'],
    body: [
      { type: 'paragraph', text: 'If a project does not load, try the following.' },
      { type: 'heading', level: 2, text: 'Steps' },
      { type: 'list', items: [
        'Refresh the page.',
        'Confirm you are signed in — a project may not load if your session has ended.',
        'Check that you are a member of the project.',
        'Return to [Projects](/projects) and reopen the project.',
      ] },
      { type: 'callout', kind: 'note', text: 'If a project consistently fails to load, review the [System Status](/system/status) page to confirm Forge services are reachable.' },
    ],
  },
  {
    slug: 'build-failed',
    title: 'Build failed',
    category: 'troubleshooting',
    excerpt: 'How to investigate and recover from a failed build.',
    keywords: ['build', 'failed', 'logs', 'error', 'troubleshoot'],
    related: ['understand-builds', 'export-unavailable'],
    body: [
      { type: 'paragraph', text: 'A failed build does not block editing. You can inspect the logs, fix the issue and rebuild.' },
      { type: 'heading', level: 2, text: 'Investigate' },
      { type: 'list', ordered: true, items: [
        'Open the project\u2019s **Builds** area.',
        'Select the failed build to view its logs.',
        'Look for the step where the build stopped.',
        'Fix the underlying issue in the Sandbox and rebuild.',
      ] },
      { type: 'callout', kind: 'tip', text: 'Build logs are the most reliable way to understand what went wrong.' },
    ],
  },
  {
    slug: 'export-unavailable',
    title: 'Export unavailable',
    category: 'troubleshooting',
    excerpt: 'Exports require a current version and a completed build.',
    keywords: ['export', 'unavailable', 'build', 'version', 'troubleshoot'],
    related: ['export-project', 'understand-builds', 'understand-versions'],
    body: [
      { type: 'paragraph', text: 'Exporting requires two things to be ready.' },
      { type: 'heading', level: 2, text: 'Requirements' },
      { type: 'list', items: [
        'A **current version** of the project must exist.',
        'The **latest build** must have completed successfully.',
      ] },
      { type: 'heading', level: 2, text: 'Fix it' },
      { type: 'list', ordered: true, items: [
        'Save a version from the Sandbox if none exists.',
        'Run a build and confirm it completes.',
        'Return to the Exports area and try again.',
      ] },
    ],
  },
  {
    slug: 'login-session-issues',
    title: 'Login and session issues',
    category: 'troubleshooting',
    excerpt: 'What to do when you cannot sign in or your session has ended.',
    keywords: ['login', 'session', 'sign in', 'auth', 'troubleshoot'],
    related: ['account-profile', 'project-not-loading'],
    body: [
      { type: 'paragraph', text: 'Sign in with your Forge account. If your session ends unexpectedly, Forge may ask you to sign in again.' },
      { type: 'heading', level: 2, text: 'Steps' },
      { type: 'list', items: [
        'Sign in again from the [Login](/login) page.',
        'Confirm you are using the correct account.',
        'After signing in, you are returned to where you left off.',
      ] },
      { type: 'callout', kind: 'note', text: 'Forge never exposes your password or authentication details anywhere in the interface.' },
    ],
  },

  /* ─────────────── Legal (pending content) ─────────────── */
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    category: 'legal',
    excerpt: 'Forge\u2019s privacy policy.',
    keywords: ['privacy', 'policy', 'data', 'legal'],
    related: ['terms', 'account-profile'],
    body: [
      { type: 'callout', kind: 'warning', text: 'The full Forge Privacy Policy has not been finalised yet. The text below is a summary and is not legal advice.' },
      { type: 'paragraph', text: 'Forge is a local-first development workspace. This page will describe how Forge handles data once the full privacy policy is available.' },
      { type: 'paragraph', text: 'Please check back later for the complete policy.' },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    category: 'legal',
    excerpt: 'Forge\u2019s terms of service.',
    keywords: ['terms', 'service', 'legal', 'agreement'],
    related: ['privacy', 'billing-plans'],
    body: [
      { type: 'callout', kind: 'warning', text: 'The full Forge Terms of Service have not been finalised yet. The text below is a summary and is not a legal agreement.' },
      { type: 'paragraph', text: 'Forge provides an AI-assisted development workspace. This page will describe the terms governing use of Forge once the full terms are available.' },
      { type: 'paragraph', text: 'Please check back later for the complete terms.' },
    ],
  },
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getCategoryById(id: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.id === id);
}

export function getArticlesByCategory(categoryId: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === categoryId);
}

/** Flat, searchable text for client-side search. */
export function searchableText(article: HelpArticle): string {
  const bodyText = article.body
    .map((b) => (b.type === 'heading' || b.type === 'paragraph' || b.type === 'callout' ? b.text : b.type === 'list' ? b.items.join(' ') : ''))
    .join(' ');
  return [article.title, article.excerpt, article.keywords.join(' '), bodyText].join(' ').toLowerCase();
}

export interface SearchResult {
  article: HelpArticle;
  excerpt: string;
}

export function searchArticles(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];
  for (const article of HELP_ARTICLES) {
    const haystack = searchableText(article);
    if (haystack.includes(q)) {
      results.push({ article, excerpt: buildExcerpt(article, q) });
    }
  }
  return results;
}

function buildExcerpt(article: HelpArticle, query: string): string {
  const blocks = article.body.filter(
    (b) => b.type === 'paragraph' || b.type === 'list',
  );
  const flat: string[] = [];
  for (const b of blocks) {
    if (b.type === 'paragraph') flat.push(b.text);
    else if (b.type === 'list') flat.push(b.items.join(' '));
  }
  const text = flat.join(' ');
  const idx = text.toLowerCase().indexOf(query);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + 80);
  const slice = (idx >= 0 ? text.slice(start, end) : text.slice(0, 120)).trim();
  return slice.length ? (idx >= 0 && start > 0 ? '…' : '') + slice + (end < text.length ? '…' : '') : article.excerpt;
}