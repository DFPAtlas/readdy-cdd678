import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Project Exports data model (derived from real `exports` records)
// ------------------------------------------------------------

export type ExportStatusKind = 'success' | 'failed' | 'active' | 'expired' | 'default';

export interface ProjectExportRecord {
  id: string;
  versionId: string | null;
  format: string | null;
  status: string | null;
  fileSize: number | null;
  downloadUrl: string | null;
  artifactPath: string | null;
  checksum: string | null;
  expiresAt: string | null;
  manifest: unknown;
  failureCode: string | null;
  failureMessage: string | null;
  requestedBy: string | null;
  buildId: string | null;
  createdAt: string;
  completedAt: string | null;
  versionLabel: string | null;
  buildRef: string | null;
}

export interface ExportVersionRef {
  id: string;
  versionNumber: number | null;
}

export interface ExportBuildRef {
  id: string;
  status: string | null;
  completedAt: string | null;
  buildNumber: number | null;
  version: string | null;
}

export interface ProjectExportsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  exports: ProjectExportRecord[];
  currentVersion: ExportVersionRef | null;
  latestBuild: ExportBuildRef | null;
}

export function createEmptyExportsData(): ProjectExportsData {
  return {
    authenticated: false,
    found: false,
    project: null,
    exports: [],
    currentVersion: null,
    latestBuild: null,
  };
}

// ------------------------------------------------------------
// Status helpers (generic — the `exports.status` column is free-form text)
// ------------------------------------------------------------

const SUCCESS_STATUSES = new Set(['completed', 'complete', 'ready', 'success']);
const FAILED_STATUSES = new Set(['failed', 'error']);
const ACTIVE_STATUSES = new Set([
  'preparing',
  'queued',
  'pending',
  'processing',
  'building',
  'generating',
  'packaging',
  'running',
  'in_progress',
]);
const EXPIRED_STATUSES = new Set(['expired']);

export function exportStatusKind(status: string | null): ExportStatusKind {
  if (!status) return 'default';
  if (SUCCESS_STATUSES.has(status)) return 'success';
  if (FAILED_STATUSES.has(status)) return 'failed';
  if (ACTIVE_STATUSES.has(status)) return 'active';
  if (EXPIRED_STATUSES.has(status)) return 'expired';
  return 'default';
}

export function exportStatusLabel(status: string | null): string {
  switch (status) {
    case 'completed':
    case 'complete':
    case 'ready':
    case 'success':
      return 'Ready';
    case 'failed':
    case 'error':
      return 'Failed';
    case 'expired':
      return 'Expired';
    case 'preparing':
    case 'queued':
    case 'pending':
      return 'Preparing';
    case 'processing':
    case 'building':
    case 'generating':
    case 'packaging':
    case 'running':
    case 'in_progress':
      return 'Preparing';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }
}

export function exportBadgeVariant(
  kind: ExportStatusKind,
): 'success' | 'error' | 'amber' | 'default' {
  switch (kind) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'active':
      return 'amber';
    case 'expired':
    case 'default':
      return 'default';
  }
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

export function formatExportBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatExportDate(iso: string | null): string {
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

export function manifestEntryCount(manifest: unknown): number | null {
  if (Array.isArray(manifest)) return manifest.length;
  if (manifest && typeof manifest === 'object') {
    const keys = Object.keys(manifest as Record<string, unknown>);
    if (keys.length > 0) return keys.length;
  }
  return null;
}

export function isCompletedBuildStatus(status: string | null): boolean {
  return status === 'completed' || status === 'success';
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjectExports(projectId: string): Promise<ProjectExportsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyExportsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyExportsData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyExportsData(), authenticated: true, found: false };
  }

  const [exportsRes, versionRes, buildRes] = await Promise.all([
    supabase
      .from('exports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('project_versions')
      .select('id, version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1),
    supabase
      .from('builds')
      .select('id, build_number, version, status, started_at, completed_at')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(1),
  ]);

  if (exportsRes.error) throw exportsRes.error;

  const rawExports = (exportsRes.data ?? []) as Array<Record<string, unknown>>;

  // Resolve related version labels and build refs in single lookups (no N+1).
  const versionIds = Array.from(
    new Set(rawExports.map((e) => e.version_id).filter(Boolean) as string[]),
  );
  const buildIds = Array.from(
    new Set(rawExports.map((e) => e.build_id).filter(Boolean) as string[]),
  );

  const versionMap: Record<string, number | null> = {};
  if (versionIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from('project_versions')
      .select('id, version_number')
      .in('id', versionIds);
    if (!versionsError && versions) {
      for (const v of versions as Array<Record<string, unknown>>) {
        versionMap[String(v.id)] = v.version_number == null ? null : Number(v.version_number);
      }
    }
  }

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

  const exports: ProjectExportRecord[] = rawExports.map((e) => {
    const versionId = e.version_id ? String(e.version_id) : null;
    const buildId = e.build_id ? String(e.build_id) : null;
    const resolvedVersion = versionId ? versionMap[versionId] : null;
    const resolvedBuild = buildId ? buildMap[buildId] : null;

    let versionLabel: string | null = null;
    if (versionId) {
      versionLabel = resolvedVersion != null ? `v${resolvedVersion}` : null;
    }
    let buildRef: string | null = null;
    if (buildId && resolvedBuild) {
      buildRef =
        resolvedBuild.buildNumber != null
          ? `#${resolvedBuild.buildNumber}`
          : resolvedBuild.version ?? null;
    }

    return {
      id: String(e.id),
      versionId,
      format: e.format ? String(e.format) : null,
      status: e.status ? String(e.status) : null,
      fileSize: e.file_size == null ? null : Number(e.file_size),
      downloadUrl: e.download_url ? String(e.download_url) : null,
      artifactPath: e.artifact_path ? String(e.artifact_path) : null,
      checksum: e.checksum ? String(e.checksum) : null,
      expiresAt: e.expires_at ? String(e.expires_at) : null,
      manifest: e.manifest ?? null,
      failureCode: e.failure_code ? String(e.failure_code) : null,
      failureMessage: e.failure_message ? String(e.failure_message) : null,
      requestedBy: e.requested_by ? String(e.requested_by) : null,
      buildId,
      createdAt: String(e.created_at),
      completedAt: e.completed_at ? String(e.completed_at) : null,
      versionLabel,
      buildRef,
    };
  });

  const currentVersionRow = versionRes.data?.[0] as Record<string, unknown> | undefined;
  const latestBuildRow = buildRes.data?.[0] as Record<string, unknown> | undefined;

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name, slug: project.slug },
    exports,
    currentVersion: currentVersionRow
      ? {
          id: String(currentVersionRow.id),
          versionNumber:
            currentVersionRow.version_number == null ? null : Number(currentVersionRow.version_number),
        }
      : null,
    latestBuild: latestBuildRow
      ? {
          id: String(latestBuildRow.id),
          status: latestBuildRow.status ? String(latestBuildRow.status) : null,
          completedAt: latestBuildRow.completed_at ? String(latestBuildRow.completed_at) : null,
          buildNumber:
            latestBuildRow.build_number == null ? null : Number(latestBuildRow.build_number),
          version: latestBuildRow.version ? String(latestBuildRow.version) : null,
        }
      : null,
  };
}