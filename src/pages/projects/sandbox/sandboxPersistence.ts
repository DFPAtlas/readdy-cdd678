import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { defaultTheme, type ThemeDefinition } from './sandboxTheme';

export type CanvasElementKind =
  | 'Heading'
  | 'Text'
  | 'Button'
  | 'Image'
  | 'Video'
  | 'Container'
  | 'Columns'
  | 'Form'
  | 'Document';

export type CanvasAssetKind = 'image' | 'video' | 'document';

export type CanvasAssetRef = {
  assetId: string;
  url: string;
  name: string;
  mimeType: string;
  kind: CanvasAssetKind;
  altText: string;
  objectFit: 'cover' | 'contain' | 'fill';
  focalX: number;
  focalY: number;
  lockAspectRatio: boolean;
  borderRadius: number;
  opacity: number;
  linkUrl: string;
  linkNewTab: boolean;
  lazyLoad: boolean;
  decorative: boolean;
  poster: string;
  controls: boolean;
  muted: boolean;
  loop: boolean;
  autoplay: boolean;
  accessibleTitle: string;
};

export type ElementLinkType = 'none' | 'page' | 'section' | 'external' | 'email' | 'tel' | 'file';

export type ElementLink = {
  type: ElementLinkType;
  pageId: string;
  sectionId: string;
  url: string;
  newTab: boolean;
};

export type ComponentInstanceRef = {
  instanceId: string;
  componentId: string;
  variantId: string;
  overrides: Record<string, string>;
  detached: boolean;
};

/* ──────────────────────────────────────────────────────────────
   Form element model (schema v3)
   ────────────────────────────────────────────────────────────── */

export type FormFieldType =
  | 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select'
  | 'radio' | 'checkbox' | 'consent' | 'date' | 'time' | 'file' | 'hidden' | 'submit';

export const FORM_FIELD_TYPES: FormFieldType[] = [
  'text', 'email', 'tel', 'number', 'textarea', 'select',
  'radio', 'checkbox', 'consent', 'date', 'time', 'file', 'hidden', 'submit',
];

export const FORM_FIELD_LABELS: Record<FormFieldType, string> = {
  text: 'Text', email: 'Email', tel: 'Telephone', number: 'Number',
  textarea: 'Textarea', select: 'Select', radio: 'Radio group',
  checkbox: 'Checkbox group', consent: 'Consent checkbox', date: 'Date',
  time: 'Time', file: 'File upload', hidden: 'Hidden field', submit: 'Submit button',
};

export type FormField = {
  id: string;
  key: string;
  type: FormFieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  defaultValue: string;
  options: string[];
  validation: Record<string, unknown>;
  errorMessage: string;
  autocomplete: string;
  width: 'full' | 'half';
};

export type FormSuccessAction = 'message' | 'panel' | 'redirect' | 'external';

export type FormDefinition = {
  name: string;
  description: string;
  successAction: FormSuccessAction;
  successHeading: string;
  successMessage: string;
  submitLabel: string;
  loadingText: string;
  errorMessage: string;
  redirectUrl: string;
  notifyRecipients: string;
  notifySubject: string;
  honeypot: boolean;
  minTime: boolean;
  turnstile: boolean;
  retentionDays: number;
  privacyPolicyUrl: string;
  consentLabel: string;
  marketingConsentLabel: string;
  fields: FormField[];
};

