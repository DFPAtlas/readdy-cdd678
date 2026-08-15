import { getSandboxClient, resolveSandboxProject, type SandboxDocument, type SandboxPage, type CanvasElement, type ComponentDefinition } from './sandboxPersistence';
import type { ThemeDefinition } from './sandboxTheme';

/* ──────────────────────────────────────────────────────────────
   Website templates, starter kits and the community library.

   A template is a versioned, checksummed manifest that wraps a
   SandboxDocument (the actual blueprint) plus author/licence/
   placeholder metadata. Packages are never executed — only the
   blueprint JSON is read. Imports are validated and scanned before
   preview or install.
   ────────────────────────────────────────────────────────────── */

export const TEMPLATE_SCHEMA_VERSION = 1;

export const FORGE_COMPATIBLE_VERSION = '1.x';

export type TemplateType = 'website' | 'page' | 'section' | 'component' | 'design_system';

export const TEMPLATE_TYPES: TemplateType[] = ['website', 'page', 'section', 'component', 'design_system'];

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  website: 'Complete website',
  page: 'Page template',
  section: 'Section',
  component: 'Component',
  design_system: 'Design system',
};

export type TemplateVisibility = 'private' | 'workspace' | 'unlisted' | 'community';

export const TEMPLATE_VISIBILITIES: TemplateVisibility[] = ['private', 'workspace', 'unlisted', 'community'];

export const TEMPLATE_VISIBILITY_LABELS: Record<TemplateVisibility, string> = {
  private: 'Private',
  workspace: 'Workspace',
  unlisted: 'Unlisted',
  community: 'Community',
};

export type ModerationStatus =
  | 'draft' | 'submitted' | 'automated_review' | 'manual_review'
  | 'approved' | 'changes_requested' | 'rejected' | 'suspended' | 'retired';

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  automated_review: 'Automated review',
  manual_review: 'Manual review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
  suspended: 'Suspended',
  retired: 'Retired',
};

export type LicenceKey = 'forge-community' | 'cc0' | 'cc-by' | 'cc-by-sa';

export const TEMPLATE_LICENCES: Record<LicenceKey, {
  name: string;
  permittedUse: string;
  modification: string;
  redistribution: string;
  attribution: string;
}> = {
  'forge-community': {
    name: 'Forge Community Licence',
    permittedUse: 'Free personal and commercial use within Forge.',
    modification: 'You may modify templates installed into your own projects.',
    redistribution: 'Redistribution only through the Forge community library.',
    attribution: 'Attribution is retained automatically in the template manifest.',
  },
  cc0: {
    name: 'CC0 — Public Domain',
    permittedUse: 'Free for any purpose, commercial or otherwise.',
    modification: 'Unrestricted modification.',
    redistribution: 'Unrestricted redistribution.',
    attribution: 'No attribution required.',
  },
  'cc-by': {
    name: 'CC BY 4.0 — Attribution',
    permittedUse: 'Free for any purpose with attribution.',
    modification: 'Modification allowed.',
    redistribution: 'Redistribution allowed.',
    attribution: 'You must credit the original creator.',
  },
  'cc-by-sa': {
    name: 'CC BY-SA 4.0 — ShareAlike',
    permittedUse: 'Free for any purpose with attribution.',
    modification: 'Modification allowed.',
    redistribution: 'Derivatives must use the same licence.',
    attribution: 'You must credit the original creator.',
  },
};

export type PlaceholderKind =
  | 'business_name' | 'logo' | 'tagline' | 'description'
  | 'contact_email' | 'contact_phone' | 'address'
  | 'service_list' | 'team_members' | 'testimonials'
  | 'social_links' | 'primary_cta' | 'image' | 'brand_colours';

export const PLACEHOLDER_KINDS: PlaceholderKind[] = [
  'business_name', 'logo', 'tagline', 'description', 'contact_email', 'contact_phone',
  'address', 'service_list', 'team_members', 'testimonials', 'social_links',
  'primary_cta', 'image', 'brand_colours',
];

export const PLACEHOLDER_LABELS: Record<PlaceholderKind, string> = {
  business_name: 'Business name',
  logo: 'Logo',
  tagline: 'Tagline',
  description: 'Description',
  contact_email: 'Contact email',
  contact_phone: 'Contact phone',
  address: 'Address',
  service_list: 'Service list',
  team_members: 'Team members',
  testimonials: 'Testimonials',
  social_links: 'Social links',
  primary_cta: 'Primary call to action',
  image: 'Images',
  brand_colours: 'Brand colours',
};

