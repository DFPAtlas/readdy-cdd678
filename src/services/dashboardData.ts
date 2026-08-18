import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Dashboard data model (derived from real Supabase records)
// ------------------------------------------------------------

export interface DashboardProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string | null;
  pageCount: number | null;
  updatedAt: string | null;
  createdAt: string | null;
  latestBuildStatus: string | null;
  latestBuildVersion: string | null;
  hasAiActivity: boolean;
}

export interface DashboardActivity {
  id: string;
  kind: 'project' | 'build' | 'ai';
  description: string;
  projectName: string | null;
  projectId: string | null;
  timestamp: string;
}

export interface DashboardAttentionItem {
  id: string;
  kind: 'build' | 'ai' | 'provider';
  description: string;
  projectId?: string | null;
  projectName?: string | null;
}

export interface DashboardData {
  authenticated: boolean;
  userName: string | null;
  workspaceName: string | null;
  projects: DashboardProject[];
  activeProjectCount: number;
  totalBuildCount: number;
  runningBuildCount: number;
  recentAiCount: number;
  configuredProviders: string[];
  planKey: string | null;
  subscriptionStatus: string | null;
  paidAccess: boolean;
  billingConflict: boolean;
  activity: DashboardActivity[];
  attention: DashboardAttentionItem[];
}

export function createEmptyDashboardData(): DashboardData {
  return {
    authenticated: false,
    userName: null,
    workspaceName: null,
    projects: [],
    activeProjectCount: 0,
    totalBuildCount: 0,
    runningBuildCount: 0,
    recentAiCount: 0,
    configuredProviders: [],
    planKey: null,
    subscriptionStatus: null,
    paidAccess: false,
    billingConflict: false,
    activity: [],
    attention: [],
  };
}

function getPageCount(blueprint: unknown): number | null {
  if (!blueprint || typeof blueprint !== 'object') return null;
  const pages = (blueprint as { pages?: unknown }).pages;
  return Array.isArray(pages) ? pages.length : null;
}

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

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyDashboardData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyDashboardData();

  const userId = authData.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  if (workspaceError || !workspace) {
    return {
      ...createEmptyDashboardData(),
      authenticated: true,
      userName: profile?.display_name ?? null,
    };
  }

  const workspaceId = workspace.id;

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, slug, description, status, blueprint, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (projectsError) throw projectsError;

  const projectList = projects ?? [];
  const projectIds = projectList.map((p) => p.id);

  // Builds — recent rows for status/activity, plus an exact total count.
  let recentBuilds: Array<{
    id: string;
    project_id: string;
    status: string;
    version: string | null;
    started_at: string | null;
  }> = [];
  let totalBuildCount = 0;

  if (projectIds.length) {
    const [buildRows, buildCount] = await Promise.all([
      supabase
        .from('builds')
        .select('id, project_id, status, version, started_at')
        .in('project_id', projectIds)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('builds')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds),
    ]);
    if (!buildRows.error) recentBuilds = buildRows.data ?? [];
    totalBuildCount = buildCount.count ?? 0;
  }

  // AI jobs — recent rows for activity, plus an exact total count.
  let recentAiJobs: Array<{
    id: string;
    project_id: string | null;
    task_type: string | null;
    status: string | null;
    created_at: string | null;
  }> = [];
  const [aiRows, aiCount] = await Promise.all([
    supabase
      .from('ai_jobs')
      .select('id, project_id, task_type, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ai_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId),
  ]);
  if (!aiRows.error) recentAiJobs = aiRows.data ?? [];
  const recentAiCount = aiCount.count ?? 0;

  // Effective plan (authoritative resolver — never an arbitrary subscription row).
  let planKey: string | null = null;
  let subscriptionStatus: string | null = null;
  let paidAccess = false;
  let billingConflict = false;
  const { data: effectivePlan, error: planError } = await supabase.rpc(
    'resolve_effective_plan',
    { p_user_id: userId },
  );
  if (!planError && effectivePlan) {
    const ep = effectivePlan as Record<string, unknown>;
    planKey = ep.plan_key ? String(ep.plan_key) : null;
    subscriptionStatus = ep.subscription_status ? String(ep.subscription_status) : null;
    paidAccess = ep.paid_access === true;
    billingConflict = ep.billing_conflict === true;
  }

  // Configured AI providers.
  const { data: providerKeys } = await supabase
    .from('workspace_ai_keys')
    .select('provider_key')
    .eq('workspace_id', workspaceId);
  const configuredProviders = providerKeys
    ? Array.from(new Set(providerKeys.map((k) => k.provider_key).filter(Boolean) as string[]))
    : [];

  const nameById = new Map(projectList.map((p) => [p.id, p.name]));

  const latestBuildByProject = new Map<string, { status: string; version: string | null }>();
  for (const b of recentBuilds) {
    if (!latestBuildByProject.has(b.project_id)) {
      latestBuildByProject.set(b.project_id, { status: b.status, version: b.version });
    }
  }

  const aiProjectIds = new Set(
    recentAiJobs.map((j) => j.project_id).filter(Boolean) as string[],
  );

  const projectsMapped: DashboardProject[] = projectList.map((p) => {
    const latest = latestBuildByProject.get(p.id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      status: p.status,
      pageCount: getPageCount(p.blueprint),
      updatedAt: p.updated_at,
      createdAt: p.created_at,
      latestBuildStatus: latest?.status ?? null,
      latestBuildVersion: latest?.version ?? null,
      hasAiActivity: aiProjectIds.has(p.id),
    };
  });

  const activeProjectCount = projectList.filter((p) => p.status !== 'archived').length;
  const runningBuildCount = recentBuilds.filter((b) => b.status === 'running').length;

  // Combined activity feed (real events only).
  const activity: DashboardActivity[] = [];

  for (const p of projectList) {
    if (p.created_at) {
      activity.push({
        id: `project-${p.id}`,
        kind: 'project',
        description: 'Project created',
        projectName: p.name,
        projectId: p.id,
        timestamp: p.created_at,
      });
    }
  }

  for (const b of recentBuilds) {
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
      projectName: nameById.get(b.project_id) ?? null,
      projectId: b.project_id,
      timestamp: b.started_at,
    });
  }

  for (const j of recentAiJobs) {
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
      projectName: j.project_id ? nameById.get(j.project_id) ?? null : null,
      projectId: j.project_id,
      timestamp: j.created_at,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Attention items (only from real, detectable state).
  const attention: DashboardAttentionItem[] = [];

  for (const b of recentBuilds) {
    if (b.status === 'failed') {
      attention.push({
        id: `att-build-${b.id}`,
        kind: 'build',
        description: 'A build failed',
        projectId: b.project_id,
        projectName: nameById.get(b.project_id) ?? null,
      });
    }
  }

  for (const j of recentAiJobs) {
    if (j.status === 'failed') {
      attention.push({
        id: `att-ai-${j.id}`,
        kind: 'ai',
        description: 'An AI task failed',
        projectId: j.project_id,
        projectName: j.project_id ? nameById.get(j.project_id) ?? null : null,
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
    userName: profile?.display_name ?? null,
    workspaceName: workspace.name ?? null,
    projects: projectsMapped,
    activeProjectCount,
    totalBuildCount,
    runningBuildCount,
    recentAiCount,
    configuredProviders,
    planKey,
    subscriptionStatus,
    paidAccess,
    billingConflict,
    activity: activity.slice(0, 8),
    attention,
  };
}