export function defaultFormDefinition(name = 'Contact form'): FormDefinition {
  return {
    name,
    description: '',
    successAction: 'message',
    successHeading: 'Thank you',
    successMessage: 'Your submission has been received.',
    submitLabel: 'Submit',
    loadingText: 'Sending…',
    errorMessage: 'Something went wrong. Please try again.',
    redirectUrl: '',
    notifyRecipients: '',
    notifySubject: '',
    honeypot: true,
    minTime: true,
    turnstile: false,
    retentionDays: 365,
    privacyPolicyUrl: '',
    consentLabel: 'I agree to be contacted about this enquiry.',
    marketingConsentLabel: 'I would like to receive occasional updates.',
    fields: [
      { id: 'fld-name', key: 'name', type: 'text', label: 'Name', placeholder: 'Your name', helpText: '', required: true, defaultValue: '', options: [], validation: { maxLength: 200 }, errorMessage: 'Please enter your name.', autocomplete: 'name', width: 'full' },
      { id: 'fld-email', key: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', helpText: '', required: true, defaultValue: '', options: [], validation: {}, errorMessage: 'Enter a valid email.', autocomplete: 'email', width: 'full' },
      { id: 'fld-message', key: 'message', type: 'textarea', label: 'Message', placeholder: 'How can we help?', helpText: '', required: true, defaultValue: '', options: [], validation: { maxLength: 2000 }, errorMessage: 'Please enter a message.', autocomplete: 'off', width: 'full' },
      { id: 'fld-submit', key: 'submit', type: 'submit', label: 'Submit', placeholder: '', helpText: '', required: false, defaultValue: '', options: [], validation: {}, errorMessage: '', autocomplete: 'off', width: 'full' },
    ],
  };
}

export type CanvasElement = {
  id: string;
  type: CanvasElementKind;
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  color: string;
  asset?: CanvasAssetRef;
  link?: ElementLink;
  parentId?: string;
  hidden?: boolean;
  component?: ComponentInstanceRef;
  form?: FormDefinition;
};

/* ──────────────────────────────────────────────────────────────
   Multi-page model (schema v2)
   ────────────────────────────────────────────────────────────── */

export type PageStatus = 'draft' | 'published';

export type PageSeo = {
  title: string;
  metaDescription: string;
  socialTitle: string;
  socialDescription: string;
  socialImageAssetId: string;
  index: boolean;
  canonicalUrl: string;
};

export type PageAdvanced = {
  backgroundColor: string;
  bodyClass: string;
  hideGlobalHeader: boolean;
  hideGlobalFooter: boolean;
  passwordProtected: boolean;
  notes: string;
};

export type NavigationItem = {
  id: string;
  label: string;
  type: 'page' | 'external' | 'anchor';
  pageId: string | null;
  url: string;
  anchor: string;
  newTab: boolean;
  isButton: boolean;
};

export type SandboxPage = {
  id: string;
  name: string;
  slug: string;
  isHome: boolean;
  status: PageStatus;
  showInNavigation: boolean;
  navigationLabel: string;
  elements: CanvasElement[];
  seo: PageSeo;
  advanced: PageAdvanced;
  createdAt: string;
  updatedAt: string;
};

export type GlobalSections = {
  header: CanvasElement[];
  footer: CanvasElement[];
  navigation: NavigationItem[];
};

export type ComponentCategory =
  | 'Navigation' | 'Hero' | 'Content' | 'Features' | 'CTA' | 'Forms'
  | 'Testimonials' | 'Pricing' | 'Galleries' | 'Footers' | 'Custom';

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'Navigation', 'Hero', 'Content', 'Features', 'CTA', 'Forms',
  'Testimonials', 'Pricing', 'Galleries', 'Footers', 'Custom',
];

export type ComponentKind = 'component' | 'section';

export type ExposedPropertyType = 'text' | 'asset' | 'link' | 'color' | 'toggle';

export type ExposedPropertyTarget = 'content' | 'background' | 'color' | 'asset' | 'link' | 'visible';

export type ExposedProperty = {
  id: string;
  label: string;
  type: ExposedPropertyType;
  defaultValue: string;
  targetElementId: string;
  targetField: ExposedPropertyTarget;
  required: boolean;
};

export type ComponentVariant = {
  id: string;
  name: string;
  isDefault: boolean;
  overrides: Record<string, string>;
};

