import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Project Versions data model (derived from real project_versions records)
// ------------------------------------------------------------

export interface ProjectVersionRecord {
  id: string;
  versionNumber: number;
  label: string | null;
  description: string | null;
  source: string;
  isCheckpoint: boolean;
  createdAt: string;
  changeSummary: string | null;
  checksum: string | null;
  parentVersionId: string | null;
  restoredFromVersionId: string | null;
  publishedAt: string | null;
  createdBy: string | null;
  buildId: string | null;
  buildNumber: number | null;
  buildVersion: string | null;
  pageCount: number | null;
}

export interface ProjectVersionsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  versions: ProjectVersionRecord[];
  currentVersion: ProjectVersionRecord | null;
  totalVersions: number;
  latestCreatedAt: string | null;
}

export function createEmptyVersionsData(): ProjectVersionsData {
  return {
    authenticated: false,
    found: false,
    project: null,
    versions: [],
    currentVersion: null,
    totalVersions: 0,
    latestCreatedAt: null,
  };
}

// ------------------------------------------------------------
// Source labels
// ------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
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
  template: 'Template',
};

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'Manual save';
  return SOURCE_LABELS[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

export function formatVersionDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatVersionRelative(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function versionLabel(version: ProjectVersionRecord): string {
  return `v${version.versionNumber}`;
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjectVersions(projectId: string): Promise<ProjectVersionsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyVersionsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyVersionsData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyVersionsData(), authenticated: true, found: false };
  }

  const { data: versionRows, error: versionError } = await supabase
    .from('project_versions')
    .select(
      'id, version_number, label, description, source, is_checkpoint, created_at, change_summary, checksum, parent_version_id, restored_from_version_id, published_at, created_by, build_id, page_ids',
    )
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(500);

  if (versionError) throw versionError;

  const rawVersions = (versionRows ?? []) as Array<Record<string, unknown>>;

  // Resolve "created by" names with a single profiles lookup (no N+1).
  const createdByIds = Array.from(
    new Set(rawVersions.map((v) => v.created_by).filter(Boolean) as string[]),
  );
  const createdByMap: Record<string, string> = {};
  if (createdByIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', createdByIds);
    if (!profilesError && profiles) {
      for (const p of profiles as Array<Record<string, unknown>>) {
        const name = p.display_name || p.email;
        if (name) createdByMap[String(p.id)] = String(name);
      }
    }
  }

  // Resolve related builds with a single lookup.
  const buildIds = Array.from(
    new Set(rawVersions.map((v) => v.build_id).filter(Boolean) as string[]),
  );
  const buildMap: Record<string, { buildNumber: number | null; version: string | null }> = {};
  if (buildIds.length > 0) {
    const { data: builds, error: buildsError } = await supabase
      .from('builds')
      .select('id, build_number, version')
      .in('id', buildIds);
    if (!buildsError && builds) {
      for (const b of builds as Array<Record<string, unknown>>) {
        buildMap[String(b.id)] = {
          buildNumber: b.build_number == null ? null : Number(b.build_number),
          version: b.version ? String(b.version) : null,
        };
      }
    }
  }

  const versions: ProjectVersionRecord[] = rawVersions.map((v) => {
    const pageIds = Array.isArray(v.page_ids) ? (v.page_ids as unknown[]) : [];
    const buildId = v.build_id ? String(v.build_id) : null;
    return {
      id: String(v.id),
      versionNumber: Number(v.version_number),
      label: v.label ? String(v.label) : null,
      description: v.description ? String(v.description) : null,
      source: v.source ? String(v.source) : 'manual',
      isCheckpoint: v.is_checkpoint === true,
      createdAt: String(v.created_at),
      changeSummary: v.change_summary ? String(v.change_summary) : null,
      checksum: v.checksum ? String(v.checksum) : null,
      parentVersionId: v.parent_version_id ? String(v.parent_version_id) : null,
      restoredFromVersionId: v.restored_from_version_id ? String(v.restored_from_version_id) : null,
      publishedAt: v.published_at ? String(v.published_at) : null,
      createdBy: v.created_by ? createdByMap[String(v.created_by)] ?? null : null,
      buildId,
      buildNumber: buildId ? buildMap[buildId]?.buildNumber ?? null : null,
      buildVersion: buildId ? buildMap[buildId]?.version ?? null : null,
      pageCount: pageIds.length > 0 ? pageIds.length : null,
    };
  });

  // Highest version number is the latest snapshot and therefore the current state.
  const currentVersion = versions[0] ?? null;
  const latestCreatedAt = versions[0]?.createdAt ?? null;

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name, slug: project.slug },
    versions,
    currentVersion,
    totalVersions: versions.length,
    latestCreatedAt,
  };
}

// ------------------------------------------------------------
// Blueprint (snapshot) fetch — on demand, never in list view
// ------------------------------------------------------------

export interface VersionSnapshot {
  pageCount: number;
  elementCount: number;
  pages: { id: string; name: string; slug: string; elementCount: number }[];
}

export function summarizeSnapshot(blueprint: unknown): VersionSnapshot | null {
  if (!blueprint || typeof blueprint !== 'object') return null;
  const doc = blueprint as { pages?: unknown };
  if (!Array.isArray(doc.pages)) return null;
  const pages = doc.pages as Array<Record<string, unknown>>;
  const list = pages.map((page) => ({
    id: page.id ? String(page.id) : '',
    name: page.name ? String(page.name) : 'Untitled',
    slug: page.slug ? String(page.slug) : '/',
    elementCount: Array.isArray(page.elements) ? page.elements.length : 0,
  }));
  const elementCount = list.reduce((sum, page) => sum + page.elementCount, 0);
  return { pageCount: list.length, elementCount, pages: list };
}

export async function fetchVersionBlueprint(projectId: string, versionId: string): Promise<unknown | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('project_versions')
    .select('blueprint')
    .eq('id', versionId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (error || !data?.blueprint) return null;
  return data.blueprint;
}