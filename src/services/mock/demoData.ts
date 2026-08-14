import type { User, Workspace, Project, SystemService, AgentDefinition, Build, BuildTask, ProjectVersion, ExportRecord, ProviderConnection, Notification, Asset } from '@/types';

// ============================================================
// DEMO USER
// ============================================================

export const demoUser: User = {
  id: 'user-001',
  email: 'martin@forge.dev',
  displayName: 'Martin Hewett',
  initials: 'MH',
  preferences: {
    theme: 'dark',
    sidebarCollapsed: false,
    fontSize: 'medium',
    reducedMotion: false,
    keyboardShortcutsEnabled: true,
  },
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-07-12T09:30:00Z',
};

// ============================================================
// DEMO WORKSPACE
// ============================================================

export const demoWorkspace: Workspace = {
  id: 'ws-001',
  name: 'Forge Workshop',
  slug: 'forge-workshop',
  description: 'Default development workspace',
  ownerId: 'user-001',
  memberCount: 1,
  projectCount: 5,
  settings: {
    defaultProvider: 'ollama',
    allowExternalModels: true,
    storageLimit: 10737418240,
  },
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-07-12T09:30:00Z',
};

// ============================================================
// DEMO PROJECTS (5 projects from P4 spec)
// ============================================================

export const demoProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Forge Product Website',
    slug: 'forge-product-website',
    description: 'Official marketing site and product showcase for the Forge platform',
    workspaceId: 'ws-001',
    status: 'active',
    blueprint: {
      name: 'SaaS Marketing',
      type: 'saas',
      pages: [
        { path: '/', title: 'Home', description: 'Hero, features, testimonials, pricing, CTA', sections: ['hero', 'features', 'testimonials', 'pricing', 'cta'] },
        { path: '/features', title: 'Features', description: 'Detailed feature breakdown', sections: ['feature-grid', 'comparison'] },
        { path: '/pricing', title: 'Pricing', description: 'Pricing plans', sections: ['pricing-cards', 'faq'] },
        { path: '/docs', title: 'Documentation', description: 'Developer documentation', sections: ['sidebar', 'content'] },
        { path: '/contact', title: 'Contact', description: 'Contact form', sections: ['form', 'map'] },
      ],
      features: ['responsive', 'dark-mode', 'analytics', 'seo', 'i18n'],
      techStack: { framework: 'react', css: 'tailwind' },
    },
    settings: {
      framework: 'react',
      styling: 'tailwind',
      outputDir: 'dist',
      previewPort: 5173,
      autoSave: true,
      autoPreview: true,
      gitEnabled: true,
      environmentVariables: {},
    },
    stats: {
      fileCount: 38,
      assetCount: 22,
      buildCount: 12,
      versionCount: 6,
      lastBuiltAt: '2026-07-12T08:15:00Z',
      totalSizeBytes: 5242880,
    },
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-07-12T09:00:00Z',
  },
  {
    id: 'proj-002',
    name: 'QuickGuard Launch Site',
    slug: 'quickguard-launch',
    description: 'Marketplace launch page for the QuickGuard security monitoring service',
    workspaceId: 'ws-001',
    status: 'active',
    blueprint: {
      name: 'Marketplace Launch',
      type: 'ecommerce',
      pages: [
        { path: '/', title: 'Home', description: 'Hero, value props, plans, testimonials', sections: ['hero', 'value-props', 'plans', 'testimonials'] },
        { path: '/plans', title: 'Plans', description: 'Service plans comparison', sections: ['plan-comparison', 'faq'] },
        { path: '/about', title: 'About', description: 'Company story and team', sections: ['story', 'team'] },
      ],
      features: ['responsive', 'dark-mode', 'stripe-checkout', 'auth'],
      techStack: { framework: 'react', css: 'tailwind' },
    },
    settings: {
      framework: 'react',
      styling: 'tailwind',
      outputDir: 'dist',
      previewPort: 5174,
      autoSave: true,
      autoPreview: true,
      gitEnabled: false,
      environmentVariables: {},
    },
    stats: {
      fileCount: 26,
      assetCount: 15,
      buildCount: 8,
      versionCount: 4,
      lastBuiltAt: '2026-07-11T16:45:00Z',
      totalSizeBytes: 3670016,
    },
    createdAt: '2026-04-15T08:30:00Z',
    updatedAt: '2026-07-11T17:00:00Z',
  },
  {
    id: 'proj-003',
    name: 'Wedora Wedding Platform',
    slug: 'wedora-wedding',
    description: 'All-in-one wedding planning SaaS platform for couples and vendors',
    workspaceId: 'ws-001',
    status: 'building',
    blueprint: {
      name: 'Wedding SaaS',
      type: 'saas',
      pages: [
        { path: '/', title: 'Home', description: 'Hero, how it works, features, testimonials', sections: ['hero', 'how-it-works', 'features', 'testimonials'] },
        { path: '/planner', title: 'Planner', description: 'Wedding planning dashboard', sections: ['dashboard', 'checklist', 'budget'] },
        { path: '/vendors', title: 'Vendors', description: 'Vendor marketplace', sections: ['search', 'cards', 'profiles'] },
        { path: '/gallery', title: 'Gallery', description: 'Inspiration gallery', sections: ['masonry-grid', 'filters'] },
        { path: '/pricing', title: 'Pricing', description: 'Subscription plans', sections: ['pricing-table'] },
      ],
      features: ['responsive', 'auth', 'dashboard', 'payments', 'realtime', 'uploads'],
      techStack: { framework: 'react', css: 'tailwind', database: 'supabase' },
    },
    settings: {
      framework: 'react',
      styling: 'tailwind',
      outputDir: 'dist',
      previewPort: 5175,
      autoSave: true,
      autoPreview: true,
      gitEnabled: true,
      environmentVariables: {},
    },
    stats: {
      fileCount: 52,
      assetCount: 34,
      buildCount: 5,
      versionCount: 3,
      lastBuiltAt: '2026-07-12T07:30:00Z',
      totalSizeBytes: 8388608,
    },
    createdAt: '2026-05-20T13:00:00Z',
    updatedAt: '2026-07-12T08:00:00Z',
  },
  {
    id: 'proj-004',
    name: 'Homvia Home Improvement',
    slug: 'homvia-home',
    description: 'Marketplace connecting homeowners with verified contractors and renovation services',
    workspaceId: 'ws-001',
    status: 'draft',
    settings: {
      framework: 'react',
      styling: 'tailwind',
      outputDir: 'dist',
      previewPort: 5176,
      autoSave: true,
      autoPreview: false,
      gitEnabled: false,
      environmentVariables: {},
    },
    stats: {
      fileCount: 10,
      assetCount: 6,
      buildCount: 0,
      versionCount: 2,
      totalSizeBytes: 786432,
    },
    createdAt: '2026-06-28T09:00:00Z',
    updatedAt: '2026-07-08T14:00:00Z',
  },
  {
    id: 'proj-005',
    name: 'DataHarbour',
    slug: 'dataharbour',
    description: 'Business intelligence and data analytics platform for enterprise teams',
    workspaceId: 'ws-001',
    status: 'archived',
    blueprint: {
      name: 'Business Platform',
      type: 'saas',
      pages: [
        { path: '/', title: 'Home', description: 'Hero, features, integrations, enterprise', sections: ['hero', 'features', 'integrations', 'enterprise'] },
        { path: '/dashboard', title: 'Dashboard', description: 'Analytics dashboard', sections: ['charts', 'metrics', 'filters'] },
        { path: '/reports', title: 'Reports', description: 'Report builder', sections: ['builder', 'templates'] },
      ],
      features: ['responsive', 'auth', 'dashboard', 'charts', 'export'],
      techStack: { framework: 'react', css: 'tailwind', database: 'supabase' },
    },
    settings: {
      framework: 'react',
      styling: 'tailwind',
      outputDir: 'dist',
      previewPort: 5177,
      autoSave: true,
      autoPreview: false,
      gitEnabled: true,
      environmentVariables: {},
    },
    stats: {
      fileCount: 45,
      assetCount: 18,
      buildCount: 6,
      versionCount: 5,
      lastBuiltAt: '2026-06-15T11:00:00Z',
      totalSizeBytes: 5767168,
    },
    createdAt: '2026-02-10T07:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z',
  },
];