export type ComponentDefinition = {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  type: ComponentKind;
  elements: CanvasElement[];
  variants: ComponentVariant[];
  exposedProperties: ExposedProperty[];
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SandboxDocument = {
  schemaVersion: 4;
  projectName: string;
  activePageId: string;
  pages: SandboxPage[];
  globalSections: GlobalSections;
  components: ComponentDefinition[];
  componentOrder: string[];
  componentCategories: ComponentCategory[];
  theme: ThemeDefinition;
  viewport: 'desktop' | 'tablet' | 'mobile';
  updatedAt: string;
};

export type SaveResult = {
  storage: 'cloud' | 'local';
  projectId?: string;
};

const STORAGE_KEY = 'forge:sandbox:portfolio-website:v1';
const BACKUP_KEY = 'forge:sandbox:portfolio-website:backup:v1';

export function defaultPageSeo(projectName: string): PageSeo {
  return {
    title: projectName,
    metaDescription: '',
    socialTitle: '',
    socialDescription: '',
    socialImageAssetId: '',
    index: true,
    canonicalUrl: '',
  };
}

export function defaultPageAdvanced(): PageAdvanced {
  return {
    backgroundColor: '#ffffff',
    bodyClass: '',
    hideGlobalHeader: false,
    hideGlobalFooter: false,
    passwordProtected: false,
    notes: '',
  };
}

export function defaultGlobalSections(): GlobalSections {
  return { header: [], footer: [], navigation: [] };
}

function createHomePage(elements: CanvasElement[], projectName: string): SandboxPage {
  const now = new Date().toISOString();
  return {
    id: 'home-page-1',
    name: 'Home',
    slug: '/',
    isHome: true,
    status: 'published',
    showInNavigation: true,
    navigationLabel: 'Home',
    elements,
    seo: defaultPageSeo(projectName),
    advanced: defaultPageAdvanced(),
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyComponentLibrary(): { components: ComponentDefinition[]; componentOrder: string[]; componentCategories: ComponentCategory[] } {
  return { components: [], componentOrder: [], componentCategories: [...COMPONENT_CATEGORIES] };
}

export function createBlankDocument(projectName: string): SandboxDocument {
  const home = createHomePage([], projectName);
  return {
    schemaVersion: 4,
    projectName,
    activePageId: home.id,
    pages: [home],
    globalSections: defaultGlobalSections(),
    ...emptyComponentLibrary(),
    theme: defaultTheme(),
    viewport: 'desktop',
    updatedAt: new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────
   Migration (schema v1 → v2)
   ────────────────────────────────────────────────────────────── */

type LegacySandboxDocument = {
  schemaVersion: 1;
  projectName: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  elements: CanvasElement[];
  updatedAt: string;
};

function migrateLegacy(legacy: LegacySandboxDocument): SandboxDocument {
  const home = createHomePage(legacy.elements, legacy.projectName);
  return {
    schemaVersion: 4,
    projectName: legacy.projectName,
    activePageId: home.id,
    pages: [home],
    globalSections: defaultGlobalSections(),
    ...emptyComponentLibrary(),
    theme: defaultTheme(),
    viewport: legacy.viewport,
    updatedAt: legacy.updatedAt,
  };
}

function normalizeDocument(value: unknown): SandboxDocument | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<SandboxDocument> & Partial<LegacySandboxDocument> & { pages?: unknown; elements?: unknown };

  if (Array.isArray(raw.pages)) {
    const pages = raw.pages as SandboxPage[];
    if (!pages.length) return null;
    const activePageId = pages.some((page) => page.id === raw.activePageId) ? (raw.activePageId as string) : pages[0].id;
    const lib = emptyComponentLibrary();
    return {
      schemaVersion: 4,
      projectName: raw.projectName ?? 'Portfolio Website',
      activePageId,
      pages,
      globalSections: raw.globalSections ?? defaultGlobalSections(),
      components: (raw.components as ComponentDefinition[] | undefined) ?? lib.components,
      componentOrder: (raw.componentOrder as string[] | undefined) ?? lib.componentOrder,
      componentCategories: (raw.componentCategories as ComponentCategory[] | undefined) ?? lib.componentCategories,
      theme: raw.theme ?? defaultTheme(),
      viewport: raw.viewport ?? 'desktop',
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  }

  if (raw.schemaVersion === 1 && Array.isArray(raw.elements)) {
    return migrateLegacy(raw as LegacySandboxDocument);
  }

  return null;
}

/* ──────────────────────────────────────────────────────────────
   Supabase client (singleton)
   ────────────────────────────────────────────────────────────── */

let client: SupabaseClient | null | undefined;

function getClient() {
  if (client !== undefined) return client;

  const url = (import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string | undefined;
  const key = (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export function getSandboxClient() {
  return getClient();
}

export type ResolvedSandboxProject = {
  userId: string;
  email?: string;
  workspaceId: string;
  projectId: string;
};

export async function resolveSandboxProject(): Promise<ResolvedSandboxProject | null> {
  const supabase = getClient();
  if (!supabase) return null;
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return null;
    const workspaceId = await getOwnedWorkspaceId(supabase, authData.user.id, authData.user.email);

    const { data: existing, error: lookupError } = await supabase
      .from('projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('slug', 'portfolio-website')
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let projectId = existing?.id as string | undefined;
    if (!projectId) {
      const { data: created, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Portfolio Website',
          slug: 'portfolio-website',
          workspace_id: workspaceId,
          status: 'draft',
        })
        .select('id')
        .single();
      if (createError) throw createError;
      projectId = created.id as string;
    }

    return { userId: authData.user.id, email: authData.user.email, workspaceId, projectId };
  } catch {
    return null;
  }
}

function backupLegacyRaw(raw: unknown) {
  if (raw && typeof raw === 'object') {
    const version = (raw as { schemaVersion?: number }).schemaVersion;
    if (version === 1 || version === 2) {
      try { window.localStorage.setItem(BACKUP_KEY, JSON.stringify(raw)); } catch { /* backup best-effort */ }
    }
  }
}

function loadLocal(): SandboxDocument | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    backupLegacyRaw(parsed);
    return normalizeDocument(parsed);
  } catch {
    return null;
  }
}

function saveLocal(document: SandboxDocument) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}

async function getOwnedWorkspaceId(supabase: SupabaseClient, userId: string, email?: string) {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: email ?? null,
      display_name: email?.split('@')[0] ?? 'Forge user',
      initials: (email?.slice(0, 2) ?? 'FU').toUpperCase(),
    },
    { onConflict: 'id' },
  );
  if (profileError) throw profileError;

  const { data: existing, error: lookupError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from('workspaces')
    .insert({
      name: 'My Forge Workspace',
      slug: `forge-${userId}`,
      owner_id: userId,
      description: 'Created by the Forge visual sandbox',
    })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id as string;
}

async function loadCloud(supabase: SupabaseClient): Promise<SandboxDocument | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', authData.user.id)
    .limit(1);
  if (workspaceError || !workspaces?.[0]?.id) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('blueprint')
    .eq('workspace_id', workspaces[0].id)
    .eq('slug', 'portfolio-website')
    .limit(1)
    .maybeSingle();
  if (projectError || !project?.blueprint) return null;
  backupLegacyRaw(project.blueprint);
  return normalizeDocument(project.blueprint);
}

export async function loadSandboxDocument(): Promise<SandboxDocument | null> {
  const local = loadLocal();
  const supabase = getClient();
  if (!supabase) return local;

  try {
    const cloud = await loadCloud(supabase);
    if (!cloud) return local;
    if (!local || Date.parse(cloud.updatedAt) >= Date.parse(local.updatedAt)) {
      saveLocal(cloud);
      return cloud;
    }
  } catch {
    // Offline or unconfigured cloud storage must never block the editor.
  }
  return local;
}

export async function saveSandboxDocument(document: SandboxDocument): Promise<SaveResult> {
  saveLocal(document);
  window.localStorage.removeItem(BACKUP_KEY);
  const supabase = getClient();
  if (!supabase) return { storage: 'local' };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { storage: 'local' };

  const workspaceId = await getOwnedWorkspaceId(supabase, authData.user.id, authData.user.email);
  const { data: existing, error: lookupError } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('slug', 'portfolio-website')
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from('projects')
      .update({ blueprint: document, updated_at: document.updatedAt })
      .eq('id', existing.id);
    if (error) throw error;
    return { storage: 'cloud', projectId: existing.id as string };
  }

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({
      name: document.projectName,
      slug: 'portfolio-website',
      workspace_id: workspaceId,
      status: 'draft',
      blueprint: document,
    })
    .select('id')
    .single();
  if (createError) throw createError;
  return { storage: 'cloud', projectId: created.id as string };
}