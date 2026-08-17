import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Workspace activity — aggregated from real Supabase records.
// Events are derived only from what the product actually stores:
// projects, builds, project_versions, exports and ai_jobs.
// ------------------------------------------------------------

export type ActivityKind = 'project' | 'build' | 'version' | 'export' | 'ai';
export type ActivityStatus = 'success' | 'running' | 'failed' | 'info';

export interface ActivityDetail {
  label: string;
  value: string;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  projectId: string | null;
  projectName: string | null;
  actor: string | null;
  timestamp: string;
  status: ActivityStatus;
  details: ActivityDetail[];
  actionHref?: string;
  actionLabel?: string;
}

export interface ActivityProject {
  id: string;
  name: string;
}

export interface ActivityData {
  authenticated: boolean;
  projects: ActivityProject[];
  activity: ActivityEvent[];
  summary: {
    projects: number;
    builds: number;
    versions: number;
    exports: number;
    ai: number;
  };
}

export interface ActivityFilters {
  search: string;
  kind: ActivityKind | 'all';
  projectId: string;
  status: ActivityStatus | 'all';
  dateRange: 'today' | '7d' | '30d' | 'all';
}

export const defaultActivityFilters: ActivityFilters = {
  search: '',
  kind: 'all',
  projectId: 'all',
  status: 'all',
  dateRange: 'all',
};

export function createEmptyActivityData(): ActivityData {
  return {
    authenticated: false,
    projects: [],
    activity: [],
    summary: { projects: 0, builds: 0, versions: 0, exports: 0, ai: 0 },
  };
}

// ------------------------------------------------------------
// Row shapes returned by Supabase
// ------------------------------------------------------------

interface BuildRow {
  id: string;
  project_id: string;
  version: string | null;
  status: string | null;
  started_at: string | null;
  duration: number | null;
  build_number: number | null;
  warning_count: number | null;
  error_count: number | null;
  requested_by: string | null;
}

interface VersionRow {
  id: string;
  project_id: string;
  label: string | null;
  version_number: number | null;
  change_summary: string | null;
  is_checkpoint: boolean | null;
  created_at: string | null;
  created_by: string | null;
}

interface ExportRow {
  id: string;
  project_id: string;
  format: string | null;
  status: string | null;
  file_size: number | null;
  created_at: string | null;
  requested_by: string | null;
}