// ============================================================
// DEMO AGENTS
// ============================================================

export const demoAgents: AgentDefinition[] = [
  { id: 'agent-master', name: 'Master Agent', description: 'Orchestrates the entire build pipeline and coordinates sub-agents', type: 'builder', model: 'llama3.1', systemPrompt: 'You are the Master Agent for Forge. Coordinate tasks and manage the build pipeline.', tools: ['plan', 'delegate', 'review', 'approve'], isActive: true },
  { id: 'agent-planner', name: 'Project Planner', description: 'Analyses requirements and creates structured project plans', type: 'builder', model: 'llama3.1', systemPrompt: 'You are the Project Planner. Create structured project plans from user requirements.', tools: ['analyze', 'plan', 'estimate'], isActive: true },
  { id: 'agent-requirements', name: 'Requirements Agent', description: 'Refines user prompts into detailed technical requirements', type: 'builder', model: 'llama3.1', systemPrompt: 'You refine requirements into detailed technical specifications.', tools: ['parse', 'validate', 'refine'], isActive: true },
  { id: 'agent-ui-design', name: 'UI Design Agent', description: 'Generates layout designs, colour palettes, and component styles', type: 'builder', model: 'llama3.2-vision', systemPrompt: 'You design beautiful, accessible user interfaces.', tools: ['design', 'sketch', 'iterate'], isActive: true },
  { id: 'agent-ux', name: 'UX Agent', description: 'Ensures intuitive navigation, information architecture, and user flows', type: 'reviewer', model: 'llama3.1', systemPrompt: 'You review and improve user experience.', tools: ['audit', 'suggest', 'test'], isActive: true },
  { id: 'agent-frontend', name: 'Frontend Code Agent', description: 'Writes React, TypeScript, and Tailwind CSS production code', type: 'builder', model: 'codellama', systemPrompt: 'You write clean, performant frontend code.', tools: ['generate', 'edit', 'refactor'], isActive: true },
  { id: 'agent-content', name: 'Content Agent', description: 'Generates SEO-optimized copy, headlines, and marketing text', type: 'builder', model: 'llama3.1', systemPrompt: 'You write compelling, SEO-optimized content.', tools: ['write', 'optimize', 'translate'], isActive: true },
  { id: 'agent-image', name: 'Image Agent', description: 'Generates and edits images, icons, and visual assets', type: 'builder', model: 'stable-diffusion', systemPrompt: 'You generate high-quality visual assets.', tools: ['generate', 'edit', 'upscale'], isActive: true },
  { id: 'agent-accessibility', name: 'Accessibility Agent', description: 'Audits and ensures WCAG 2.1 AA compliance', type: 'reviewer', model: 'llama3.1', systemPrompt: 'You ensure web accessibility compliance.', tools: ['audit', 'report', 'fix'], isActive: true },
  { id: 'agent-seo', name: 'SEO Agent', description: 'Optimizes meta tags, structured data, and content for search engines', type: 'optimizer', model: 'llama3.1', systemPrompt: 'You optimize websites for search engines.', tools: ['analyze', 'optimize', 'validate'], isActive: true },
  { id: 'agent-qa', name: 'QA Agent', description: 'Runs automated tests and validates build output quality', type: 'reviewer', model: 'llama3.1', systemPrompt: 'You test and validate build quality.', tools: ['test', 'validate', 'report'], isActive: true },
  { id: 'agent-repair', name: 'Build Repair Agent', description: 'Diagnoses and fixes build failures automatically', type: 'optimizer', model: 'codellama', systemPrompt: 'You diagnose and repair build failures.', tools: ['diagnose', 'patch', 'verify'], isActive: true },
  { id: 'agent-visual', name: 'Visual Edit Agent', description: 'Handles visual editing commands on the live preview', type: 'builder', model: 'llama3.2-vision', systemPrompt: 'You execute visual editing operations.', tools: ['inspect', 'edit', 'preview'], isActive: true },
  { id: 'agent-export', name: 'Export Agent', description: 'Packages projects for deployment across multiple formats', type: 'deployer', model: 'llama3.1', systemPrompt: 'You manage project exports.', tools: ['package', 'validate', 'deploy'], isActive: true },
];

