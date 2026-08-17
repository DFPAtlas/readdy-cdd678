import { getSupabaseClient } from '@/services/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

// ------------------------------------------------------------
// Projects data model (derived from real Supabase records)
// ------------------------------------------------------------

export type ProjectStatusValue = 'draft' | 'active' | 'building' | 'previewing' | 'archived';

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatusValue | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'building', label: 'Building' },
  { value: 'previewing', label: 'Previewing' },
  { value: 'archived', label: 'Archived' },
];

export interface ProjectsProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string | null;
  pageCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  latestBuildStatus: string | null;
  latestBuildVersion: string | null;
  hasAiActivity: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

function getPageCount(blueprint: unknown): number | null {
  if (!blueprint || typeof blueprint !== 'object') return null;
  const pages = (blueprint as { pages?: unknown }).pages;
  return Array.isArray(pages) ? pages.length : null;
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'project'}-${suffix}`;
}

async function getWorkspaceId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

async function ensureWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
  email?: string,
): Promise<string> {
  const existing = await getWorkspaceId(supabase, userId);
  if (existing) return existing;

  await supabase.from('profiles').upsert(
    {
      id: userId,
      email: email ?? null,
      display_name: email?.split('@')[0] ?? 'Forge user',
      initials: (email?.slice(0, 2) ?? 'FU').toUpperCase(),
    },
    { onConflict: 'id' },
  );

  const { data: created, error } = await supabase
    .from('workspaces')
    .insert({
      name: 'My Forge Workspace',
      slug: `forge-${userId}`,
      owner_id: userId,
      description: 'Default Forge workspace',
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjects(): Promise<ProjectsProject[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return [];

  const userId = authData.user.id;

  let workspaceId: string | null;
  try {
    workspaceId = await getWorkspaceId(supabase, userId);
  } catch {
    return [];
  }
  if (!workspaceId) return [];

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, slug, description, status, blueprint, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (projectsError) throw projectsError;

  const list = projects ?? [];
  const projectIds = list.map((p) => p.id);

  let builds: Array<{
    project_id: string;
    status: string;
    version: string | null;
    started_at: string | null;
  }> = [];
  if (projectIds.length) {
    const { data: buildRows, error: buildError } = await supabase
      .from('builds')
      .select('project_id, status, version, started_at')
      .in('project_id', projectIds)
      .order('started_at', { ascending: false })
      .limit(200);
    if (!buildError) builds = buildRows ?? [];
  }

  const latestBuildByProject = new Map<string, { status: string; version: string | null }>();
  for (const b of builds) {
    if (!latestBuildByProject.has(b.project_id)) {
      latestBuildByProject.set(b.project_id, { status: b.status, version: b.version });
    }
  }

  let aiProjectIds = new Set<string>();
  const { data: aiRows, error: aiError } = await supabase
    .from('ai_jobs')
    .select('project_id')
    .eq('workspace_id', workspaceId)
    .limit(500);
  if (!aiError) {
    aiProjectIds = new Set(
      (aiRows ?? [])
        .map((j) => j.project_id)
        .filter((v): v is string => Boolean(v)),
    );
  }

  return list.map((p) => {
    const latest = latestBuildByProject.get(p.id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      status: p.status,
      pageCount: getPageCount(p.blueprint),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      latestBuildStatus: latest?.status ?? null,
      latestBuildVersion: latest?.version ?? null,
      hasAiActivity: aiProjectIds.has(p.id),
    };
  });
}

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

export async function createProject(input: CreateProjectInput): Promise<ProjectsProject> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Not signed in');

  const userId = authData.user.id;
  const workspaceId = await ensureWorkspaceId(supabase, userId, authData.user.email);

  const name = input.name.trim();
  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({
      name,
      slug: makeSlug(name),
      description: input.description?.trim() || null,
      workspace_id: workspaceId,
      status: 'draft',
    })
    .select('id, name, slug, description, status, created_at, updated_at')
    .single();
  if (createError) throw createError;

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description,
    status: created.status,
    pageCount: null,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
    latestBuildStatus: null,
    latestBuildVersion: null,
    hasAiActivity: false,
  };
}