import { getSupabaseClient } from '@/services/supabaseClient';
import type {
  WorkflowStatus,
  WorkflowRun,
  WorkflowDefinition,
} from '@/pages/projects/workflows/workflowTypes';

// ------------------------------------------------------------
// Project Workflows — project-scoped read layer for the
// /projects/:projectId/workflows workspace. Backed by the real
// workflow_* tables (RLS-protected). This layer only READS; all
// mutations live in the existing workflowData.ts (create / edit /
// activate-pause / duplicate / delete / save version / connections).
//
// Honest scope: Forge has a workflow *configurator* (you can define
// and save workflows) but the execution engine is not wired up yet,
// so workflow_runs stays empty and workflows do not actually fire.
// This service reports that truthfully rather than inventing runs.
// ------------------------------------------------------------

export interface WorkflowStepSummary {
  category: string;
  type: string;
  label: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  steps: WorkflowStepSummary[];
  lastRun: WorkflowRun | null;
}

export interface WorkflowCounts {
  total: number;
  active: number;
  paused: number;
  draft: number;
  failed: number;
}

export interface ProjectWorkflowsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string; slug: string } | null;
  currentUserRole: string | null;
  workflows: WorkflowSummary[];
  counts: WorkflowCounts;
  runCount: number;
}

export function createEmptyWorkflowsData(): ProjectWorkflowsData {
  return {
    authenticated: false,
    found: false,
    project: null,
    currentUserRole: null,
    workflows: [],
    counts: { total: 0, active: 0, paused: 0, draft: 0, failed: 0 },
    runCount: 0,
  };
}

type Row = Record<string, unknown>;

function toStatus(value: unknown): WorkflowStatus {
  const s = String(value ?? 'draft');
  return s === 'active' || s === 'paused' || s === 'failed' ? s : 'draft';
}

/**
 * Order a workflow definition's nodes into a readable flow:
 * trigger first, then the remaining nodes in edge order, with
 * action nodes surfaced (used for the card "trigger → action" strip).
 */
function describeFlow(definition: WorkflowDefinition | null): WorkflowStepSummary[] {
  if (!definition || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    return [];
  }
  const nodes = definition.nodes;
  const edges = definition.edges ?? [];

  // Build adjacency from the saved edges to produce a stable order.
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from)!.push(e.to);
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }

  const trigger = nodes.find((n) => n.category === 'trigger') ?? nodes[0];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const order: string[] = [];
  const seen = new Set<string>();
  const stack = trigger ? [trigger.id] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    (outgoing.get(id) ?? []).forEach((t) => stack.push(t));
  }
  // Append any disconnected nodes (e.g. draft mid-edit).
  nodes.forEach((n) => {
    if (!seen.has(n.id)) order.push(n.id);
  });

  return order
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n) => ({ category: n.category, type: n.type, label: n.label }));
}

export async function fetchProjectWorkflows(projectId: string): Promise<ProjectWorkflowsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyWorkflowsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyWorkflowsData();
  const currentUserId = authData.user.id;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyWorkflowsData(), authenticated: true, found: false };
  }

  const [workflowsRes, roleRes, runsRes] = await Promise.all([
    supabase
      .from('workflows')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_members')
      .select('role, status')
      .eq('project_id', projectId)
      .eq('user_id', currentUserId)
      .maybeSingle(),
    supabase
      .from('workflow_runs')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_test', false)
      .order('started_at', { ascending: false })
      .limit(500),
  ]);

  if (workflowsRes.error) throw workflowsRes.error;

  const workflowRows = (workflowsRes.data ?? []) as Row[];
  const runRows = (runsRes.data ?? []) as Row[];

  const counts: WorkflowCounts = { total: workflowRows.length, active: 0, paused: 0, draft: 0, failed: 0 };
  const workflowIds = workflowRows.map((r) => String(r.id));

  // Fetch versions once (single query) and resolve the current
  // definition per workflow via current_version_id, falling back to
  // the highest version number.
  let versionsByWorkflow = new Map<string, { currentId: string | null; versions: Row[] }>();
  if (workflowIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from('workflow_versions')
      .select('*')
      .in('workflow_id', workflowIds)
      .order('version_number', { ascending: false });
    if (!versionsError && versions) {
      for (const v of versions as Row[]) {
        const wfId = String(v.workflow_id);
        if (!versionsByWorkflow.has(wfId)) {
          versionsByWorkflow.set(wfId, { currentId: null, versions: [] });
        }
        versionsByWorkflow.get(wfId)!.versions.push(v);
      }
    }
  }

  const workflows: WorkflowSummary[] = workflowRows.map((row) => {
    const status = toStatus(row.status);
    counts[status] += 1;

    const wfId = String(row.id);
    const currentVersionId = row.current_version_id ? String(row.current_version_id) : null;
    const group = versionsByWorkflow.get(wfId);
    const versions = group?.versions ?? [];
    const currentVersion =
      versions.find((v) => String(v.id) === currentVersionId) ??
      (versions.length > 0 ? versions[0] : null);
    const definition =
      currentVersion?.definition && typeof currentVersion.definition === 'object'
        ? (currentVersion.definition as WorkflowDefinition)
        : null;

    const lastRun = runRows.find((r) => String(r.workflow_id) === wfId) ?? null;

    return {
      id: wfId,
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      status,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      versionCount: versions.length,
      steps: describeFlow(definition),
      lastRun: lastRun ? mapRun(lastRun) : null,
    };
  });

  let currentUserRole: string | null = null;
  if (roleRes.data) {
    const member = roleRes.data as Row;
    if (String(member.status) === 'active' && member.role) {
      currentUserRole = String(member.role);
    }
  }

  return {
    authenticated: true,
    found: true,
    project: { id: String(project.id), name: String(project.name), slug: String(project.slug) },
    currentUserRole,
    workflows,
    counts,
    runCount: runRows.length,
  };
}

function mapRun(row: Row): WorkflowRun {
  return {
    id: String(row.id),
    workflowId: String(row.workflow_id),
    workflowVersionId: String(row.workflow_version_id),
    projectId: String(row.project_id),
    triggerType: String(row.trigger_type),
    triggerReference: row.trigger_reference ? String(row.trigger_reference) : null,
    status: String(row.status) as WorkflowRun['status'],
    isTest: Boolean(row.is_test),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    safeError: row.safe_error ? String(row.safe_error) : null,
  };
}

export function canManageWorkflows(role: string | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'developer';
}

export function canAdminWorkflows(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}