// ============================================================
// DEMO BUILDS (for Forge Product Website, proj-001)
// ============================================================

export const demoBuilds: Build[] = [
  {
    id: 'build-012',
    projectId: 'proj-001',
    version: 'v12',
    status: 'success',
    tasks: [],
    events: [],
    startedAt: '2026-07-12T07:45:00Z',
    completedAt: '2026-07-12T08:15:00Z',
    duration: 1800,
  },
  {
    id: 'build-011',
    projectId: 'proj-001',
    version: 'v11',
    status: 'success',
    tasks: [],
    events: [],
    startedAt: '2026-07-10T14:20:00Z',
    completedAt: '2026-07-10T14:48:00Z',
    duration: 1680,
  },
  {
    id: 'build-010',
    projectId: 'proj-001',
    version: 'v10',
    status: 'success',
    tasks: [],
    events: [],
    startedAt: '2026-07-08T09:10:00Z',
    completedAt: '2026-07-08T09:35:00Z',
    duration: 1500,
  },
  {
    id: 'build-009',
    projectId: 'proj-001',
    version: 'v9',
    status: 'failed',
    tasks: [],
    events: [],
    startedAt: '2026-07-07T16:00:00Z',
    completedAt: '2026-07-07T16:12:00Z',
    duration: 720,
  },
  {
    id: 'build-008',
    projectId: 'proj-001',
    version: 'v8',
    status: 'success',
    tasks: [],
    events: [],
    startedAt: '2026-07-05T11:30:00Z',
    completedAt: '2026-07-05T12:00:00Z',
    duration: 1800,
  },
  {
    id: 'build-007',
    projectId: 'proj-001',
    version: 'v7',
    status: 'cancelled',
    tasks: [],
    events: [],
    startedAt: '2026-07-04T10:00:00Z',
    completedAt: '2026-07-04T10:05:00Z',
    duration: 300,
  },
];

