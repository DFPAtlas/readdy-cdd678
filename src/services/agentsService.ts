import { getSupabaseClient } from '@/services/supabaseClient';
import {
  fetchModelRegistry,
  listWorkspaceKeys,
  AGENT_LABELS,
  type AiProviderInfo,
  type AiModelInfo,
  type AgentType,
} from '@/pages/projects/sandbox/sandboxAiOrchestration';
import type { SupabaseClient } from '@supabase/supabase-js';

// ------------------------------------------------------------
// Specialist capability taxonomy (mirrors the server-side
// agent registry in the forge-ai edge function). These are
// real, implemented agents — not demo placeholders.
// ------------------------------------------------------------

export type SpecialistStatus = 'Available';

export interface SpecialistAgent {
  key: string;
  label: string;
  capability: string;
  description: string;
  chips: string[];
  status: SpecialistStatus;
}

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    key: 'planner',
    label: 'Planner',
    capability: 'Planning',
    description: 'Turns a request into a structured, ordered build plan and the concrete steps to realise it.',
    chips: ['Planning', 'Structure', 'Task breakdown'],
    status: 'Available',
  },
  {
    key: 'layout',
    label: 'Layout',
    capability: 'Layout',
    description: 'Proposes sections, grids and responsive structure as concrete element changes.',
    chips: ['Sections', 'Grids', 'Responsive'],
    status: 'Available',
  },
  {
    key: 'design',
    label: 'Design',
    capability: 'Layout',
    description: 'Applies your project design tokens and approved assets to style proposed elements.',
    chips: ['Design tokens', 'Styling', 'Assets'],
    status: 'Available',
  },
  {
    key: 'copy',
    label: 'Copy',
    capability: 'Copywriting',
    description: 'Writes page content from verified project information only.',
    chips: ['Copy', 'Content', 'Pages'],
    status: 'Available',
  },
  {
    key: 'developer',
    label: 'Developer',
    capability: 'Code',
    description: 'Produces controlled component and behaviour changes as reviewable operations.',
    chips: ['Code', 'Components', 'Behaviour'],
    status: 'Available',
  },
  {
    key: 'seo',
    label: 'SEO',
    capability: 'SEO',
    description: 'Suggests metadata, internal links and structured content improvements.',
    chips: ['Metadata', 'Links', 'Structured data'],
    status: 'Available',
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    capability: 'Accessibility',
    description: 'Finds accessibility issues and proposes concrete fixes.',
    chips: ['Audit', 'WCAG', 'Fixes'],
    status: 'Available',
  },
  {
    key: 'qa',
    label: 'QA',
    capability: 'Review',
    description: 'Checks routes, responsive behaviour and regressions, then proposes corrections.',
    chips: ['Routes', 'Responsive', 'Regression'],
    status: 'Available',
  },
  {
    key: 'security',
    label: 'Security',
    capability: 'Review',
    description: 'Reviews generated integrations and risky configuration, and proposes safe corrections.',
    chips: ['Review', 'Integrations', 'Config'],
    status: 'Available',
  },
];

// ------------------------------------------------------------
// Snapshot shape
// ------------------------------------------------------------

export interface AgentActivityItem {
  id: string;
  projectName: string;
  agentType: string;
  agentLabel: string;
  taskType: string;
  taskLabel: string;
  status: string;
  createdAt: string;
}

export interface AiWorkspaceSnapshot {
  configured: boolean;
  providers: AiProviderInfo[];
  models: AiModelInfo[];
  configuredProviderKey: string | null;
  configuredProvider: AiProviderInfo | null;
  defaultModel: AiModelInfo | null;
  keySuffix: string | null;
  activity: AgentActivityItem[];
}

const TASK_LABELS: Record<string, string> = {
  fast_edit: 'Quick edit',
  standard: 'Standard build',
  complex: 'Complex build',
  copywriting: 'Copywriting',
  seo: 'SEO',
  accessibility: 'Accessibility',
  image_alt: 'Image alt text',
  planning: 'Planning',
  layout: 'Layout',
  code: 'Code',
  image: 'Image',
  form: 'Form',
  data: 'Data',
  debug: 'Debug',
  review: 'Review',
  validation: 'Validation',
  local: 'Local mode',
};

async function resolveWorkspaceId(supabase: SupabaseClient): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', authData.user.id)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function fetchRecentActivity(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<AgentActivityItem[]> {
  const { data: jobs, error } = await supabase
    .from('ai_jobs')
    .select('id, project_id, task_type, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !jobs?.length) return [];

  const jobIds = (jobs as Array<{ id: string }>).map((j) => j.id);
  const { data: runs } = await supabase
    .from('ai_agent_runs')
    .select('ai_job_id, agent_type, status')
    .in('ai_job_id', jobIds);

  const runsByJob = new Map<string, Array<{ agentType: string; status: string }>>();
  (runs ?? []).forEach((r) => {
    const list = runsByJob.get(r.ai_job_id) ?? [];
    list.push({ agentType: r.agent_type, status: r.status });
    runsByJob.set(r.ai_job_id, list);
  });

  const projectIds = [
    ...new Set(
      (jobs as Array<{ project_id: string | null }>)
        .map((j) => j.project_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const nameById = new Map<string, string>();
  if (projectIds.length) {
    const { data: projects } = await supabase.from('projects').select('id, name').in('id', projectIds);
    (projects ?? []).forEach((p) => nameById.set(p.id, p.name));
  }

  return (jobs as Array<{
    id: string;
    project_id: string | null;
    task_type: string;
    status: string;
    created_at: string;
  }>).map((job) => {
    const runs = runsByJob.get(job.id) ?? [];
    const primaryRun = runs[0];
    const agentType = primaryRun?.agentType ?? 'master';
    return {
      id: job.id,
      projectName: nameById.get(job.project_id ?? '') ?? 'Project',
      agentType,
      agentLabel: AGENT_LABELS[agentType as AgentType] ?? 'Master',
      taskType: job.task_type,
      taskLabel: TASK_LABELS[job.task_type] ?? job.task_type,
      status: job.status,
      createdAt: job.created_at,
    };
  });
}

export async function fetchAiWorkspace(): Promise<AiWorkspaceSnapshot> {
  const empty: AiWorkspaceSnapshot = {
    configured: false,
    providers: [],
    models: [],
    configuredProviderKey: null,
    configuredProvider: null,
    defaultModel: null,
    keySuffix: null,
    activity: [],
  };

  const supabase = getSupabaseClient();
  if (!supabase) return empty;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return empty;

  const workspaceId = await resolveWorkspaceId(supabase);
  if (!workspaceId) return empty;

  const [registry, keys] = await Promise.all([
    fetchModelRegistry(),
    listWorkspaceKeys(workspaceId),
  ]);

  const providers = registry.providers;
  const models = registry.models;

  const configuredKey = keys[0] ?? null;
  const configuredProviderKey = configuredKey?.provider_key ?? null;
  const configuredProvider =
    providers.find((p) => p.provider_key === configuredProviderKey) ?? null;
  const defaultModel = configuredProvider
    ? models
        .filter((m) => m.provider_id === configuredProvider.id)
        .sort((a, b) => (b.routing_priority ?? 0) - (a.routing_priority ?? 0))[0] ?? null
    : null;

  const activity = await fetchRecentActivity(supabase, workspaceId);

  return {
    configured: keys.length > 0,
    providers,
    models,
    configuredProviderKey,
    configuredProvider,
    defaultModel,
    keySuffix: configuredKey?.key_suffix ?? null,
    activity,
  };
}