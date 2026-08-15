import { getSandboxClient, resolveSandboxProject, type CanvasElement, type ComponentDefinition, type SandboxDocument, type SandboxPage } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Version history types
   ────────────────────────────────────────────────────────────── */

export type VersionSource =
  | 'manual'
  | 'autosave'
  | 'ai'
  | 'page'
  | 'component'
  | 'asset'
  | 'publish'
  | 'restore'
  | 'import'
  | 'theme';

export const VERSION_SOURCES: VersionSource[] = [
  'manual', 'autosave', 'ai', 'page', 'component', 'asset', 'publish', 'restore', 'import', 'theme',
];

export const VERSION_SOURCE_LABELS: Record<VersionSource, string> = {
  manual: 'Manual save',
  autosave: 'Automatic save',
  ai: 'AI change',
  page: 'Page operation',
  component: 'Component update',
  asset: 'Asset replacement',
  publish: 'Publish',
  restore: 'Restore',
  import: 'Import',
  theme: 'Theme update',
};

export type VersionEntry = {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string | null;
  description: string | null;
  source: VersionSource;
  createdBy: string | null;
  pageIds: string[] | null;
  changeSummary: string | null;
  checksum: string | null;
  parentVersionId: string | null;
  restoredFromVersionId: string | null;
  publishedAt: string | null;
  metadata: Record<string, unknown> | null;
  isCheckpoint: boolean;
  createdAt: string;
  local?: boolean;
  blueprint?: SandboxDocument | null;
};

export type SnapshotOptions = {
  source: VersionSource;
  label?: string | null;
  description?: string | null;
  isCheckpoint?: boolean;
  pageIds?: string[] | null;
  changeSummary?: string | null;
  parentVersionId?: string | null;
  restoredFromVersionId?: string | null;
  publishedAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SnapshotResult = {
  storage: 'cloud' | 'local';
  id?: string;
  versionNumber?: number;
  checksum: string;
  skipped?: boolean;
};

/* ──────────────────────────────────────────────────────────────
   Deterministic checksum
   ────────────────────────────────────────────────────────────── */

function stripUpdatedAt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUpdatedAt);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (key === 'updatedAt') return;
      out[key] = stripUpdatedAt(entry);
    });
    return out;
  }
  return value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

export function checksumDocument(document: SandboxDocument): string {
  let hash = 0x811c9dc5;
  const str = canonicalize(stripUpdatedAt(document));
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `00000000${hash.toString(16)}`.slice(-8);
}

/* ──────────────────────────────────────────────────────────────
   Deterministic change diff + summary
   ────────────────────────────────────────────────────────────── */

export type VersionDiff = {
  summary: string[];
  pageAdditions: string[];
  pageRemovals: string[];
  elementAdditions: number;
  elementRemovals: number;
  changedText: number;
  changedAssets: number;
  layoutChanges: number;
  navigationChanges: boolean;
  seoChanges: boolean;
  componentDefinitionChanges: number;
  instanceOverrideChanges: number;
  globalSectionChanges: boolean;
};

function countElements(elements: CanvasElement[]): number {
  return elements.length;
}