// Builds for proj-002 (QuickGuard)
export const demoBuildsQuickGuard: Build[] = [
  { id: 'qg-build-008', projectId: 'proj-002', version: 'v8', status: 'success', tasks: [], events: [], startedAt: '2026-07-11T16:00:00Z', completedAt: '2026-07-11T16:45:00Z', duration: 2700 },
  { id: 'qg-build-007', projectId: 'proj-002', version: 'v7', status: 'success', tasks: [], events: [], startedAt: '2026-07-09T09:00:00Z', completedAt: '2026-07-09T09:30:00Z', duration: 1800 },
  { id: 'qg-build-006', projectId: 'proj-002', version: 'v6', status: 'success', tasks: [], events: [], startedAt: '2026-07-06T13:00:00Z', completedAt: '2026-07-06T13:22:00Z', duration: 1320 },
];

// Builds for proj-003 (Wedora)
export const demoBuildsWedora: Build[] = [
  { id: 'wd-build-005', projectId: 'proj-003', version: 'v5', status: 'running', tasks: [], events: [], startedAt: '2026-07-12T07:00:00Z', duration: undefined },
  { id: 'wd-build-004', projectId: 'proj-003', version: 'v4', status: 'success', tasks: [], events: [], startedAt: '2026-07-10T15:00:00Z', completedAt: '2026-07-10T15:40:00Z', duration: 2400 },
  { id: 'wd-build-003', projectId: 'proj-003', version: 'v3', status: 'success', tasks: [], events: [], startedAt: '2026-07-08T10:00:00Z', completedAt: '2026-07-08T10:25:00Z', duration: 1500 },
];

// Builds for proj-005 (DataHarbour)
export const demoBuildsDataHarbour: Build[] = [
  { id: 'dh-build-006', projectId: 'proj-005', version: 'v6', status: 'success', tasks: [], events: [], startedAt: '2026-06-15T10:00:00Z', completedAt: '2026-06-15T11:00:00Z', duration: 3600 },
  { id: 'dh-build-005', projectId: 'proj-005', version: 'v5', status: 'success', tasks: [], events: [], startedAt: '2026-05-20T08:00:00Z', completedAt: '2026-05-20T08:35:00Z', duration: 2100 },
];

export function getBuildsForProject(projectId: string): Build[] {
  switch (projectId) {
    case 'proj-001': return demoBuilds;
    case 'proj-002': return demoBuildsQuickGuard;
    case 'proj-003': return demoBuildsWedora;
    case 'proj-005': return demoBuildsDataHarbour;
    default: return [];
  }
}

// ============================================================
// DEMO VERSIONS (for Forge Product Website, proj-001)
// ============================================================

export const demoVersions: ProjectVersion[] = [
  { id: 'ver-006', projectId: 'proj-001', label: 'v12 — Pricing page and docs', description: 'Added pricing comparison table and documentation pages', buildId: 'build-012', isCheckpoint: false, createdAt: '2026-07-12T08:15:00Z' },
  { id: 'ver-005', projectId: 'proj-001', label: 'v11 — Visual editor prototype', description: 'Integrated visual editing capabilities on the preview', buildId: 'build-011', isCheckpoint: true, createdAt: '2026-07-10T14:48:00Z' },
  { id: 'ver-004', projectId: 'proj-001', label: 'v10 — Master Agent panel', description: 'Added the retractable Master Agent chat panel to the sandbox', buildId: 'build-010', isCheckpoint: false, createdAt: '2026-07-08T09:35:00Z' },
  { id: 'ver-003', projectId: 'proj-001', label: 'v9 — Prompt editor', description: 'Built the working prompt panel with versioning and suggestions', buildId: 'build-009', isCheckpoint: false, createdAt: '2026-07-07T16:12:00Z' },
  { id: 'ver-002', projectId: 'proj-001', label: 'v8 — Dashboard layout', description: 'Completed dashboard with project cards and activity feed', buildId: 'build-008', isCheckpoint: false, createdAt: '2026-07-05T12:00:00Z' },
  { id: 'ver-001', projectId: 'proj-001', label: 'v7 — Hero build', description: 'Initial framework with hero section, navigation, and theme system', buildId: 'build-007', isCheckpoint: true, createdAt: '2026-07-04T10:00:00Z' },
];

// ============================================================
// DEMO EXPORTS (for Forge Product Website, proj-001)
// ============================================================

export const demoExports: ExportRecord[] = [
  { id: 'exp-004', projectId: 'proj-001', versionId: 'ver-006', format: 'zip', status: 'completed', fileSize: 2480000, downloadUrl: '#', createdAt: '2026-07-12T09:00:00Z', completedAt: '2026-07-12T09:02:00Z' },
  { id: 'exp-003', projectId: 'proj-001', versionId: 'ver-005', format: 'static', status: 'completed', fileSize: 1920000, downloadUrl: '#', createdAt: '2026-07-10T15:00:00Z', completedAt: '2026-07-10T15:01:00Z' },
  { id: 'exp-002', projectId: 'proj-001', versionId: 'ver-004', format: 'zip', status: 'failed', createdAt: '2026-07-09T11:00:00Z', completedAt: '2026-07-09T11:01:00Z' },
  { id: 'exp-001', projectId: 'proj-001', versionId: 'ver-003', format: 'zip', status: 'completed', fileSize: 1850000, downloadUrl: '#', createdAt: '2026-07-08T14:00:00Z', completedAt: '2026-07-08T14:01:00Z' },
];

