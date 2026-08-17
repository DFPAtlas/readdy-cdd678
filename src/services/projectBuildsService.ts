import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Project Builds data model (derived from real Supabase records)
// ------------------------------------------------------------

export type BuildStatusKind = 'success' | 'failed' | 'cancelled' | 'queued' | 'active';

export interface ProjectBuildRecord {
  id: string;
  version: string | null;
  status: string | null;
  buildNumber: number | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  requestedBy: string | null;
  warningCount: number;
  errorCount: number;
  failureCode: string | null;
  failureMessage: string | null;
  environment: string | null;
}

export interface BuildVersionLink {
  id: string;
  versionNumber: number | null;
  label: string | null;
  buildId: string;
  createdAt: string | null;
}

export interface ProjectBuildsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  builds: ProjectBuildRecord[];
  latestBuild: ProjectBuildRecord | null;
  currentBuild: ProjectBuildRecord | null;
  versionByBuildId: Record<string, BuildVersionLink>;
  successCount: number;
  failedCount: number;
  averageDurationSeconds: number | null;
}

export function createEmptyBuildsData(): ProjectBuildsData {
  return {
    authenticated: false,
    found: false,
    project: null,
    builds: [],
    latestBuild: null,
    currentBuild: null,
    versionByBuildId: {},
    successCount: 0,
    failedCount: 0,
    averageDurationSeconds: null,
  };
}

// ------------------------------------------------------------
// Status helpers
// ------------------------------------------------------------

const SUCCESS_STATUSES = new Set(['completed', 'success']);
const FAILED_STATUSES = new Set(['failed']);
const CANCELLED_STATUSES = new Set(['cancelled']);
const ACTIVE_STATUSES = new Set([
  'validating',
  'generating',
  'packaging',
  'running',
  'building',
  'reviewing',
  'planning',
]);

export function buildStatusKind(status: string | null): BuildStatusKind {
  if (!status) return 'queued';
  if (SUCCESS_STATUSES.has(status)) return 'success';
  if (FAILED_STATUSES.has(status)) return 'failed';
  if (CANCELLED_STATUSES.has(status)) return 'cancelled';
  if (ACTIVE_STATUSES.has(status)) return 'active';
  return 'queued';
}

export function isActiveBuildStatus(status: string | null): boolean {
  return buildStatusKind(status) === 'active';
}

export function isBuildInProgress(status: string | null): boolean {
  if (!status) return false;
  return (
    !SUCCESS_STATUSES.has(status) &&
    !FAILED_STATUSES.has(status) &&
    !CANCELLED_STATUSES.has(status)
  );
}

export function buildStatusLabel(status: string | null): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'queued':
      return 'Queued';
    case 'validating':
      return 'Validating';
    case 'generating':
      return 'Generating';
    case 'packaging':
      return 'Packaging';
    case 'running':
    case 'building':
      return 'Building';
    case 'reviewing':
      return 'Reviewing';
    case 'planning':
      return 'Planning';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }
}

export function buildBadgeVariant(
  kind: BuildStatusKind,
): 'success' | 'error' | 'amber' | 'default' {
  switch (kind) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'active':
      return 'amber';
    case 'queued':
    case 'cancelled':
      return 'default';
  }
}

// ------------------------------------------------------------
// Pipeline stages (the real build pipeline)
// ------------------------------------------------------------

export const BUILD_PIPELINE_STAGES = [
  'Queued',
  'Validating',
  'Generating',
  'Packaging',
  'Completed',
] as const;

