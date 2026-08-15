import type {
  CanvasElement,
  CanvasElementKind,
  ElementLink,
  NavigationItem,
  SandboxPage,
} from './sandboxPersistence';
import { defaultPageAdvanced, defaultPageSeo, defaultFormDefinition } from './sandboxPersistence';

export type PageType =
  | 'blank'
  | 'standard'
  | 'landing'
  | 'contact'
  | 'about'
  | 'services'
  | 'pricing'
  | 'blog'
  | 'legal'
  | 'notfound';

export type PageTypeMeta = {
  type: PageType;
  label: string;
  description: string;
};

export const PAGE_TYPES: PageTypeMeta[] = [
  { type: 'blank', label: 'Blank', description: 'Start with an empty canvas' },
  { type: 'standard', label: 'Standard content page', description: 'Heading, text and a CTA' },
  { type: 'landing', label: 'Landing page', description: 'Hero, features and call to action' },
  { type: 'contact', label: 'Contact page', description: 'Form and contact details' },
  { type: 'about', label: 'About page', description: 'Story, image and values' },
  { type: 'services', label: 'Services page', description: 'Service cards and CTA' },
  { type: 'pricing', label: 'Pricing page', description: 'Pricing columns and CTA' },
  { type: 'blog', label: 'Blog index', description: 'Article list layout' },
  { type: 'legal', label: 'Legal page', description: 'Long-form text container' },
  { type: 'notfound', label: '404 page', description: 'Not-found message' },
];

export const RESERVED_ROUTES = [
  '/admin', '/login', '/signup', '/sign-in', '/api', '/preview', '/dashboard',
  '/projects', '/settings', '/sandbox', '/assets', '/builds', '/exports',
  '/activity', '/onboarding', '/setup', '/help', '/templates',
];