// ============================================================
// DEMO ASSETS (for Forge Product Website, proj-001)
// ============================================================

export const demoProjectAssets: Asset[] = [
  { id: 'as-001', projectId: 'proj-001', name: 'forge-logo.svg', type: 'image', mimeType: 'image/svg+xml', size: 4800, url: '#', altText: 'Forge logo', createdAt: '2026-03-01T10:00:00Z' },
  { id: 'as-002', projectId: 'proj-001', name: 'hero-video.mp4', type: 'video', mimeType: 'video/mp4', size: 3145728, url: '#', altText: 'Hero background video', createdAt: '2026-03-02T11:00:00Z' },
  { id: 'as-003', projectId: 'proj-001', name: 'hero-poster.jpg', type: 'image', mimeType: 'image/jpeg', size: 245760, url: '#', altText: 'Hero poster image', createdAt: '2026-03-02T11:30:00Z' },
  { id: 'as-004', projectId: 'proj-001', name: 'dashboard-screenshot.png', type: 'image', mimeType: 'image/png', size: 512000, url: '#', altText: 'Dashboard screenshot', createdAt: '2026-07-05T12:30:00Z' },
  { id: 'as-005', projectId: 'proj-001', name: 'abstract-bg-generated.png', type: 'image', mimeType: 'image/png', size: 380000, url: '#', altText: 'Generated abstract background', createdAt: '2026-07-08T10:00:00Z' },
  { id: 'as-006', projectId: 'proj-001', name: 'icon-set.zip', type: 'other', mimeType: 'application/zip', size: 1024000, url: '#', altText: 'Icon set', createdAt: '2026-03-05T09:00:00Z' },
  { id: 'as-007', projectId: 'proj-001', name: 'brand-guide.pdf', type: 'document', mimeType: 'application/pdf', size: 2100000, url: '#', altText: 'Brand guide', createdAt: '2026-03-10T14:00:00Z' },
  { id: 'as-008', projectId: 'proj-001', name: 'project-thumbnail.jpg', type: 'image', mimeType: 'image/jpeg', size: 89000, url: '#', altText: 'Project thumbnail', createdAt: '2026-07-12T09:00:00Z' },
];

// ============================================================
// DEMO PROVIDERS
// ============================================================

export const demoProviders: ProviderConnection[] = [
  {
    id: 'prov-ollama',
    provider: 'ollama',
    label: 'Local Ollama',
    isLocal: true,
    baseUrl: 'http://localhost:11434',
    isConnected: true,
    models: [
      { id: 'ollama-llama3.1', name: 'llama3.1:8b', provider: 'ollama', isAvailable: true, contextWindow: 131072, capabilities: ['text', 'code', 'planning'] },
      { id: 'ollama-codellama', name: 'codellama:7b', provider: 'ollama', isAvailable: true, contextWindow: 16384, capabilities: ['code', 'generation'] },
      { id: 'ollama-llama3.2-vision', name: 'llama3.2-vision:11b', provider: 'ollama', isAvailable: true, contextWindow: 131072, capabilities: ['vision', 'design', 'ui'] },
    ],
    lastCheckedAt: '2026-07-12T09:00:00Z',
  },
  {
    id: 'prov-openai',
    provider: 'openai',
    label: 'OpenAI',
    isLocal: false,
    isConnected: true,
    models: [
      { id: 'openai-gpt4o', name: 'gpt-4o', provider: 'openai', isAvailable: true, contextWindow: 128000, capabilities: ['text', 'code', 'vision'] },
    ],
    lastCheckedAt: '2026-07-12T09:00:00Z',
  },
  {
    id: 'prov-anthropic',
    provider: 'anthropic',
    label: 'Anthropic',
    isLocal: false,
    isConnected: true,
    models: [
      { id: 'anthropic-sonnet', name: 'claude-sonnet-4-20250514', provider: 'anthropic', isAvailable: true, contextWindow: 200000, capabilities: ['text', 'code', 'vision'] },
    ],
    lastCheckedAt: '2026-07-12T09:00:00Z',
  },
  {
    id: 'prov-google',
    provider: 'google',
    label: 'Google',
    isLocal: false,
    isConnected: false,
    models: [
      { id: 'google-gemini', name: 'gemini-2.0-flash', provider: 'google', isAvailable: false, contextWindow: 1048576, capabilities: ['text', 'code', 'vision'] },
    ],
  },
  {
    id: 'prov-openrouter',
    provider: 'custom',
    label: 'OpenRouter',
    isLocal: false,
    isConnected: false,
    models: [],
  },
];

// ============================================================
// DEMO NOTIFICATIONS
// ============================================================