export type TemplatePlaceholder = {
  kind: PlaceholderKind;
  label: string;
  defaultValue: string;
  required: boolean;
};

export type InstallMode =
  | 'new_project' | 'replace_draft' | 'add_pages' | 'design_system'
  | 'new_page' | 'replace_page' | 'insert_sections' | 'insert_component';

export const INSTALL_MODE_LABELS: Record<InstallMode, string> = {
  new_project: 'Create a new project',
  replace_draft: 'Replace current draft',
  add_pages: 'Add selected pages',
  design_system: 'Import design system only',
  new_page: 'Add as a new page',
  replace_page: 'Replace selected page',
  insert_sections: 'Insert sections into selected page',
  insert_component: 'Insert at selected canvas position',
};

/* ── Manifest ── */

export type TemplateAuthor = {
  name: string;
  email?: string;
  url?: string;
};

export type TemplatePreviewMeta = {
  thumbnail?: string;
  pages: { id: string; name: string; slug: string }[];
};

export type TemplateManifest = {
  schemaVersion: number;
  templateId: string;
  templateType: TemplateType;
  name: string;
  description: string;
  author: TemplateAuthor;
  licence: LicenceKey;
  compatibleForgeVersion: string;
  placeholders: TemplatePlaceholder[];
  requiredFeatures: string[];
  preview: TemplatePreviewMeta;
  document: SandboxDocument;
  integrityChecksum: string;
};

export type TemplateRecord = {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  templateType: TemplateType;
  name: string;
  slug: string;
  description: string | null;
  visibility: TemplateVisibility;
  moderationStatus: ModerationStatus;
  currentVersionId: string | null;
  licenceKey: LicenceKey;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
  installCount?: number;
  currentVersion?: TemplateVersionRecord | null;
  manifest?: TemplateManifest | null;
};

