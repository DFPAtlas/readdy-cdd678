import { safeDelay } from './apiClient';

// --- Demo Messages ---

export interface DemoMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  type: 'text' | 'plan' | 'progress' | 'result';
  timestamp: string;
  planSteps?: { text: string; status: 'pending' | 'active' | 'completed'; }[];
}

export const demoMessages: DemoMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Create a modern portfolio homepage with a dark theme and orange accents.',
    type: 'text',
    timestamp: '10:24 AM',
  },
  {
    id: 'msg-2',
    role: 'agent',
    content: "I'll create a modern portfolio homepage with a dark theme and orange accents.",
    type: 'text',
    timestamp: '10:24 AM',
  },
  {
    id: 'msg-3',
    role: 'agent',
    content: '',
    type: 'plan',
    timestamp: '10:24 AM',
    planSteps: [
      { text: 'Create hero section', status: 'completed' },
      { text: 'Add about section', status: 'completed' },
      { text: 'Add projects grid', status: 'active' },
      { text: 'Add skills section', status: 'pending' },
      { text: 'Add contact section', status: 'pending' },
      { text: 'Add animations', status: 'pending' },
      { text: 'Ensure responsive design', status: 'pending' },
    ],
  },
  {
    id: 'msg-4',
    role: 'agent',
    content: "I've created the hero section with a strong headline, call-to-actions, and a code preview element. The dark theme with orange accents is now applied across the layout.",
    type: 'progress',
    timestamp: '10:25 AM',
  },
];

// --- Demo Build Tasks ---

export interface DemoBuildTask {
  id: string;
  name: string;
  agent: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
}

export const demoBuildTasks: DemoBuildTask[] = [
  { id: 'bt-1', name: 'Create hero section', agent: 'UI Builder', status: 'completed', progress: 100 },
  { id: 'bt-2', name: 'Add navigation component', agent: 'UI Builder', status: 'completed', progress: 100 },
  { id: 'bt-3', name: 'Implement responsive layout', agent: 'Layout Agent', status: 'running', progress: 62 },
  { id: 'bt-4', name: 'Add animations and transitions', agent: 'Motion Agent', status: 'queued', progress: 0 },
  { id: 'bt-5', name: 'Optimize performance', agent: 'Performance Agent', status: 'queued', progress: 0 },
];

// --- Demo Activity Events ---

export interface DemoActivityEvent {
  id: string;
  type: string;
  message: string;
  agent: string;
  timestamp: string;
}

export const demoActivityEvents: DemoActivityEvent[] = [
  { id: 'ae-1', type: 'agent-start', message: 'Master Agent started', agent: 'Master Agent', timestamp: '10:24:02 AM' },
  { id: 'ae-2', type: 'task-complete', message: 'UI Builder completed hero section', agent: 'UI Builder', timestamp: '10:24:18 AM' },
  { id: 'ae-3', type: 'task-complete', message: 'UI Builder completed navigation', agent: 'UI Builder', timestamp: '10:24:35 AM' },
  { id: 'ae-4', type: 'task-start', message: 'Layout Agent started responsive layout', agent: 'Layout Agent', timestamp: '10:25:01 AM' },
  { id: 'ae-5', type: 'tool-call', message: 'validation tool called', agent: 'QA Agent', timestamp: '10:25:12 AM' },
  { id: 'ae-6', type: 'preview', message: 'Preview ready at localhost:5173', agent: 'Preview Manager', timestamp: '10:25:15 AM' },
];

// --- Demo Logs ---

export interface DemoLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  timestamp: string;
}

export const demoLogs: DemoLog[] = [
  { id: 'lg-1', level: 'info', source: 'UI Builder', message: 'Created Hero component (src/components/Hero.tsx)', timestamp: '10:24:18' },
  { id: 'lg-2', level: 'info', source: 'UI Builder', message: 'Created Navigation component (src/components/Navigation.tsx)', timestamp: '10:24:35' },
  { id: 'lg-3', level: 'warn', source: 'Layout Agent', message: 'Viewport meta tag missing in index.html', timestamp: '10:25:05' },
  { id: 'lg-4', level: 'info', source: 'Layout Agent', message: 'Added responsive grid breakpoints', timestamp: '10:25:12' },
  { id: 'lg-5', level: 'error', source: 'Build System', message: 'Asset /images/hero-bg.jpg not found, using placeholder', timestamp: '10:25:14' },
];

// --- Demo Problems ---

export interface DemoProblem {
  id: string;
  severity: 'error' | 'warning';
  source: string;
  message: string;
}

export const demoProblems: DemoProblem[] = [
  { id: 'pr-1', severity: 'warning', source: 'Accessibility', message: 'Hero image missing alt text' },
  { id: 'pr-2', severity: 'error', source: 'Assets', message: 'Asset /images/hero-bg.jpg not found' },
];

// --- Demo Changes ---

export interface DemoChange {
  id: string;
  type: 'create' | 'modify' | 'delete';
  file: string;
  description: string;
}