export function computeVersionDiff(previous: SandboxDocument, current: SandboxDocument): VersionDiff {
  const prevPages = new Map(previous.pages.map((page) => [page.id, page]));
  const currPages = new Map(current.pages.map((page) => [page.id, page]));

  const pageAdditions: string[] = [];
  const pageRemovals: string[] = [];
  let elementAdditions = 0;
  let elementRemovals = 0;
  let changedText = 0;
  let changedAssets = 0;
  let layoutChanges = 0;
  let seoChanges = false;

  currPages.forEach((page, id) => {
    if (!prevPages.has(id)) pageAdditions.push(page.name);
  });
  prevPages.forEach((page, id) => {
    if (!currPages.has(id)) pageRemovals.push(page.name);
  });

  currPages.forEach((page, id) => {
    const before = prevPages.get(id);
    if (!before) {
      elementAdditions += countElements(page.elements);
      return;
    }
    const beforeElements = new Map(before.elements.map((element) => [element.id, element]));
    page.elements.forEach((element) => {
      const prevElement = beforeElements.get(element.id);
      if (!prevElement) {
        elementAdditions += 1;
        return;
      }
      if (prevElement.content !== element.content) changedText += 1;
      if ((prevElement.asset?.assetId ?? '') !== (element.asset?.assetId ?? '') || (prevElement.asset?.url ?? '') !== (element.asset?.url ?? '')) changedAssets += 1;
      if (prevElement.x !== element.x || prevElement.y !== element.y || prevElement.width !== element.width || prevElement.height !== element.height) layoutChanges += 1;
    });
    beforeElements.forEach((prevElement, elementId) => {
      if (!page.elements.some((element) => element.id === elementId)) elementRemovals += 1;
    });
    if (JSON.stringify(before.seo) !== JSON.stringify(page.seo)) seoChanges = true;
  });

  const navigationChanges = JSON.stringify(previous.globalSections.navigation) !== JSON.stringify(current.globalSections.navigation);
  const globalSectionChanges =
    JSON.stringify(previous.globalSections.header) !== JSON.stringify(current.globalSections.header) ||
    JSON.stringify(previous.globalSections.footer) !== JSON.stringify(current.globalSections.footer);

  const prevComponents = new Map(previous.components.map((component) => [component.id, component]));
  const currComponents = new Map(current.components.map((component) => [component.id, component]));
  let componentDefinitionChanges = 0;
  currComponents.forEach((component, id) => {
    const before = prevComponents.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(component)) componentDefinitionChanges += 1;
  });
  prevComponents.forEach((component, id) => {
    if (!currComponents.has(id)) componentDefinitionChanges += 1;
  });

  let instanceOverrideChanges = 0;
  current.pages.forEach((page) => {
    page.elements.forEach((element) => {
      if (!element.component) return;
      const overrides = element.component.overrides ?? {};
      if (Object.keys(overrides).length > 0) instanceOverrideChanges += 1;
    });
  });

  const diff: VersionDiff = {
    summary: [],
    pageAdditions,
    pageRemovals,
    elementAdditions,
    elementRemovals,
    changedText,
    changedAssets,
    layoutChanges,
    navigationChanges,
    seoChanges,
    componentDefinitionChanges,
    instanceOverrideChanges,
    globalSectionChanges,
  };

  if (pageAdditions.length) diff.summary.push(`Added ${pageAdditions.map((name) => `“${name}”`).join(', ')} page${pageAdditions.length > 1 ? 's' : ''}`);
  if (pageRemovals.length) diff.summary.push(`Removed ${pageRemovals.map((name) => `“${name}”`).join(', ')} page${pageRemovals.length > 1 ? 's' : ''}`);
  if (elementAdditions) diff.summary.push(`Added ${elementAdditions} element${elementAdditions > 1 ? 's' : ''}`);
  if (elementRemovals) diff.summary.push(`Removed ${elementRemovals} element${elementRemovals > 1 ? 's' : ''}`);
  if (changedText) diff.summary.push(`Updated ${changedText} text block${changedText > 1 ? 's' : ''}`);
  if (changedAssets) diff.summary.push(`Replaced ${changedAssets} asset${changedAssets > 1 ? 's' : ''}`);
  if (layoutChanges) diff.summary.push(`Adjusted ${layoutChanges} layout${layoutChanges > 1 ? 's' : ''}`);
  if (navigationChanges) diff.summary.push('Updated navigation');
  if (seoChanges) diff.summary.push('Changed SEO settings');
  if (componentDefinitionChanges) diff.summary.push(`Changed ${componentDefinitionChanges} component definition${componentDefinitionChanges > 1 ? 's' : ''}`);
  if (globalSectionChanges) diff.summary.push('Updated global sections');

  return diff;
}

/* ──────────────────────────────────────────────────────────────
   Cloud version storage
   ────────────────────────────────────────────────────────────── */

function mapRow(row: Record<string, unknown>, projectId: string): VersionEntry {
  return {
    id: String(row.id),
    projectId,
    versionNumber: Number(row.version_number),
    label: row.label ? String(row.label) : null,
    description: row.description ? String(row.description) : null,
    source: (String(row.source) as VersionSource) || 'manual',
    createdBy: row.created_by ? String(row.created_by) : null,
    pageIds: Array.isArray(row.page_ids) ? (row.page_ids as unknown[]).map(String) : null,
    changeSummary: row.change_summary ? String(row.change_summary) : null,
    checksum: row.checksum ? String(row.checksum) : null,
    parentVersionId: row.parent_version_id ? String(row.parent_version_id) : null,
    restoredFromVersionId: row.restored_from_version_id ? String(row.restored_from_version_id) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null,
    isCheckpoint: row.is_checkpoint === true,
    createdAt: String(row.created_at),
    local: false,
  };
}

export async function listCloudVersions(): Promise<VersionEntry[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('project_versions')
    .select('id, version_number, label, description, source, created_by, page_ids, change_summary, checksum, parent_version_id, restored_from_version_id, published_at, metadata, is_checkpoint, created_at')
    .eq('project_id', resolved.projectId)
    .order('version_number', { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => mapRow(row, resolved.projectId));
}

export async function fetchVersionBlueprint(versionId: string): Promise<SandboxDocument | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return null;
  const { data, error } = await supabase
    .from('project_versions')
    .select('blueprint')
    .eq('id', versionId)
    .eq('project_id', resolved.projectId)
    .maybeSingle();
  if (error || !data?.blueprint) return null;
  return data.blueprint as SandboxDocument;
}

