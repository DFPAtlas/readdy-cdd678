import { getSupabaseClient } from '@/services/supabaseClient';
import { defaultTheme, type ThemeDefinition } from './sandboxTheme';
import { sandboxProjectId, projectStorageKey } from './sandboxProjectScope';

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
  projectId?: string;
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
    status: 'draft',
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
      projectName: raw.projectName ?? 'Untitled website',
      projectId: raw.projectId,
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
   Supabase client — delegates to the canonical app singleton so
   every module (billing, sandbox, projects, storage, auth) shares
   ONE Supabase Auth session and ONE storage key. This is what
   makes multi-tab account switching and sign-out propagate
   correctly, and prevents a second client from stale-reading a
   previous authenticated identity.
   ────────────────────────────────────────────────────────────── */

export function getSandboxClient() {
  return getSupabaseClient();
}

export type ResolvedSandboxProject = {
  userId: string;
  email?: string;
  workspaceId: string;
  projectId: string;
  projectName: string;
};

/** Read-only lookup. Supabase RLS remains the authority for project access. */
export async function resolveSandboxProject(
  requestedProjectId = sandboxProjectId(),
): Promise<ResolvedSandboxProject | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !requestedProjectId) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;
  const { data, error } = await supabase.from('projects')
    .select('id, name, workspace_id').eq('id', requestedProjectId).maybeSingle();
  if (error) throw error;
  if (!data || data.id !== requestedProjectId || !data.workspace_id) return null;
  return {
    userId: authData.user.id, email: authData.user.email,
    workspaceId: data.workspace_id, projectId: data.id, projectName: data.name,
  };
}

export async function loadSandboxDocument(
  requestedProjectId = sandboxProjectId(),
): Promise<SandboxDocument> {
  const project = await resolveSandboxProject(requestedProjectId);
  const supabase = getSupabaseClient();
  if (!project || !supabase) throw new Error('Project unavailable or access denied');
  const { data, error } = await supabase.from('projects')
    .select('blueprint').eq('id', project.projectId)
    .eq('workspace_id', project.workspaceId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project unavailable or access denied');
  const cloud = data.blueprint == null ? createBlankDocument(project.projectName) : normalizeDocument(data.blueprint);
  if (!cloud) throw new Error('This project document needs recovery before editing');
  if (cloud.projectId && cloud.projectId !== project.projectId) throw new Error('Project document identity mismatch');
  const key = projectStorageKey(project.userId, project.projectId, 'document');
  let local: SandboxDocument | null = null;
  try {
    const raw = window.localStorage.getItem(key);
    local = raw ? normalizeDocument(JSON.parse(raw)) : null;
  } catch { /* Browser storage is optional when loading from cloud. */ }
  if (local?.projectId !== project.projectId) local = null;
  const selected = local && Date.parse(local.updatedAt) > Date.parse(cloud.updatedAt) ? local : cloud;
  return { ...selected, projectId: project.projectId, projectName: project.projectName };
}

export async function saveSandboxDocument(
  document: SandboxDocument,
  requestedProjectId = sandboxProjectId(),
): Promise<SaveResult> {
  if (!requestedProjectId || document.projectId !== requestedProjectId) {
    throw new Error('Project changed; reopen it before saving');
  }
  const project = await resolveSandboxProject(requestedProjectId);
  const supabase = getSupabaseClient();
  if (!project || !supabase) throw new Error('Project unavailable or access denied');
  const key = projectStorageKey(project.userId, project.projectId, 'document');
  // A local failure must not prevent a valid cloud save; a cloud failure is surfaced.
  try { window.localStorage.setItem(key, JSON.stringify(document)); } catch { /* Cloud save can still succeed. */ }
  const { data, error } = await supabase.from('projects')
    .update({ blueprint: document, updated_at: document.updatedAt })
    .eq('id', project.projectId).eq('workspace_id', project.workspaceId)
    .select('id').maybeSingle();
  if (error) throw error;
  if (!data || data.id !== project.projectId) throw new Error('Project was not saved; access may have changed');
  return { storage: 'cloud', projectId: project.projectId };
}