export const demoChanges: DemoChange[] = [
  { id: 'ch-1', type: 'create', file: 'src/components/Hero.tsx', description: 'Added hero section with headline and CTAs' },
  { id: 'ch-2', type: 'create', file: 'src/components/Navigation.tsx', description: 'Added navigation bar' },
  { id: 'ch-3', type: 'create', file: 'src/components/FeaturedProjects.tsx', description: 'Added featured projects grid' },
  { id: 'ch-4', type: 'modify', file: 'src/index.css', description: 'Updated theme colors and typography' },
  { id: 'ch-5', type: 'modify', file: 'src/App.tsx', description: 'Registered new components' },
];

// --- Demo Console Messages ---

export interface DemoConsoleMsg {
  id: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

export const demoConsoleMessages: DemoConsoleMsg[] = [
  { id: 'cm-1', level: 'log', message: '[vite] connecting...' },
  { id: 'cm-2', level: 'log', message: '[vite] connected.' },
  { id: 'cm-3', level: 'warn', message: 'ResizeObserver loop completed with undelivered notifications.' },
  { id: 'cm-4', level: 'log', message: 'Forge Preview Manager v0.2.0 ready' },
];

// --- Demo Project Pages ---

export interface DemoPage {
  id: string;
  name: string;
  path: string;
  active: boolean;
}

export const demoPages: DemoPage[] = [
  { id: 'page-home', name: 'Home', path: '/', active: true },
  { id: 'page-about', name: 'About', path: '/about', active: false },
  { id: 'page-projects', name: 'Projects', path: '/projects', active: false },
  { id: 'page-skills', name: 'Skills', path: '/skills', active: false },
  { id: 'page-contact', name: 'Contact', path: '/contact', active: false },
];

// --- Demo Sections ---

export interface DemoSection {
  id: string;
  name: string;
  type: string;
}

export const demoSections: DemoSection[] = [
  { id: 'sec-hero', name: 'Hero', type: 'hero' },
  { id: 'sec-about', name: 'About', type: 'about' },
  { id: 'sec-features', name: 'Features', type: 'features' },
  { id: 'sec-projects', name: 'Projects', type: 'projects' },
  { id: 'sec-testimonials', name: 'Testimonials', type: 'testimonials' },
  { id: 'sec-faq', name: 'FAQ', type: 'faq' },
  { id: 'sec-footer', name: 'Footer', type: 'footer' },
];

// --- Demo Components ---

export interface DemoComponent {
  id: string;
  name: string;
  file: string;
  reusable: boolean;
}

export const demoComponents: DemoComponent[] = [
  { id: 'comp-hero', name: 'Hero', file: 'src/components/Hero.tsx', reusable: true },
  { id: 'comp-nav', name: 'Navigation', file: 'src/components/Navigation.tsx', reusable: true },
  { id: 'comp-button', name: 'Button', file: 'src/components/Button.tsx', reusable: true },
  { id: 'comp-card', name: 'ProjectCard', file: 'src/components/ProjectCard.tsx', reusable: true },
  { id: 'comp-footer', name: 'Footer', file: 'src/components/Footer.tsx', reusable: true },
];

// --- Demo Layers ---

export interface DemoLayer {
  id: string;
  name: string;
  type: string;
  children?: DemoLayer[];
  visible: boolean;
  locked: boolean;
}

export const demoLayers: DemoLayer[] = [
  {
    id: 'layer-root',
    name: 'Page',
    type: 'root',
    visible: true,
    locked: false,
    children: [
      { id: 'layer-nav', name: 'Navigation', type: 'component', visible: true, locked: false },
      {
        id: 'layer-hero',
        name: 'Hero Section',
        type: 'section',
        visible: true,
        locked: false,
        children: [
          { id: 'layer-hero-h1', name: 'Headline', type: 'text', visible: true, locked: false },
          { id: 'layer-hero-desc', name: 'Description', type: 'text', visible: true, locked: false },
          { id: 'layer-hero-cta', name: 'CTA Group', type: 'group', visible: true, locked: false },
          { id: 'layer-hero-code', name: 'Code Preview', type: 'component', visible: true, locked: false },
        ],
      },
      {
        id: 'layer-projects',
        name: 'Featured Projects',
        type: 'section',
        visible: true,
        locked: false,
        children: [
          { id: 'layer-proj-h2', name: 'Section Title', type: 'text', visible: true, locked: false },
          { id: 'layer-proj-grid', name: 'Project Grid', type: 'grid', visible: true, locked: false },
        ],
      },
      { id: 'layer-footer', name: 'Footer', type: 'section', visible: true, locked: false },
    ],
  },
];

// --- Demo Files ---

export interface DemoFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: DemoFile[];
}