export function pipelineStageIndex(status: string | null): number {
  switch (status) {
    case 'queued':
      return 0;
    case 'validating':
      return 1;
    case 'generating':
      return 2;
    case 'packaging':
      return 3;
    case 'completed':
    case 'success':
      return 4;
    default:
      return 0;
  }
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

export function formatBuildDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatBuildRelativeTime(iso: string | null): string {
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

export function formatBuildTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildReference(build: ProjectBuildRecord): string {
  if (build.buildNumber != null) return `#${build.buildNumber}`;
  if (build.version) return build.version;
  return build.id.slice(0, 8).toUpperCase();
}

export function versionShortLabel(link: BuildVersionLink | null | undefined): string | null {
  if (!link) return null;
  if (link.versionNumber != null) return `v${link.versionNumber}`;
  if (link.label) return link.label;
  return null;
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjectBuilds(projectId: string): Promise<ProjectBuildsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyBuildsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyBuildsData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyBuildsData(), authenticated: true, found: false };
  }

  const { data: buildRows, error: buildError } = await supabase
    .from('builds')
    .select(
      'id, version, status, build_number, started_at, completed_at, duration, requested_by, warning_count, error_count, failure_code, failure_message, environment',
    )
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })
    .limit(100);

  if (buildError) throw buildError;

  const rawBuilds = (buildRows ?? []) as Array<Record<string, unknown>>;

  // Resolve "requested by" names with a single profiles lookup (no N+1).
  const requestedByIds = Array.from(
    new Set(rawBuilds.map((b) => b.requested_by).filter(Boolean) as string[]),
  );

  const requestedByMap: Record<string, string> = {};
  if (requestedByIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', requestedByIds);
    if (!profilesError && profiles) {
      for (const p of profiles as Array<Record<string, unknown>>) {
        const name = p.display_name || p.email;
        if (name) requestedByMap[String(p.id)] = String(name);
      }
    }
  }

  const builds: ProjectBuildRecord[] = rawBuilds.map((b) => ({
    id: String(b.id),
    version: b.version ? String(b.version) : null,
    status: b.status ? String(b.status) : null,
    buildNumber: b.build_number == null ? null : Number(b.build_number),
    startedAt: b.started_at ? String(b.started_at) : null,
    completedAt: b.completed_at ? String(b.completed_at) : null,
    duration: b.duration == null ? null : Number(b.duration),
    requestedBy: b.requested_by ? requestedByMap[String(b.requested_by)] ?? null : null,
    warningCount: Number(b.warning_count ?? 0),
    errorCount: Number(b.error_count ?? 0),
    failureCode: b.failure_code ? String(b.failure_code) : null,
    failureMessage: b.failure_message ? String(b.failure_message) : null,
    environment: b.environment ? String(b.environment) : null,
  }));

  // Map resulting versions to their builds.
  const buildIds = builds.map((b) => b.id);
  const versionByBuildId: Record<string, BuildVersionLink> = {};
  if (buildIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from('project_versions')
      .select('id, version_number, label, build_id, created_at')
      .in('build_id', buildIds);
    if (!versionsError && versions) {
      for (const v of versions as Array<Record<string, unknown>>) {
        if (!v.build_id) continue;
        versionByBuildId[String(v.build_id)] = {
          id: String(v.id),
          versionNumber: v.version_number == null ? null : Number(v.version_number),
          label: v.label ? String(v.label) : null,
          buildId: String(v.build_id),
          createdAt: v.created_at ? String(v.created_at) : null,
        };
      }
    }
  }

  const latestBuild = builds[0] ?? null;
  const currentBuild = builds.find((b) => isBuildInProgress(b.status)) ?? null;

  const successCount = builds.filter((b) => buildStatusKind(b.status) === 'success').length;
  const failedCount = builds.filter((b) => buildStatusKind(b.status) === 'failed').length;

  const durations = builds
    .filter((b) => b.duration != null && b.duration >= 0)
    .map((b) => b.duration as number);
  const averageDurationSeconds = durations.length
    ? Math.round(durations.reduce((a, c) => a + c, 0) / durations.length)
    : null;

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name, slug: project.slug },
    builds,
    latestBuild,
    currentBuild,
    versionByBuildId,
    successCount,
    failedCount,
    averageDurationSeconds,
  };
}