/* ──────────────────────────────────────────────────────────────
   Slug helpers
   ────────────────────────────────────────────────────────────── */

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/${base}`;
}

export type SlugCheck = { ok: boolean; error?: string; suggestion?: string };

export function validateSlug(raw: string, existingSlugs: string[], excludeSlug?: string): SlugCheck {
  let slug = raw.trim();
  if (slug && !slug.startsWith('/')) slug = `/${slug}`;

  if (!slug) return { ok: false, error: 'Slug is required' };
  if (slug === '/') return { ok: true };

  if (/\/{2,}/.test(slug)) return { ok: false, error: 'Consecutive slashes are not allowed' };
  if (slug.length > 1 && slug.endsWith('/')) return { ok: false, error: 'Remove the trailing slash' };
  if (/[^a-z0-9/-]/.test(slug)) return { ok: false, error: 'Use lowercase letters, numbers and hyphens only' };
  if (RESERVED_ROUTES.includes(slug)) return { ok: false, error: 'This route is reserved by Forge' };

  const conflict = existingSlugs.some((entry) => entry !== excludeSlug && entry === slug);
  if (conflict) {
    return { ok: false, error: 'This slug already exists', suggestion: suggestSlug(slug, existingSlugs) };
  }
  return { ok: true };
}

export function suggestSlug(slug: string, existingSlugs: string[]): string {
  const base = slug === '/' ? '/page' : slug.replace(/\/+$/, '');
  let index = 2;
  let candidate = base;
  while (existingSlugs.includes(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

export function allSlugs(pages: SandboxPage[]): string[] {
  return pages.map((page) => page.slug);
}

/* ──────────────────────────────────────────────────────────────
   Element builders (used by templates and AI)
   ────────────────────────────────────────────────────────────── */

type ElementSeed = {
  type: CanvasElementKind;
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background?: string;
  color?: string;
  link?: ElementLink;
};

const TEMPLATE_STYLES: Record<string, { background: string; color: string }> = {
  Heading: { background: 'transparent', color: '#111820' },
  Text: { background: 'transparent', color: '#424a52' },
  Button: { background: '#f5a400', color: '#101820' },
  Image: { background: '#ffe6b8', color: '#9a5b00' },
  Video: { background: '#151d26', color: '#ffffff' },
  Container: { background: '#f7f8fa', color: '#59626b' },
  Columns: { background: '#ffffff', color: '#59626b' },
  Form: { background: '#ffffff', color: '#111820' },
  Document: { background: '#f7f8fa', color: '#59626b' },
};

export function buildTemplateElement(seed: ElementSeed): CanvasElement {
  const style = TEMPLATE_STYLES[seed.type] ?? { background: 'transparent', color: '#111820' };
  return {
    id: `${seed.type.toLowerCase()}-${crypto.randomUUID()}`,
    type: seed.type,
    name: seed.name,
    content: seed.content,
    x: seed.x,
    y: seed.y,
    width: seed.width,
    height: seed.height,
    background: seed.background ?? style.background,
    color: seed.color ?? style.color,
    ...(seed.link ? { link: seed.link } : {}),
    ...(seed.type === 'Form' ? { form: defaultFormDefinition(seed.content || seed.name) } : {}),
  };
}

/* ──────────────────────────────────────────────────────────────
   Page templates
   ────────────────────────────────────────────────────────────── */

function templateHeading(content: string, x: number, y: number, width = 460): CanvasElement {
  return buildTemplateElement({ type: 'Heading', name: 'Heading', content, x, y, width, height: 66 });
}

function templateText(content: string, x: number, y: number, width = 420): CanvasElement {
  return buildTemplateElement({ type: 'Text', name: 'Text', content, x, y, width, height: 72 });
}

function templateButton(content: string, x: number, y: number): CanvasElement {
  return buildTemplateElement({ type: 'Button', name: 'Button', content, x, y, width: 170, height: 46 });
}

function templateForm(content: string, x: number, y: number): CanvasElement {
  return buildTemplateElement({ type: 'Form', name: 'Form', content, x, y, width: 340, height: 220 });
}

function templateColumns(content: string, x: number, y: number): CanvasElement {
  return buildTemplateElement({ type: 'Columns', name: 'Columns', content, x, y, width: 440, height: 160 });
}

function templateContainer(content: string, x: number, y: number): CanvasElement {
  return buildTemplateElement({ type: 'Container', name: 'Container', content, x, y, width: 420, height: 180 });
}

function templateImage(content: string, x: number, y: number): CanvasElement {
  return buildTemplateElement({ type: 'Image', name: 'Image', content, x, y, width: 280, height: 180 });
}

export function pageTemplateElements(type: PageType): CanvasElement[] {
  switch (type) {
    case 'blank':
      return [];
    case 'standard':
      return [
        templateHeading('Your page title', 60, 110),
        templateText('Introduce this page with a clear, helpful opening paragraph that tells visitors what to expect.', 60, 190),
        templateButton('Get started', 60, 290),
      ];
    case 'landing':
      return [
        templateHeading('Build something great', 60, 100),
        templateText('A focused landing page with a compelling headline, supporting copy and a single clear call to action.', 60, 180),
        templateButton('Start now', 60, 280),
        templateColumns('Feature highlights', 60, 360),
      ];
    case 'contact':
      return [
        templateHeading('Get in touch', 60, 100),
        templateText('Tell us a little about your project and we will get back to you shortly.', 60, 180),
        templateForm('Contact form', 60, 290),
        templateContainer('Contact details', 430, 290),
      ];
    case 'about':
      return [
        templateHeading('Our story', 60, 100),
        templateText('A short narrative about who we are, why we started and what drives the team every day.', 60, 180),
        templateImage('Team image', 60, 280),
        templateColumns('Our values', 370, 280),
      ];
    case 'services':
      return [
        templateHeading('What we do', 60, 100),
        templateText('Explore the range of services we offer, designed to help you move faster and ship with confidence.', 60, 180),
        templateColumns('Service cards', 60, 280),
        templateButton('Request a quote', 60, 470),
      ];
    case 'pricing':
      return [
        templateHeading('Simple pricing', 60, 100),
        templateText('Choose the plan that fits your needs. Every plan includes a free trial and no hidden fees.', 60, 180),
        templateColumns('Pricing tiers', 60, 280),
        templateButton('Choose a plan', 60, 470),
      ];
    case 'blog':
      return [
        templateHeading('Blog', 60, 100),
        templateText('Insights, guides and updates from the team, published regularly.', 60, 180),
        templateColumns('Latest posts', 60, 280),
      ];
    case 'legal':
      return [
        templateHeading('Terms & conditions', 60, 100),
        templateText('Last updated: ' + new Date().toISOString().slice(0, 10), 60, 180),
        templateContainer('Long-form legal text', 60, 270),
      ];
    case 'notfound':
      return [
        templateHeading('404 — page not found', 60, 120),
        templateText('The page you are looking for does not exist or has been moved.', 60, 210),
        templateButton('Back to home', 60, 320),
      ];
    default:
      return [];
  }
}

export function makeNewPage(name: string, slug: string, type: PageType, projectName: string): SandboxPage {
  const now = new Date().toISOString();
  const isHome = slug === '/';
  return {
    id: crypto.randomUUID(),
    name,
    slug,
    isHome,
    status: 'draft',
    showInNavigation: true,
    navigationLabel: name,
    elements: pageTemplateElements(type),
    seo: { ...defaultPageSeo(projectName), title: name },
    advanced: defaultPageAdvanced(),
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicatePage(source: SandboxPage): SandboxPage {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: `${source.name} Copy`,
    slug: source.slug,
    isHome: false,
    status: 'draft',
    showInNavigation: source.showInNavigation,
    navigationLabel: `${source.navigationLabel} Copy`,
    elements: source.elements.map((element) => ({ ...element, id: `${element.type.toLowerCase()}-${crypto.randomUUID()}` })),
    seo: { ...source.seo, title: `${source.seo.title} Copy` },
    advanced: { ...source.advanced },
    createdAt: now,
    updatedAt: now,
  };
}

/* ──────────────────────────────────────────────────────────────
   Navigation helpers
   ────────────────────────────────────────────────────────────── */

export function makeNavigationItem(partial: Partial<NavigationItem> = {}): NavigationItem {
  return {
    id: crypto.randomUUID(),
    label: 'New link',
    type: 'page',
    pageId: null,
    url: '',
    anchor: '',
    newTab: false,
    isButton: false,
    ...partial,
  };
}

export function navigationItemForPage(page: SandboxPage): NavigationItem {
  return makeNavigationItem({
    label: page.navigationLabel || page.name,
    type: 'page',
    pageId: page.id,
  });
}

/* ──────────────────────────────────────────────────────────────
   Link validation
   ────────────────────────────────────────────────────────────── */

export function validateLink(link: ElementLink, pages: SandboxPage[]): { ok: boolean; error?: string } {
  if (link.type === 'none') return { ok: true };
  if (link.type === 'page') {
    if (!link.pageId) return { ok: false, error: 'Choose a destination page' };
    if (!pages.some((page) => page.id === link.pageId)) return { ok: false, error: 'The linked page no longer exists' };
    return { ok: true };
  }
  if (link.type === 'section') {
    if (!link.sectionId) return { ok: false, error: 'Choose a section' };
    return { ok: true };
  }
  if (link.type === 'external') {
    if (!/^https?:\/\//i.test(link.url)) return { ok: false, error: 'Enter a full URL starting with http(s)://' };
    return { ok: true };
  }
  if (link.type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.url)) return { ok: false, error: 'Enter a valid email address' };
    return { ok: true };
  }
  if (link.type === 'tel') {
    if (!/^\+?[0-9\s()-]{4,}$/.test(link.url)) return { ok: false, error: 'Enter a valid phone number' };
    return { ok: true };
  }
  if (link.type === 'file') {
    if (!link.url) return { ok: false, error: 'Enter a file URL' };
    return { ok: true };
  }
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────
   Incoming-link detection
   ────────────────────────────────────────────────────────────── */

export function countIncomingLinks(pageId: string, pages: SandboxPage[], navigation: NavigationItem[]): number {
  let count = 0;
  pages.forEach((page) => {
    page.elements.forEach((element) => {
      if (element.link?.type === 'page' && element.link.pageId === pageId) count += 1;
      if (element.asset?.linkUrl === `page:${pageId}`) count += 1;
    });
  });
  navigation.forEach((item) => {
    if (item.type === 'page' && item.pageId === pageId) count += 1;
  });
  return count;
}