export const demoFiles: DemoFile[] = [
  {
    id: 'f-root', name: 'src', path: 'src', type: 'folder',
    children: [
      {
        id: 'f-comp', name: 'components', path: 'src/components', type: 'folder',
        children: [
          { id: 'f-hero', name: 'Hero.tsx', path: 'src/components/Hero.tsx', type: 'file' },
          { id: 'f-nav', name: 'Navigation.tsx', path: 'src/components/Navigation.tsx', type: 'file' },
          { id: 'f-card', name: 'ProjectCard.tsx', path: 'src/components/ProjectCard.tsx', type: 'file' },
          { id: 'f-footer', name: 'Footer.tsx', path: 'src/components/Footer.tsx', type: 'file' },
        ],
      },
      { id: 'f-app', name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      { id: 'f-index', name: 'index.css', path: 'src/index.css', type: 'file' },
      { id: 'f-main', name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
    ],
  },
  { id: 'f-index-html', name: 'index.html', path: 'index.html', type: 'file' },
  { id: 'f-pkg', name: 'package.json', path: 'package.json', type: 'file' },
  { id: 'f-readme', name: 'README.md', path: 'README.md', type: 'file' },
];

// --- Demo Assets ---

export interface DemoAsset {
  id: string;
  name: string;
  type: string;
  size: string;
}

export const demoAssets: DemoAsset[] = [
  { id: 'as-1', name: 'hero-bg.jpg', type: 'image', size: '142 KB' },
  { id: 'as-2', name: 'profile-photo.jpg', type: 'image', size: '86 KB' },
  { id: 'as-3', name: 'project-taskflow.jpg', type: 'image', size: '198 KB' },
  { id: 'as-4', name: 'project-finance.jpg', type: 'image', size: '167 KB' },
  { id: 'as-5', name: 'project-travel.jpg', type: 'image', size: '203 KB' },
  { id: 'as-6', name: 'Inter-Regular.woff2', type: 'font', size: '112 KB' },
];

// --- Demo Preview Site Data ---

export const demoPreviewSite = {
  nav: {
    name: 'Devon Smith',
    links: ['Home', 'About', 'Projects', 'Skills', 'Contact'],
  },
  hero: {
    tagline: 'SOFTWARE DEVELOPER',
    headline: 'Building digital experiences that make an impact.',
    description: 'I design and build modern web applications with a focus on performance, accessibility, and exceptional user experience.',
    ctas: ['View My Work', 'Contact Me'],
    codeSnippet: [
      'const developer = {',
      "  name: 'Devon Smith',",
      "  skills: ['React', 'TypeScript', 'Node.js'],",
      "  passion: 'Building things for the web',",
      '};',
      '',
      'function createImpact() {',
      "  return 'Code + Design + Purpose';",
      '}',
      '',
      'createImpact();',
    ],
  },
  projects: [
    { id: 1, title: 'TaskFlow', category: 'PRODUCTIVITY', description: 'Manage tasks efficiently', image: 'https://readdy.ai/api/search-image?query=Modern%20task%20management%20dashboard%20dark%20UI%20with%20orange%20accents%2C%20clean%20minimal%20design%20interface&width=400&height=240&seq=proj-taskflow&orientation=landscape' },
    { id: 2, title: 'FinancePro', category: 'DASHBOARD', description: 'Analytics dashboard for modern teams', image: 'https://readdy.ai/api/search-image?query=Financial%20analytics%20dashboard%20dark%20mode%20with%20charts%20and%20graphs%2C%20modern%20minimal%20UI%20design&width=400&height=240&seq=proj-finance&orientation=landscape' },
    { id: 3, title: 'TravelDepth', category: 'TRAVEL', description: 'Explore places like never before', image: 'https://readdy.ai/api/search-image?query=Beautiful%20mountain%20landscape%20photography%20dramatic%20lighting%20lake%20reflection%20nature%20scenery&width=400&height=240&seq=proj-travel&orientation=landscape' },
  ],
};

// --- Build Simulation ---

const BUILD_STAGES = [
  { name: 'Planning', weight: 5 },
  { name: 'Creating tasks', weight: 8 },
  { name: 'Generating UI', weight: 25 },
  { name: 'Writing content', weight: 20 },
  { name: 'Preparing assets', weight: 10 },
  { name: 'Building', weight: 20 },
  { name: 'Testing', weight: 8 },
  { name: 'Starting preview', weight: 4 },
];

export function simulateBuild(onProgress: (p: number, stage: string) => void, onComplete: () => void, onCancel: () => void) {
  let stageIndex = 0;
  let cumulative = 0;
  let cancelled = false;

  const totalWeight = BUILD_STAGES.reduce((s, st) => s + st.weight, 0);

  function runStage() {
    if (cancelled) return;
    if (stageIndex >= BUILD_STAGES.length) {
      onProgress(100, 'Complete');
      onComplete();
      return;
    }
    const stage = BUILD_STAGES[stageIndex];
    onProgress(cumulative, stage.name);

    // Simulate stage time
    safeDelay(600 + Math.random() * 800).then(() => {
      if (cancelled) return;
      cumulative += (stage.weight / totalWeight) * 100;
      stageIndex++;
      runStage();
    });
  }

  runStage();

  return {
    cancel: () => {
      cancelled = true;
      onCancel();
    },
  };
}