export const demoNotifications: Notification[] = [
  { id: 'notif-1', type: 'build', title: 'Build completed', message: 'Forge Product Website v12 build finished successfully', isRead: false, projectId: 'proj-001', createdAt: '2026-07-12T08:15:00Z' },
  { id: 'notif-2', type: 'warning', title: 'Build completed with warnings', message: 'QuickGuard Launch Site v8 — 2 accessibility warnings', isRead: false, projectId: 'proj-002', createdAt: '2026-07-11T16:45:00Z' },
  { id: 'notif-3', type: 'info', title: 'Preview ready', message: 'Forge Product Website preview is now available', isRead: false, projectId: 'proj-001', createdAt: '2026-07-12T08:16:00Z' },
  { id: 'notif-4', type: 'info', title: 'Build started', message: 'Wedora Wedding Platform v5 build is now running', isRead: true, projectId: 'proj-003', createdAt: '2026-07-12T07:00:00Z' },
  { id: 'notif-5', type: 'warning', title: 'Storage warning', message: 'Workspace storage at 72% — consider cleaning up old exports', isRead: true, createdAt: '2026-07-11T10:00:00Z' },
  { id: 'notif-6', type: 'success', title: 'Export ready', message: 'Forge Product Website v12 ZIP export is ready for download', isRead: true, projectId: 'proj-001', createdAt: '2026-07-12T09:02:00Z' },
  { id: 'notif-7', type: 'error', title: 'Provider offline', message: 'Google provider connection failed — last check 2 hours ago', isRead: false, createdAt: '2026-07-12T07:30:00Z' },
];

// ============================================================
// DEMO ACTIVITY FEED
// ============================================================

export interface DemoActivityItem {
  id: string;
  type: 'build' | 'version' | 'export' | 'project' | 'asset' | 'system' | 'provider' | 'blueprint';
  action: string;
  projectName?: string;
  projectId?: string;
  user: string;
  timestamp: string;
  details?: string;
}

export const demoActivityFeed: DemoActivityItem[] = [
  { id: 'act-1', type: 'build', action: 'Build completed', projectName: 'Forge Product Website', projectId: 'proj-001', user: 'Master Agent', timestamp: '2026-07-12T08:15:00Z', details: 'v12 — Pricing page and docs' },
  { id: 'act-2', type: 'export', action: 'Export created', projectName: 'Forge Product Website', projectId: 'proj-001', user: 'Martin Hewett', timestamp: '2026-07-12T09:00:00Z', details: 'ZIP export — v12' },
  { id: 'act-3', type: 'build', action: 'Build completed with warnings', projectName: 'QuickGuard Launch Site', projectId: 'proj-002', user: 'Master Agent', timestamp: '2026-07-11T16:45:00Z', details: 'v8 — 2 accessibility warnings' },
  { id: 'act-4', type: 'blueprint', action: 'Blueprint approved', projectName: 'Wedora Wedding Platform', projectId: 'proj-003', user: 'Martin Hewett', timestamp: '2026-07-11T14:00:00Z', details: 'Approved SaaS blueprint with 5 pages' },
  { id: 'act-5', type: 'version', action: 'Version checkpoint created', projectName: 'Forge Product Website', projectId: 'proj-001', user: 'Martin Hewett', timestamp: '2026-07-10T14:48:00Z', details: 'Manual checkpoint before visual editor' },
  { id: 'act-6', type: 'project', action: 'Project created', projectName: 'Homvia Home Improvement', projectId: 'proj-004', user: 'Martin Hewett', timestamp: '2026-06-28T09:00:00Z' },
  { id: 'act-7', type: 'asset', action: 'Asset generated', projectName: 'Forge Product Website', projectId: 'proj-001', user: 'Image Agent', timestamp: '2026-07-08T10:00:00Z', details: 'Abstract background generated' },
  { id: 'act-8', type: 'provider', action: 'Provider tested', user: 'Martin Hewett', timestamp: '2026-07-12T09:00:00Z', details: 'Ollama — all 3 models available' },
  { id: 'act-9', type: 'system', action: 'System health check passed', user: 'System', timestamp: '2026-07-12T08:00:00Z', details: 'All 5 services online' },
  { id: 'act-10', type: 'project', action: 'Project archived', projectName: 'DataHarbour', projectId: 'proj-005', user: 'Martin Hewett', timestamp: '2026-06-20T10:00:00Z' },
  { id: 'act-11', type: 'build', action: 'Build failed then repaired', projectName: 'Forge Product Website', projectId: 'proj-001', user: 'Build Repair Agent', timestamp: '2026-07-07T16:15:00Z', details: 'Fixed missing asset reference' },
  { id: 'act-12', type: 'build', action: 'Build started', projectName: 'Wedora Wedding Platform', projectId: 'proj-003', user: 'Master Agent', timestamp: '2026-07-12T07:00:00Z', details: 'v5 — currently running' },
];

// ============================================================
// DEMO TEMPLATES
// ============================================================