interface AiJobRow {
  id: string;
  project_id: string | null;
  task_type: string | null;
  status: string | null;
  selected_provider: string | null;
  selected_model_key: string | null;
  created_at: string | null;
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

export function formatRelativeTime(iso: string | null): string {
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

export function activityStatusLabel(status: ActivityStatus): string {
  switch (status) {
    case 'success': return 'Completed';
    case 'running': return 'Running';
    case 'failed': return 'Failed';
    case 'info': return 'Info';
  }
}

export function activityKindLabel(kind: ActivityKind): string {
  switch (kind) {
    case 'project': return 'Project';
    case 'build': return 'Build';
    case 'version': return 'Version';
    case 'export': return 'Export';
    case 'ai': return 'AI';
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function providerLabel(key: string): string {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama',
    google: 'Google',
    custom: 'Custom',
  };
  return map[key] ?? key;
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchActivity(): Promise<ActivityData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyActivityData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyActivityData();

  const userId = authData.user.id;

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (workspaceError || !workspace) {
    return { ...createEmptyActivityData(), authenticated: true };
  }

  const workspaceId = workspace.id;

  const { data: projectRows, count: projectCount, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (projectsError) throw projectsError;

  const projectList = (projectRows ?? []) as Array<{
    id: string;
    name: string;
    created_at: string | null;
  }>;
  const projectIds = projectList.map((p) => p.id);
  const nameById = new Map(projectList.map((p) => [p.id, p.name]));

  // Builds, versions, exports — scoped to the user's projects.
  let builds: BuildRow[] = [];
  let buildCount = 0;
  let versions: VersionRow[] = [];
  let versionCount = 0;
  let exports: ExportRow[] = [];
  let exportCount = 0;

  if (projectIds.length) {
    const [buildRes, versionRes, exportRes] = await Promise.all([
      supabase
        .from('builds')
        .select(
          'id, project_id, version, status, started_at, duration, build_number, warning_count, error_count, requested_by',
          { count: 'exact' },
        )
        .in('project_id', projectIds)
        .order('started_at', { ascending: false })
        .limit(100),
      supabase
        .from('project_versions')
        .select('id, project_id, label, version_number, change_summary, is_checkpoint, created_at, created_by', { count: 'exact' })
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('exports')
        .select('id, project_id, format, status, file_size, created_at, requested_by', { count: 'exact' })
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (buildRes.error) throw buildRes.error;
    if (versionRes.error) throw versionRes.error;
    if (exportRes.error) throw exportRes.error;

    builds = (buildRes.data ?? []) as BuildRow[];
    versions = (versionRes.data ?? []) as VersionRow[];
    exports = (exportRes.data ?? []) as ExportRow[];
    buildCount = buildRes.count ?? 0;
    versionCount = versionRes.count ?? 0;
    exportCount = exportRes.count ?? 0;
  }

  // AI jobs — workspace-level.
  const { data: aiRows, count: aiCount, error: aiError } = await supabase
    .from('ai_jobs')
    .select('id, project_id, task_type, status, selected_provider, selected_model_key, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (aiError) throw aiError;

  const aiJobs = (aiRows ?? []) as AiJobRow[];

  // Resolve actor display names for events that carry a requesting user.
  const actorIds = new Set<string>();
  for (const b of builds) if (b.requested_by) actorIds.add(b.requested_by);
  for (const v of versions) if (v.created_by) actorIds.add(v.created_by);
  for (const e of exports) if (e.requested_by) actorIds.add(e.requested_by);

  const actorNames = new Map<string, string>();
  if (actorIds.size) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', Array.from(actorIds));
    if (profiles) {
      for (const p of profiles as Array<{ id: string; display_name: string | null }>) {
        if (p.display_name) actorNames.set(p.id, p.display_name);
      }
    }
  }

  // --- Build the unified activity feed ---
  const activity: ActivityEvent[] = [];

  for (const p of projectList) {
    if (!p.created_at) continue;
    activity.push({
      id: `project-${p.id}`,
      kind: 'project',
      title: 'Project created',
      description: p.name,
      projectId: p.id,
      projectName: p.name,
      actor: null,
      timestamp: p.created_at,
      status: 'info',
      details: [],
      actionHref: `/projects/${p.id}/overview`,
      actionLabel: 'Open project',
    });
  }

  for (const b of builds) {
    if (!b.started_at) continue;
    const { title, status } = buildEvent(b.status);
    const details: ActivityDetail[] = [];
    if (b.version) details.push({ label: 'Version', value: b.version });
    if (b.build_number != null) details.push({ label: 'Build number', value: `#${b.build_number}` });
    if (b.duration) details.push({ label: 'Duration', value: formatDuration(b.duration) });
    if (b.warning_count && b.warning_count > 0) details.push({ label: 'Warnings', value: String(b.warning_count) });
    if (b.error_count && b.error_count > 0) details.push({ label: 'Errors', value: String(b.error_count) });

    activity.push({
      id: `build-${b.id}`,
      kind: 'build',
      title,
      description: b.version ? `Version ${b.version}` : `Build #${b.build_number ?? '—'}`,
      projectId: b.project_id,
      projectName: nameById.get(b.project_id) ?? null,
      actor: b.requested_by ? actorNames.get(b.requested_by) ?? null : null,
      timestamp: b.started_at,
      status,
      details,
      actionHref: `/projects/${b.project_id}/builds`,
      actionLabel: 'View builds',
    });
  }

  for (const v of versions) {
    if (!v.created_at) continue;
    const label = v.version_number != null ? `v${v.version_number}` : v.label ?? null;
    const details: ActivityDetail[] = [];
    if (label) details.push({ label: 'Version', value: label });
    if (v.change_summary) details.push({ label: 'Change summary', value: v.change_summary });
    if (v.is_checkpoint) details.push({ label: 'Checkpoint', value: 'Yes' });

    activity.push({
      id: `version-${v.id}`,
      kind: 'version',
      title: v.is_checkpoint ? 'Checkpoint created' : 'Version created',
      description: label ?? (v.change_summary ?? ''),
      projectId: v.project_id,
      projectName: nameById.get(v.project_id) ?? null,
      actor: v.created_by ? actorNames.get(v.created_by) ?? null : null,
      timestamp: v.created_at,
      status: 'info',
      details,
      actionHref: `/projects/${v.project_id}/versions`,
      actionLabel: 'View versions',
    });
  }

  for (const e of exports) {
    if (!e.created_at) continue;
    const { title, status } = exportEvent(e.status);
    const details: ActivityDetail[] = [];
    if (e.format) details.push({ label: 'Format', value: e.format });
    if (e.file_size) details.push({ label: 'File size', value: formatBytes(e.file_size) });

    activity.push({
      id: `export-${e.id}`,
      kind: 'export',
      title,
      description: e.format ? `${e.format} export` : 'Export',
      projectId: e.project_id,
      projectName: nameById.get(e.project_id) ?? null,
      actor: e.requested_by ? actorNames.get(e.requested_by) ?? null : null,
      timestamp: e.created_at,
      status,
      details,
      actionHref: `/projects/${e.project_id}/exports`,
      actionLabel: 'View exports',
    });
  }

  for (const j of aiJobs) {
    if (!j.created_at) continue;
    const { title, status } = aiEvent(j.status);
    const details: ActivityDetail[] = [];
    if (j.task_type) details.push({ label: 'Task', value: j.task_type });
    if (j.selected_provider) details.push({ label: 'Provider', value: providerLabel(j.selected_provider) });
    if (j.selected_model_key) details.push({ label: 'Model', value: j.selected_model_key });

    activity.push({
      id: `ai-${j.id}`,
      kind: 'ai',
      title,
      description: j.task_type ?? 'AI task',
      projectId: j.project_id,
      projectName: j.project_id ? nameById.get(j.project_id) ?? null : null,
      actor: null,
      timestamp: j.created_at,
      status,
      details,
      actionHref: j.project_id ? `/projects/${j.project_id}/overview` : undefined,
      actionLabel: j.project_id ? 'View project' : undefined,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    authenticated: true,
    projects: projectList.map((p) => ({ id: p.id, name: p.name })),
    activity,
    summary: {
      projects: projectCount ?? 0,
      builds: buildCount,
      versions: versionCount,
      exports: exportCount,
      ai: aiCount ?? 0,
    },
  };
}

// ------------------------------------------------------------
// Event title/status mappers (no fabricated events)
// ------------------------------------------------------------

function buildEvent(status: string | null): { title: string; status: ActivityStatus } {
  switch (status) {
    case 'success': return { title: 'Build completed', status: 'success' };
    case 'failed': return { title: 'Build failed', status: 'failed' };
    case 'running': return { title: 'Build started', status: 'running' };
    case 'queued': return { title: 'Build queued', status: 'running' };
    case 'cancelled': return { title: 'Build cancelled', status: 'info' };
    default: return { title: 'Build updated', status: 'info' };
  }
}

function exportEvent(status: string | null): { title: string; status: ActivityStatus } {
  switch (status) {
    case 'completed': return { title: 'Export completed', status: 'success' };
    case 'failed': return { title: 'Export failed', status: 'failed' };
    case 'processing': return { title: 'Export started', status: 'running' };
    case 'pending': return { title: 'Export queued', status: 'running' };
    default: return { title: 'Export updated', status: 'info' };
  }
}

function aiEvent(status: string | null): { title: string; status: ActivityStatus } {
  switch (status) {
    case 'completed': return { title: 'AI task completed', status: 'success' };
    case 'failed': return { title: 'AI task failed', status: 'failed' };
    case 'running': return { title: 'AI task started', status: 'running' };
    case 'queued': return { title: 'AI task queued', status: 'running' };
    case 'processing': return { title: 'AI task started', status: 'running' };
    default: return { title: 'AI task updated', status: 'info' };
  }
}

// ------------------------------------------------------------
// Client-side filtering (data is already loaded and small)
// ------------------------------------------------------------

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function withinDays(iso: string, days: number): boolean {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const diff = Date.now() - then;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

export function filterActivity(activity: ActivityEvent[], filters: ActivityFilters): ActivityEvent[] {
  const q = filters.search.trim().toLowerCase();

  return activity.filter((e) => {
    if (filters.kind !== 'all' && e.kind !== filters.kind) return false;
    if (filters.projectId !== 'all' && e.projectId !== filters.projectId) return false;
    if (filters.status !== 'all' && e.status !== filters.status) return false;

    if (filters.dateRange === 'today' && !isToday(e.timestamp)) return false;
    if (filters.dateRange === '7d' && !withinDays(e.timestamp, 7)) return false;
    if (filters.dateRange === '30d' && !withinDays(e.timestamp, 30)) return false;

    if (q) {
      const haystack = [
        e.title,
        e.description,
        e.projectName,
        e.actor,
        activityKindLabel(e.kind),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}