export type TemplateVersionRecord = {
  id: string;
  templateId: string;
  version: string;
  manifest: TemplateManifest;
  integrityChecksum: string;
  compatibility: string | null;
  releaseNotes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type InstallationRecord = {
  id: string;
  templateId: string | null;
  templateVersionId: string | null;
  projectId: string | null;
  installedBy: string | null;
  acceptedLicenceVersion: string | null;
  installationMode: InstallMode;
  createdAt: string;
};

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected' | 'suspended';

export type ReviewRecord = {
  id: string;
  templateId: string;
  reviewerId: string | null;
  status: ReviewStatus;
  findings: unknown;
  createdAt: string;
  completedAt: string | null;
};

/* ── Canonical serialization + integrity checksum ── */

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function manifestChecksum(manifest: Omit<TemplateManifest, 'integrityChecksum'>): Promise<string> {
  return sha256Hex(canonicalize(manifest));
}

/* ── Manifest construction ── */

export type BuildManifestInput = {
  templateId: string;
  templateType: TemplateType;
  name: string;
  description: string;
  author: TemplateAuthor;
  licence: LicenceKey;
  document: SandboxDocument;
  placeholders?: TemplatePlaceholder[];
  requiredFeatures?: string[];
};

export async function buildManifest(input: BuildManifestInput): Promise<TemplateManifest> {
  const placeholders = input.placeholders ?? inferPlaceholders(input.document);
  const base: Omit<TemplateManifest, 'integrityChecksum'> = {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    templateId: input.templateId,
    templateType: input.templateType,
    name: input.name,
    description: input.description,
    author: input.author,
    licence: input.licence,
    compatibleForgeVersion: FORGE_COMPATIBLE_VERSION,
    placeholders,
    requiredFeatures: input.requiredFeatures ?? inferRequiredFeatures(input.document),
    preview: {
      pages: input.document.pages.map((page) => ({ id: page.id, name: page.name, slug: page.slug })),
    },
    document: input.document,
  };
  const integrityChecksum = await manifestChecksum(base);
  return { ...base, integrityChecksum };
}

export function inferPlaceholders(document: SandboxDocument): TemplatePlaceholder[] {
  const placeholders: TemplatePlaceholder[] = [];
  const allText = document.pages.flatMap((page) => page.elements.map((element) => element.content)).join(' ');

  if (allText.length) {
    placeholders.push({ kind: 'business_name', label: 'Business name', defaultValue: document.projectName, required: true });
    placeholders.push({ kind: 'tagline', label: 'Tagline', defaultValue: '', required: false });
    placeholders.push({ kind: 'description', label: 'Description', defaultValue: '', required: false });
    placeholders.push({ kind: 'primary_cta', label: 'Primary call to action', defaultValue: '', required: false });
  }
  if (document.pages.some((page) => page.elements.some((element) => element.type === 'Image'))) {
    placeholders.push({ kind: 'image', label: 'Images', defaultValue: '', required: false });
  }
  if (document.pages.some((page) => page.elements.some((element) => element.type === 'Form'))) {
    placeholders.push({ kind: 'contact_email', label: 'Contact email', defaultValue: '', required: false });
  }
  placeholders.push({ kind: 'brand_colours', label: 'Brand colours', defaultValue: '', required: false });
  return placeholders;
}

export function inferRequiredFeatures(document: SandboxDocument): string[] {
  const features = new Set<string>();
  if (document.pages.some((page) => page.elements.some((element) => element.type === 'Form'))) features.add('forms');
  if (document.pages.some((page) => page.elements.some((element) => element.type === 'Video'))) features.add('video');
  if (document.components.length) features.add('components');
  if (document.pages.length > 1) features.add('multi_page');
  return [...features];
}

/* ── Validation (reject unsupported schemas and invalid packages) ── */

export type ManifestValidationResult = {
  ok: boolean;
  errors: string[];
  manifest?: TemplateManifest;
};

export async function validateManifest(raw: unknown): Promise<ManifestValidationResult> {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Package is not a valid object.'] };
  const manifest = raw as Partial<TemplateManifest>;

  if (typeof manifest.schemaVersion !== 'number') {
    return { ok: false, errors: ['Missing schema version.'] };
  }
  if (manifest.schemaVersion !== TEMPLATE_SCHEMA_VERSION) {
    return { ok: false, errors: [`Unsupported schema version ${manifest.schemaVersion} (expected ${TEMPLATE_SCHEMA_VERSION}).`] };
  }
  if (!manifest.templateId || !manifest.name) errors.push('Missing template ID or name.');
  if (!manifest.templateType || !TEMPLATE_TYPES.includes(manifest.templateType)) errors.push('Invalid or missing template type.');
  if (!manifest.author || !manifest.author.name) errors.push('Missing author information.');
  if (!manifest.licence || !(manifest.licence in TEMPLATE_LICENCES)) errors.push('Missing or unsupported licence.');
  if (!manifest.document || typeof manifest.document !== 'object') {
    errors.push('Missing template document.');
  } else {
    const doc = manifest.document as SandboxDocument;
    if (!Array.isArray(doc.pages) || doc.pages.length === 0) errors.push('Template document contains no pages.');
  }
  if (!manifest.integrityChecksum) errors.push('Missing integrity checksum.');

  if (errors.length) return { ok: false, errors };

  // Verify integrity checksum over the manifest (excluding the checksum field).
  const { integrityChecksum: _omit, ...rest } = manifest as TemplateManifest;
  const expected = await manifestChecksum(rest);
  if (expected !== manifest.integrityChecksum) {
    errors.push('Integrity checksum mismatch — the package may have been modified.');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], manifest: manifest as TemplateManifest };
}

/* ── Security scan (secrets + PII + private assets) ── */

export type ScanFinding = {
  severity: 'error' | 'warning';
  category: 'secret' | 'personal_info' | 'private_asset' | 'unsafe_link' | 'form_submission';
  message: string;
};

