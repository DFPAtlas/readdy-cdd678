import { getSandboxClient, resolveSandboxProject } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   AI orchestration client — model registry, BYOK keys, and the
   AI jobs / agent-runs / change-set audit trail.
   All authoritative provider state comes from the server
   (forge-providers + the ai_* tables). This file never exposes
   secrets — keys are only ever shown as masked suffixes.
   ────────────────────────────────────────────────────────────── */

export type AiProviderInfo = {
  id: string;
  provider_key: string;
  display_name: string;
  status: string;
  base_url: string | null;
  data_classification: string;
  last_health_check: string | null;
};

export type AiModelInfo = {
  id: string;
  provider_id: string;
  model_key: string;
  display_name: string;
  capabilities: string[];
  allowed_plans: string[];
  context_window: number | null;
  relative_speed: number | null;
  relative_cost: number | null;
  routing_priority: number;
  data_handling: string;
  enabled: boolean;
};

export type AiJobRecord = {
  id: string;
  project_id: string | null;
  task_type: string;
  requested_scope: string;
  status: string;
  selected_model_key: string | null;
  selected_provider: string | null;
  estimated_credits: number;
  reserved_credits: number;
  settled_credits: number;
  safe_error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type AiAgentRunRecord = {
  id: string;
  ai_job_id: string;
  agent_type: string;
  model_key: string | null;
  status: string;
  input_units: number;
  output_units: number;
  duration_ms: number;
};

export type AiChangeSetRecord = {
  id: string;
  ai_job_id: string;
  project_id: string;
  operations: Record<string, unknown> | null;
  validation_status: string;
  decision_status: string;
  decided_at: string | null;
};

export type WorkspaceKeyInfo = {
  id: string;
  provider_key: string;
  key_suffix: string;
  environment: string;
  created_at: string;
  last_used_at: string | null;
};

export type AgentType = 'master' | 'planner' | 'layout' | 'design' | 'copy' | 'developer' | 'seo' | 'accessibility' | 'qa' | 'security';

export const AGENT_LABELS: Record<AgentType, string> = {
  master: 'Master',
  planner: 'Planner',
  layout: 'Layout',
  design: 'Design',
  copy: 'Copy',
  developer: 'Developer',
  seo: 'SEO',
  accessibility: 'Accessibility',
  qa: 'QA',
  security: 'Security',
};

export type AiScope = 'element' | 'section' | 'page' | 'pages' | 'project';

/* Invoke forge-providers actions. */
async function invoke(action: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('forge-providers', { body: { action, ...body } });
    if (error || !data) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function resolveWorkspaceId(): Promise<string | null> {
  try {
    const resolved = await resolveSandboxProject();
    return resolved?.workspaceId ?? null;
  } catch {
    return null;
  }
}

export async function fetchModelRegistry(): Promise<{ providers: AiProviderInfo[]; models: AiModelInfo[] }> {
  const data = await invoke('registry');
  if (!data || data.code !== 'OK') return { providers: [], models: [] };
  const providers = (Array.isArray(data.providers) ? data.providers : []) as AiProviderInfo[];
  const models = (Array.isArray(data.models) ? data.models : []) as AiModelInfo[];
  return { providers, models };
}

export async function listWorkspaceKeys(workspaceId: string): Promise<WorkspaceKeyInfo[]> {
  const data = await invoke('list_keys', { workspaceId });
  if (!data || data.code !== 'OK') return [];
  return (Array.isArray(data.keys) ? data.keys : []) as WorkspaceKeyInfo[];
}

export async function addWorkspaceKey(workspaceId: string, providerKey: string, apiKey: string, environment: 'test' | 'production'): Promise<{ ok: boolean; message: string }> {
  const data = await invoke('add_key', { workspaceId, providerKey, apiKey, environment });
  if (!data || data.code !== 'OK') return { ok: false, message: String(data?.message ?? 'Unable to add key.') };
  return { ok: true, message: 'Key added.' };
}

export async function deleteWorkspaceKey(workspaceId: string, providerKey: string, environment: string): Promise<{ ok: boolean; message: string }> {
  const data = await invoke('delete_key', { workspaceId, providerKey, environment });
  if (!data || data.code !== 'OK') return { ok: false, message: String(data?.message ?? 'Unable to delete key.') };
  return { ok: true, message: 'Key deleted.' };
}

export async function testProvider(workspaceId: string, providerKey: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const data = await invoke('test_provider', { workspaceId, providerKey, apiKey });
  if (!data) return { ok: false, message: 'Unable to reach the provider test endpoint.' };
  return { ok: data.ok === true, message: String(data.message ?? '') };
}

/* ─── AI jobs audit trail (read-only via RLS) ─── */

export async function listAiJobs(projectId: string): Promise<AiJobRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ai_jobs')
    .select('id, project_id, task_type, requested_scope, status, selected_model_key, selected_provider, estimated_credits, reserved_credits, settled_credits, safe_error, created_at, completed_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as AiJobRecord[];
}

export async function listAgentRuns(jobId: string): Promise<AiAgentRunRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ai_agent_runs')
    .select('id, ai_job_id, agent_type, model_key, status, input_units, output_units, duration_ms')
    .eq('ai_job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []) as AiAgentRunRecord[];
}

export async function getChangeSet(jobId: string): Promise<AiChangeSetRecord | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ai_change_sets')
    .select('id, ai_job_id, project_id, operations, validation_status, decision_status, decided_at')
    .eq('ai_job_id', jobId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AiChangeSetRecord;
}

/* ─── Specialist agents by task (mirrors the server taxonomy) ─── */

export function agentsForTask(taskClass: string): AgentType[] {
  switch (taskClass) {
    case 'complex':
    case 'planning':
      return ['planner', 'master'];
    case 'copywriting':
      return ['copy'];
    case 'seo':
      return ['seo'];
    case 'accessibility':
      return ['accessibility'];
    case 'image_alt':
    case 'image':
      return ['design'];
    case 'code':
    case 'debug':
      return ['developer'];
    case 'review':
    case 'validation':
      return ['qa'];
    default:
      return ['master'];
  }
}