export async function snapshotVersion(document: SandboxDocument, options: SnapshotOptions): Promise<SnapshotResult> {
  const checksum = checksumDocument(document);
  const supabase = getSandboxClient();

  if (supabase) {
    const resolved = await resolveSandboxProject().catch(() => null);
    if (resolved) {
      try {
        const { data, error } = await supabase.rpc('create_project_version', {
          p_project_id: resolved.projectId,
          p_blueprint: document,
          p_schema_version: document.schemaVersion,
          p_label: options.label ?? null,
          p_description: options.description ?? null,
          p_source: options.source,
          p_page_ids: options.pageIds ?? null,
          p_change_summary: options.changeSummary ?? null,
          p_checksum: checksum,
          p_parent_version_id: options.parentVersionId ?? null,
          p_restored_from_version_id: options.restoredFromVersionId ?? null,
          p_published_at: options.publishedAt ?? null,
          p_metadata: options.metadata ?? null,
          p_is_checkpoint: options.isCheckpoint ?? false,
        });
        if (!error && data) {
          const result = data as { id?: string; version_number?: number };
          return { storage: 'cloud', id: result.id, versionNumber: result.version_number, checksum };
        }
      } catch {
        // Fall through to local storage on any cloud failure.
      }
    }
  }

  await saveLocalVersion({ document, options, checksum });
  return { storage: 'local', checksum };
}

/* ──────────────────────────────────────────────────────────────
   Local history (IndexedDB)
   ────────────────────────────────────────────────────────────── */

const LOCAL_DB = 'forge-version-history';
const LOCAL_STORE = 'versions';

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_STORE)) db.createObjectStore(LOCAL_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalVersion(input: { document: SandboxDocument; options: SnapshotOptions; checksum: string }): Promise<void> {
  try {
    const db = await openLocalDb();
    const existing = await listLocalVersions();
    const nextNumber = existing.reduce((max, entry) => Math.max(max, entry.versionNumber), 0) + 1;
    const entry: VersionEntry = {
      id: `local-${crypto.randomUUID()}`,
      projectId: 'local',
      versionNumber: nextNumber,
      label: input.options.label ?? null,
      description: input.options.description ?? null,
      source: input.options.source,
      createdBy: null,
      pageIds: input.options.pageIds ?? null,
      changeSummary: input.options.changeSummary ?? null,
      checksum: input.checksum,
      parentVersionId: null,
      restoredFromVersionId: null,
      publishedAt: null,
      metadata: null,
      isCheckpoint: input.options.isCheckpoint ?? false,
      createdAt: new Date().toISOString(),
      local: true,
      blueprint: input.document,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, 'readwrite');
      tx.objectStore(LOCAL_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable — local history is best-effort.
  }
}

export async function listLocalVersions(): Promise<VersionEntry[]> {
  try {
    const db = await openLocalDb();
    const entries = await new Promise<VersionEntry[]>((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, 'readonly');
      const request = tx.objectStore(LOCAL_STORE).getAll();
      request.onsuccess = () => resolve(request.result as VersionEntry[]);
      request.onerror = () => reject(request.error);
    });
    return entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

export async function clearLocalVersions(): Promise<void> {
  try {
    const db = await openLocalDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOCAL_STORE, 'readwrite');
      tx.objectStore(LOCAL_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // best-effort
  }
}

export async function listVersionHistory(): Promise<VersionEntry[]> {
  const [cloud, local] = await Promise.all([listCloudVersions(), listLocalVersions()]);
  const merged = [...cloud, ...local];
  merged.sort((a, b) => {
    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (diff !== 0) return diff;
    return b.versionNumber - a.versionNumber;
  });
  return merged;
}

export async function getVersionBlueprint(entry: VersionEntry): Promise<SandboxDocument | null> {
  if (entry.local) return entry.blueprint ?? null;
  return fetchVersionBlueprint(entry.id);
}

/* ──────────────────────────────────────────────────────────────
   Crash recovery (lightweight working copy)
   ────────────────────────────────────────────────────────────── */

const RECOVERY_KEY = 'forge:sandbox:recovery:v1';

export type RecoveryRecord = { document: SandboxDocument; savedAt: string };

export function saveRecovery(document: SandboxDocument): void {
  try {
    window.localStorage.setItem(RECOVERY_KEY, JSON.stringify({ document, savedAt: new Date().toISOString() } satisfies RecoveryRecord));
  } catch {
    // best-effort
  }
}

export function loadRecovery(): RecoveryRecord | null {
  try {
    const raw = window.localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecoveryRecord;
    if (!parsed?.document?.pages) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecovery(): void {
  try {
    window.localStorage.removeItem(RECOVERY_KEY);
  } catch {
    // best-effort
  }
}