const SECRET_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'API key', pattern: /(api[_-]?key|apikey|secret|token|password|passwd)\s*[:=]\s*['"][^'"]{6,}['"]/i },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'Stripe key', pattern: /\bsk_(live|test)_[0-9a-zA-Z]{16,}\b/ },
  { label: 'Private key block', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'Bearer token', pattern: /bearer\s+[0-9a-zA-Z\-._~+/]{20,}/i },
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;
const URL_PATTERN = /https?:\/\/[^\s"'<>]+/g;

export function scanManifest(manifest: TemplateManifest): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const doc = manifest.document;
  const collected: string[] = [];

  const collectElement = (element: CanvasElement) => {
    collected.push(element.content, element.name);
    if (element.asset?.url) collected.push(element.asset.url);
    if (element.asset?.altText) collected.push(element.asset.altText);
    if (element.link?.url) collected.push(element.link.url);
    if (element.form) {
      collected.push(element.form.name, element.form.notifyRecipients, element.form.redirectUrl);
      if (element.form.consentLabel) collected.push(element.form.consentLabel);
    }
  };

  doc.pages.forEach((page) => page.elements.forEach(collectElement));
  doc.globalSections.header.forEach(collectElement);
  doc.globalSections.footer.forEach(collectElement);
  doc.components.forEach((component) => component.elements.forEach(collectElement));

  const blob = collected.join('\n');

  SECRET_PATTERNS.forEach(({ label, pattern }) => {
    if (pattern.test(blob)) findings.push({ severity: 'error', category: 'secret', message: `Possible ${label} detected in content.` });
  });

  // Never ship another project's private asset URLs.
  doc.pages.forEach((page) => page.elements.forEach((element) => {
    if (element.asset?.url && /supabase|storage|private|readdy\.ai\/api/i.test(element.asset.url)) {
      // Template-owned placeholder images are fine; raw storage URLs are not.
      if (/storage\.|\.supabase\.co|private/i.test(element.asset.url)) {
        findings.push({ severity: 'error', category: 'private_asset', message: `Private asset URL in element “${element.name}”.` });
      }
    }
    if (element.link?.type === 'external' && element.link.url && !/^https?:\/\//i.test(element.link.url)) {
      findings.push({ severity: 'warning', category: 'unsafe_link', message: `Unsafe link in element “${element.name}”.` });
    }
  }));

  // Surface potential personal info for the creator to review (not block).
  const emails = blob.match(EMAIL_PATTERN) ?? [];
  const emailsToFlag = emails.filter((e) => !/@(example|test|yourdomain|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)\./i.test(e));
  if (emailsToFlag.length) {
    findings.push({ severity: 'warning', category: 'personal_info', message: `${emailsToFlag.length} email address${emailsToFlag.length === 1 ? '' : 'es'} that may be personal.` });
  }

  return findings;
}

/* ── Import / export (.forge-template) ── */

export async function serializePackage(manifest: TemplateManifest): Promise<string> {
  return JSON.stringify(manifest, null, 2);
}