export interface DemoTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  stack: string;
  responsive: boolean;
  accessible: boolean;
  pages: number;
  thumbnail: string;
}

export const demoTemplates: DemoTemplate[] = [
  { id: 'tpl-forge-launch', name: 'Forge Launch', description: 'Modern SaaS product launch landing page with dark theme and amber accents', category: 'SaaS', stack: 'React + Tailwind', responsive: true, accessible: true, pages: 5, thumbnail: 'https://readdy.ai/api/search-image?query=Modern%20dark%20SaaS%20landing%20page%20with%20warm%20amber%20orange%20accents%2C%20clean%20minimal%20design%2C%20hero%20section%20with%20CTA%2C%20dark%20theme%20website%20mockup&width=600&height=400&seq=tpl-forge-launch&orientation=landscape' },
  { id: 'tpl-local-service', name: 'Modern Local Service', description: 'Clean service business site with booking, reviews, and location pages', category: 'Business', stack: 'React + Tailwind', responsive: true, accessible: true, pages: 4, thumbnail: 'https://readdy.ai/api/search-image?query=Clean%20modern%20local%20business%20website%20design%20with%20service%20cards%2C%20contact%20form%2C%20review%20section%2C%20professional%20warm%20color%20palette&width=600&height=400&seq=tpl-local-svc&orientation=landscape' },
  { id: 'tpl-saas-product', name: 'SaaS Product', description: 'Full SaaS marketing site with features, pricing, docs, and blog', category: 'SaaS', stack: 'React + Tailwind', responsive: true, accessible: true, pages: 6, thumbnail: 'https://readdy.ai/api/search-image?query=Professional%20SaaS%20product%20website%20design%20with%20feature%20grid%2C%20pricing%20table%2C%20testimonials%2C%20modern%20tech%20company%20aesthetic&width=600&height=400&seq=tpl-saas&orientation=landscape' },
  { id: 'tpl-portfolio', name: 'Creative Portfolio', description: 'Portfolio site with project gallery, case studies, and about page', category: 'Portfolio', stack: 'React + Tailwind', responsive: true, accessible: true, pages: 3, thumbnail: 'https://readdy.ai/api/search-image?query=Creative%20designer%20portfolio%20website%20with%20project%20grid%20gallery%2C%20dark%20theme%2C%20elegant%20typography%2C%20minimal%20clean%20layout&width=600&height=400&seq=tpl-portfolio&orientation=landscape' },
  { id: 'tpl-marketplace', name: 'Marketplace Starter', description: 'Two-sided marketplace with listings, search, profiles, and checkout', category: 'Marketplace', stack: 'React + Tailwind + Supabase', responsive: true, accessible: true, pages: 7, thumbnail: 'https://readdy.ai/api/search-image?query=Modern%20marketplace%20website%20with%20product%20cards%20grid%2C%20search%20filters%2C%20vendor%20profiles%2C%20clean%20ecommerce%20design&width=600&height=400&seq=tpl-marketplace&orientation=landscape' },
  { id: 'tpl-wedding', name: 'Wedding Planner', description: 'Wedding planning platform with checklist, vendor search, and gallery', category: 'Wedding', stack: 'React + Tailwind + Supabase', responsive: true, accessible: true, pages: 5, thumbnail: 'https://readdy.ai/api/search-image?query=Elegant%20wedding%20planning%20website%20design%20with%20soft%20romantic%20color%20palette%2C%20gallery%20grid%2C%20checklist%20interface%2C%20floral%20accents&width=600&height=400&seq=tpl-wedding&orientation=landscape' },
  { id: 'tpl-dashboard', name: 'Analytics Dashboard', description: 'Data analytics dashboard with charts, tables, and real-time widgets', category: 'Dashboard', stack: 'React + Tailwind + Recharts', responsive: true, accessible: false, pages: 2, thumbnail: 'https://readdy.ai/api/search-image?query=Modern%20dark%20analytics%20dashboard%20with%20charts%20widgets%20metrics%20cards%2C%20professional%20data%20visualization%20interface%20design&width=600&height=400&seq=tpl-dashboard&orientation=landscape' },
  { id: 'tpl-product-launch', name: 'Product Launch', description: 'Coming soon and product launch page with email capture and countdown', category: 'Landing Page', stack: 'React + Tailwind', responsive: true, accessible: true, pages: 1, thumbnail: 'https://readdy.ai/api/search-image?query=Modern%20product%20launch%20coming%20soon%20landing%20page%20with%20email%20signup%2C%20countdown%20timer%2C%20gradient%20dark%20background%2C%20sleek%20tech%20aesthetic&width=600&height=400&seq=tpl-launch&orientation=landscape' },
];

export const demoTemplateCategories = ['All', 'Business', 'SaaS', 'Portfolio', 'Marketplace', 'Wedding', 'Dashboard', 'Landing Page'];

// ============================================================
// SYSTEM SERVICES
// ============================================================

