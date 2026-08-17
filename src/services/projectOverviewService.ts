import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Project overview data model (derived from real Supabase records)
// ------------------------------------------------------------

export interface OverviewBuild {
  id: string;
  status: string | null;
  version: string | null;
  buildNumber: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface OverviewVersion {
  id: string;
  label: string | null;
  versionNumber: number | null;
  description: string | null;
  changeSummary: string | null;
  createdAt: string | null;
  pageCount: number | null;
}

export interface OverviewAiJob {
  id: string;
  taskType: string | null;
  status: string | null;
  selectedProvider: string | null;
  selectedModelKey: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface OverviewActivity {
  id: string;
  kind: 'project' | 'build' | 'version' | 'ai';
  description: string;
  area: string | null;
  timestamp: string;
}

export interface OverviewAttention {
  id: string;
  kind: 'build' | 'ai' | 'provider';
  description: string;
}

export interface ProjectOverviewData {
  authenticated: boolean;
  found: boolean;
  project: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string | null;
    workspaceId: string | null;
    pageCount: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  builds: OverviewBuild[];
  latestBuild: OverviewBuild | null;
  buildCount: number;
  versions: OverviewVersion[];
  latestVersion: OverviewVersion | null;
  versionCount: number;
  configuredProviders: string[];
  aiJobs: OverviewAiJob[];
  activity: OverviewActivity[];
  attention: OverviewAttention[];
}

export function createEmptyOverviewData(): ProjectOverviewData {
  return {
    authenticated: false,
    found: false,
    project: null,
    builds: [],
    latestBuild: null,
    buildCount: 0,
    versions: [],
    latestVersion: null,
    versionCount: 0,
    configuredProviders: [],
    aiJobs: [],
    activity: [],
    attention: [],
  };
}

function getPageCount(blueprint: unknown): number | null {
  if (!blueprint || typeof blueprint !== 'object') return null;
  const pages = (blueprint as { pages?: unknown }).pages;
  return Array.isArray(pages) ? pages.length : null;
}

export function formatOverviewRelativeTime(iso: string | null): string {
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

export function buildStatusLabel(status: string | null): string | null {
  switch (status) {
    case 'success':
      return 'Completed';
    case 'running':
      return 'Building';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return null;
  }
}

export function versionShortLabel(version: OverviewVersion | null): string | null {
  if (!version) return null;
  if (version.versionNumber != null) return `v${version.versionNumber}`;
  if (version.label) return version.label;
  return null;
}

export function providerLabel(providerKey: string): string {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama',
    google: 'Google',
    custom: 'Custom',
  };
  return map[providerKey] ?? providerKey;
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjectOverview(projectId: string): Promise<ProjectOverviewData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyOverviewData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyOverviewData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug, description, status, blueprint, workspace_id, created_at, updated_at')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyOverviewData(), authenticated: true, found: false };
  }

  const workspaceId = (project.workspace_id as string | undefined) ?? null;
  const pageCount = getPageCount(project.blueprint);

  // Builds — recent rows plus an exact count.
  const [buildRows, buildCountResult] = await Promise.all([
    supabase
      .from('builds')
      .select('id, status, version, build_number, started_at, completed_at')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(10),
    supabase
      .from('builds')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId),
  ]);
  if (buildRows.error) throw buildRows.error;

  const builds: OverviewBuild[] = (buildRows.data ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    version: b.version,
    buildNumber: b.build_number,
    startedAt: b.started_at,
    completedAt: b.completed_at,
  }));
  const buildCount = buildCountResult.count ?? 0;
  const latestBuild = builds[0] ?? null;

  // Versions — recent rows plus an exact count.
  const [versionRows, versionCountResult] = await Promise.all([
    supabase
      .from('project_versions')
      .select('id, label, version_number, description, change_summary, created_at, blueprint')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('project_versions')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId),
  ]);
  if (versionRows.error) throw versionRows.error;

  const versions: OverviewVersion[] = (versionRows.data ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    versionNumber: v.version_number,
    description: v.description,
    changeSummary: v.change_summary,
    createdAt: v.created_at,
    pageCount: getPageCount(v.blueprint),
  }));
  const versionCount = versionCountResult.count ?? 0;
  const latestVersion = versions[0] ?? null;

  // Configured AI providers for the workspace.
  let configuredProviders: string[] = [];
  if (workspaceId) {
    const { data: keyRows, error: keyError } = await supabase
      .from('workspace_ai_keys')
      .select('provider_key')
      .eq('workspace_id', workspaceId);
    if (!keyError) {
      configuredProviders = Array.from(
        new Set((keyRows ?? []).map((k) => k.provider_key).filter(Boolean) as string[]),
      );
    }
  }

  // Recent AI jobs for this project.
  const { data: aiRows, error: aiError } = await supabase
    .from('ai_jobs')
    .select('id, task_type, status, selected_provider, selected_model_key, created_at, completed_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (aiError) throw aiError;

  const aiJobs: OverviewAiJob[] = (aiRows ?? []).map((j) => ({
    id: j.id,
    taskType: j.task_type,
    status: j.status,
    selectedProvider: j.selected_provider,
    selectedModelKey: j.selected_model_key,
    createdAt: j.created_at,
    completedAt: j.completed_at,
  }));

  // Combined activity feed (real events only).
  const activity: OverviewActivity[] = [];

  if (project.created_at) {
    activity.push({
      id: `project-created`,
      kind: 'project',
      description: 'Project created',
      area: null,
      timestamp: project.created_at,
    });
  }

  for (const b of builds) {
    if (!b.started_at) continue;
    const description =
      b.status === 'success' ? 'Build completed'
        : b.status === 'failed' ? 'Build failed'
          : b.status === 'running' ? 'Build started'
            : b.status === 'cancelled' ? 'Build cancelled'
              : 'Build updated';
    activity.push({
      id: `build-${b.id}`,
      kind: 'build',
      description,
      area: b.version ? `Build ${b.version}` : 'Builds',
      timestamp: b.started_at,
    });
  }

  for (const v of versions) {
    if (!v.created_at) continue;
    activity.push({
      id: `version-${v.id}`,
      kind: 'version',
      description: 'Version created',
      area: versionShortLabel(v) ?? undefined,
      timestamp: v.created_at,
    });
  }

  for (const j of aiJobs) {
    if (!j.created_at) continue;
    const description =
      j.status === 'completed' ? 'AI task completed'
        : j.status === 'failed' ? 'AI task failed'
          : j.status === 'running' ? 'AI task started'
            : 'AI task updated';
    activity.push({
      id: `ai-${j.id}`,
      kind: 'ai',
      description,
      area: j.taskType ?? 'AI',
      timestamp: j.created_at,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Attention items (only from real, detectable state).
  const attention: OverviewAttention[] = [];

  if (latestBuild && latestBuild.status === 'failed') {
    attention.push({
      id: 'att-build',
      kind: 'build',
      description: 'Latest build failed',
    });
  }

  for (const j of aiJobs) {
    if (j.status === 'failed') {
      attention.push({
        id: `att-ai-${j.id}`,
        kind: 'ai',
        description: 'An AI task failed',
      });
    }
  }

  if (configuredProviders.length === 0) {
    attention.push({
      id: 'att-provider',
      kind: 'provider',
      description: 'AI provider not configured',
    });
  }

  return {
    authenticated: true,
    found: true,
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      workspaceId,
      pageCount,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    builds,
    latestBuild,
    buildCount,
    versions,
    latestVersion,
    versionCount,
    configuredProviders,
    aiJobs,
    activity: activity.slice(0, 8),
    attention,
  };
}