export async function exportPackageFile(manifest: TemplateManifest): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await serializePackage(manifest);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(manifest.name)}.forge-template`;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true, message: 'Template package exported.' };
  } catch {
    return { ok: false, message: 'Could not export the template package.' };
  }
}

export async function readPackageFile(file: File): Promise<{ ok: boolean; message: string; manifest?: TemplateManifest }> {
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const result = await validateManifest(parsed);
    if (!result.ok || !result.manifest) return { ok: false, message: result.errors.join(' ') };
    const findings = scanManifest(result.manifest);
    const blocking = findings.filter((f) => f.severity === 'error');
    if (blocking.length) {
      return { ok: false, message: `Import blocked: ${blocking.map((f) => f.message).join(' ')}` };
    }
    return { ok: true, message: 'Package validated.', manifest: result.manifest };
  } catch {
    return { ok: false, message: 'Not a valid Forge template package.' };
  }
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'template';
}

/* ── Row mappers ── */

function mapTemplate(row: Record<string, unknown>): TemplateRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    templateType: (String(row.template_type) as TemplateType) || 'website',
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    visibility: (String(row.visibility) as TemplateVisibility) || 'private',
    moderationStatus: (String(row.moderation_status) as ModerationStatus) || 'draft',
    currentVersionId: row.current_version_id ? String(row.current_version_id) : null,
    licenceKey: (String(row.licence_key) as LicenceKey) || 'forge-community',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVersion(row: Record<string, unknown>): TemplateVersionRecord {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    version: String(row.version),
    manifest: row.manifest as TemplateManifest,
    integrityChecksum: String(row.integrity_checksum),
    compatibility: row.compatibility ? String(row.compatibility) : null,
    releaseNotes: row.release_notes ? String(row.release_notes) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

/* ── CRUD ── */

async function currentUserId(): Promise<string | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return data?.user?.id ?? null;
}

async function currentUserEmail(): Promise<string | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return data?.user?.email ?? null;
}

export async function listMyTemplates(): Promise<TemplateRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const userId = await currentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapTemplate);
}

export async function listCommunityTemplates(): Promise<TemplateRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('visibility', 'community')
    .eq('moderation_status', 'approved')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  const templates = (data as Record<string, unknown>[]).map(mapTemplate);

  // Real install counts from the installations ledger — never invented.
  const ids = templates.map((t) => t.id);
  if (ids.length) {
    const { data: installs, error: installError } = await supabase
      .from('template_installations')
      .select('template_id')
      .in('template_id', ids);
    if (!installError && installs) {
      const counts = new Map<string, number>();
      (installs as Record<string, unknown>[]).forEach((row) => {
        const id = String(row.template_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      templates.forEach((t) => { t.installCount = counts.get(t.id) ?? 0; });
    }
  }
  return templates;
}

export async function getTemplateVersion(templateId: string): Promise<TemplateVersionRecord | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapVersion(data as Record<string, unknown>);
}

export type CreateTemplateResult = { ok: boolean; message: string; templateId?: string };

export async function createTemplate(input: {
  name: string;
  description: string;
  templateType: TemplateType;
  visibility: TemplateVisibility;
  licence: LicenceKey;
  manifest: TemplateManifest;
  releaseNotes?: string;
}): Promise<CreateTemplateResult> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to create templates.' };
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: 'Sign in to create templates.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  const workspaceId = resolved?.workspaceId ?? null;

  const slug = slugify(input.name);
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .insert({
      owner_id: userId,
      workspace_id: workspaceId,
      template_type: input.templateType,
      name: input.name,
      slug,
      description: input.description || null,
      visibility: input.visibility,
      moderation_status: input.visibility === 'community' ? 'submitted' : 'draft',
      licence_key: input.licence,
    })
    .select('id')
    .single();
  if (templateError) return { ok: false, message: templateError.message };

  const templateId = template.id as string;
  const { data: version, error: versionError } = await supabase
    .from('template_versions')
    .insert({
      template_id: templateId,
      version: '1.0.0',
      manifest: input.manifest,
      integrity_checksum: input.manifest.integrityChecksum,
      compatibility: FORGE_COMPATIBLE_VERSION,
      release_notes: input.releaseNotes ?? null,
      created_by: userId,
    })
    .select('id')
    .single();
  if (versionError) return { ok: false, message: versionError.message };

  await supabase
    .from('templates')
    .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  return { ok: true, message: `Template “${input.name}” created.`, templateId };
}

export async function submitTemplateForReview(templateId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to submit templates.' };
  const { error } = await supabase
    .from('templates')
    .update({ moderation_status: 'submitted', visibility: 'community', updated_at: new Date().toISOString() })
    .eq('id', templateId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Template submitted for community review.' };
}

export async function setTemplateVisibility(templateId: string, visibility: TemplateVisibility): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to change visibility.' };
  const patch: Record<string, unknown> = { visibility, updated_at: new Date().toISOString() };
  if (visibility === 'community') patch.moderation_status = 'submitted';
  const { error } = await supabase.from('templates').update(patch).eq('id', templateId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Visibility set to ${TEMPLATE_VISIBILITY_LABELS[visibility]}.` };
}

export async function recordInstallation(input: {
  templateId: string;
  templateVersionId: string;
  projectId: string;
  licence: LicenceKey;
  installationMode: InstallMode;
}): Promise<void> {
  const supabase = getSandboxClient();
  if (!supabase) return;
  const userId = await currentUserId();
  await supabase.from('template_installations').insert({
    template_id: input.templateId,
    template_version_id: input.templateVersionId,
    project_id: input.projectId,
    installed_by: userId,
    accepted_licence_version: `${input.licence}@1`,
    installation_mode: input.installationMode,
  }).then(() => undefined).catch(() => undefined);
}

export async function deleteTemplate(templateId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to delete templates.' };
  const { error } = await supabase.from('templates').delete().eq('id', templateId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Template deleted.' };
}

/* ── Moderation (admin-gated via edge function) ── */

export type ModerateInput = {
  templateId: string;
  decision: 'approve' | 'changes_requested' | 'reject' | 'suspend';
  reason: string;
};

export async function moderateTemplate(input: ModerateInput): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Moderation unavailable.' };
  const { data, error } = await supabase.functions.invoke('forge-templates', { body: { action: 'moderate', ...input } });
  if (error) return { ok: false, message: error.message };
  const result = data as Record<string, unknown>;
  if (result?.code !== 'OK') return { ok: false, message: String(result?.message ?? 'Moderation failed.') };
  return { ok: true, message: String(result.message ?? 'Updated.') };
}