export function getServiceStatuses(): SystemService[] {
  return [
    { id: 'svc-forge-api', name: 'Forge API', status: 'online', latency: 12, version: '0.4.2', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-supabase-db', name: 'Supabase Database', status: 'online', latency: 28, version: '2.57.4', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-supabase-auth', name: 'Supabase Auth', status: 'online', latency: 34, version: '2.57.4', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-supabase-rt', name: 'Supabase Realtime', status: 'online', latency: 15, version: '2.57.4', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-supabase-storage', name: 'Supabase Storage', status: 'online', latency: 42, version: '2.57.4', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-n8n', name: 'n8n', status: 'online', latency: 8, version: '1.82.0', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-preview', name: 'Preview Manager', status: 'online', latency: 5, version: '0.2.0', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-ollama', name: 'Ollama', status: 'online', latency: 45, version: '0.5.7', lastCheckedAt: new Date().toISOString() },
    { id: 'svc-export', name: 'Export Worker', status: 'online', latency: 18, version: '0.1.5', lastCheckedAt: new Date().toISOString() },
  ];
}

// ============================================================
// DEMO FILES (for Forge Product Website)
// ============================================================

export interface DemoFileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: DemoFileNode[];
  content?: string;
}

export const demoFileTree: DemoFileNode = {
  id: 'root', name: 'forge-product-website', path: '', type: 'folder',
  children: [
    { id: 'f-public', name: 'public', path: 'public', type: 'folder', children: [
      { id: 'f-favicon', name: 'favicon.ico', path: 'public/favicon.ico', type: 'file' },
      { id: 'f-robots', name: 'robots.txt', path: 'public/robots.txt', type: 'file' },
    ]},
    { id: 'f-src', name: 'src', path: 'src', type: 'folder', children: [
      { id: 'f-components', name: 'components', path: 'src/components', type: 'folder', children: [
        { id: 'f-hero', name: 'Hero.tsx', path: 'src/components/Hero.tsx', type: 'file', content: DEMO_HERO_FILE },
        { id: 'f-nav', name: 'Navigation.tsx', path: 'src/components/Navigation.tsx', type: 'file' },
        { id: 'f-footer', name: 'Footer.tsx', path: 'src/components/Footer.tsx', type: 'file' },
        { id: 'f-features', name: 'Features.tsx', path: 'src/components/Features.tsx', type: 'file' },
        { id: 'f-pricing', name: 'Pricing.tsx', path: 'src/components/Pricing.tsx', type: 'file' },
        { id: 'f-testimonials', name: 'Testimonials.tsx', path: 'src/components/Testimonials.tsx', type: 'file' },
      ]},
      { id: 'f-pages', name: 'pages', path: 'src/pages', type: 'folder', children: [
        { id: 'f-home', name: 'Home.tsx', path: 'src/pages/Home.tsx', type: 'file' },
        { id: 'f-features-page', name: 'Features.tsx', path: 'src/pages/Features.tsx', type: 'file' },
        { id: 'f-pricing-page', name: 'Pricing.tsx', path: 'src/pages/Pricing.tsx', type: 'file' },
        { id: 'f-docs', name: 'Docs.tsx', path: 'src/pages/Docs.tsx', type: 'file' },
        { id: 'f-contact', name: 'Contact.tsx', path: 'src/pages/Contact.tsx', type: 'file' },
      ]},
      { id: 'f-hooks', name: 'hooks', path: 'src/hooks', type: 'folder', children: [
        { id: 'f-useTheme', name: 'useTheme.ts', path: 'src/hooks/useTheme.ts', type: 'file' },
      ]},
      { id: 'f-styles', name: 'styles', path: 'src/styles', type: 'folder', children: [
        { id: 'f-globals', name: 'globals.css', path: 'src/styles/globals.css', type: 'file' },
      ]},
      { id: 'f-app', name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      { id: 'f-main', name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
    ]},
    { id: 'f-pkg', name: 'package.json', path: 'package.json', type: 'file' },
    { id: 'f-vite-config', name: 'vite.config.ts', path: 'vite.config.ts', type: 'file' },
    { id: 'f-tailwind', name: 'tailwind.config.ts', path: 'tailwind.config.ts', type: 'file' },
    { id: 'f-readme', name: 'README.md', path: 'README.md', type: 'file' },
  ],
};

export const DEMO_HERO_FILE = `import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background-950 via-background-900 to-background-950" />

      {/* Animated grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Now in public beta
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Build websites with
          <span className="text-amber-400"> AI precision</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-foreground-400 max-w-2xl mx-auto mb-8"
        >
          Forge combines local AI models with an intuitive visual workspace to help you plan, build, and deploy professional websites — all from your machine.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors flex items-center gap-2">
            Start Building
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="px-8 py-3 border border-foreground-700 hover:border-foreground-500 text-white rounded-lg transition-colors">
            View Documentation
          </button>
        </motion.div>
      </div>
    </section>
  );
}`;