export async function listPendingSubmissions(): Promise<TemplateRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .in('moderation_status', ['submitted', 'automated_review', 'manual_review'])
    .order('updated_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapTemplate);
}

export async function isForgeAdmin(): Promise<boolean> {
  const supabase = getSandboxClient();
  if (!supabase) return false;
  const { data, error } = await supabase.functions.invoke('forge-templates', { body: { action: 'whoami' } });
  if (error || !data) return false;
  return (data as Record<string, unknown>)?.isAdmin === true;
}

/* ── Author helpers for the create flow ── */

export async function currentAuthor(): Promise<TemplateAuthor> {
  const email = await currentUserEmail();
  return { name: email ? email.split('@')[0] : 'Forge user', email: email ?? undefined };
}

/* ── Placeholder substitution (typed placeholders → user values) ── */

export function applyPlaceholderValues(document: SandboxDocument, values: Record<string, string>): SandboxDocument {
  const tokens = Object.keys(values);
  if (!tokens.length) return document;

  const substitute = (text: string): string => {
    let result = text;
    tokens.forEach((token) => {
      const value = values[token] ?? '';
      result = result.split(`{{${token}}}`).join(value);
    });
    return result;
  };

  const mapElement = (element: CanvasElement): CanvasElement => ({
    ...element,
    content: substitute(element.content),
    name: substitute(element.name),
    asset: element.asset ? { ...element.asset, altText: substitute(element.asset.altText), accessibleTitle: substitute(element.asset.accessibleTitle) } : undefined,
    form: element.form ? {
      ...element.form,
      name: substitute(element.form.name),
      description: substitute(element.form.description),
      fields: element.form.fields.map((field) => ({ ...field, label: substitute(field.label), placeholder: substitute(field.placeholder), helpText: substitute(field.helpText), defaultValue: substitute(field.defaultValue) })),
    } : undefined,
  });

  const mapPage = (page: SandboxPage): SandboxPage => ({
    ...page,
    elements: page.elements.map(mapElement),
    seo: { ...page.seo, title: substitute(page.seo.title), metaDescription: substitute(page.seo.metaDescription) },
  });

  const mapComponent = (component: ComponentDefinition): ComponentDefinition => ({
    ...component,
    elements: component.elements.map(mapElement),
  });

  return {
    ...document,
    projectName: substitute(document.projectName),
    pages: document.pages.map(mapPage),
    globalSections: {
      header: document.globalSections.header.map(mapElement),
      footer: document.globalSections.footer.map(mapElement),
      navigation: document.globalSections.navigation.map((item) => ({ ...item, label: substitute(item.label), url: substitute(item.url) })),
    },
    components: document.components.map(mapComponent),
  };
}

export function remapTemplateDocument(document: SandboxDocument): SandboxDocument {
  const pageIdMap = new Map<string, string>();
  const remapElement = (element: CanvasElement): CanvasElement => ({
    ...element,
    id: `${element.type.toLowerCase()}-${crypto.randomUUID()}`,
    asset: element.asset ? { ...element.asset } : undefined,
    link: element.link && element.link.type === 'page' ? { ...element.link } : element.link,
  });

  const pages = document.pages.map((page) => {
    const newId = `page-${crypto.randomUUID()}`;
    pageIdMap.set(page.id, newId);
    return {
      ...page,
      id: newId,
      elements: page.elements.map(remapElement),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Remap page links.
  const remapLinks = (elements: CanvasElement[]) => elements.map((element) => {
    if (element.link?.type === 'page' && element.link.pageId && pageIdMap.has(element.link.pageId)) {
      return { ...element, link: { ...element.link, pageId: pageIdMap.get(element.link.pageId)! } };
    }
    return element;
  });
  const finalPages = pages.map((page) => ({ ...page, elements: remapLinks(page.elements) }));

  const navigation = document.globalSections.navigation.map((item) => {
    if (item.type === 'page' && item.pageId && pageIdMap.has(item.pageId)) {
      return { ...item, pageId: pageIdMap.get(item.pageId)! };
    }
    return item;
  });

  return {
    ...document,
    pages: finalPages,
    activePageId: pageIdMap.get(document.activePageId) ?? finalPages[0]?.id ?? '',
    globalSections: { ...document.globalSections, navigation },
    components: document.components.map((component) => ({
      ...component,
      id: crypto.randomUUID(),
      elements: component.elements.map(remapElement),
    })),
  };
}