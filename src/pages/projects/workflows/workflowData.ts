import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Workflow, WorkflowStatus, WorkflowVersion, WorkflowConnection, ConnectionType,
  ConnectionStatus, WorkflowRun, WorkflowStepRun, WorkflowDefinition, ValidationStatus,
} from './workflowTypes';

/* ──────────────────────────────────────────────────────────────
   Forge Workflows data layer.

   All reads/writes go through the project-scoped workflow_* tables,
   protected by RLS. Secrets (encrypted_configuration) are never
   selected by the client — connection reads request an explicit
   column list that excludes that column.
   ────────────────────────────────────────────────────────────── */

function client(): SupabaseClient | null {
  return getSandboxClient();
}

type Row = Record<string, unknown>;

function mapWorkflow(row: Row): Workflow {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    description: row.description ? String(row.description) : '',
    status: String(row.status) as WorkflowStatus,
    currentVersionId: row.current_version_id ? String(row.current_version_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVersion(row: Row): WorkflowVersion {
  return {
    id: String(row.id),
    workflowId: String(row.workflow_id),
    versionNumber: Number(row.version_number),
    definition: (row.definition && typeof row.definition === 'object' ? row.definition : null) as WorkflowDefinition | null,
    validationStatus: String(row.validation_status) as ValidationStatus,
    createdAt: String(row.created_at),
  };
}

function mapConnection(row: Row): WorkflowConnection {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    connectionType: String(row.connection_type) as ConnectionType,
    displayName: String(row.display_name),
    status: String(row.status) as ConnectionStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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

function mapStepRun(row: Row): WorkflowStepRun {
  return {
    id: String(row.id),
    workflowRunId: String(row.workflow_run_id),
    nodeId: String(row.node_id),
    nodeType: String(row.node_type),
    status: String(row.status) as WorkflowStepRun['status'],
    attemptNumber: Number(row.attempt_number),
    safeError: row.safe_error ? String(row.safe_error) : null,
  };
}

/* ── Workflows ── */

export async function listWorkflows(projectId: string): Promise<Workflow[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(mapWorkflow);
}

export async function createWorkflow(projectId: string, input: { name: string; description: string }): Promise<{ ok: boolean; message: string; workflow?: Workflow }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to create workflows.' };
  const { data, error } = await supabase
    .from('workflows')
    .insert({ project_id: projectId, name: input.name.trim(), description: input.description.trim(), status: 'draft' })
    .select()
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not create workflow.' };
  return { ok: true, message: `Workflow "${input.name}" created`, workflow: mapWorkflow(data as Row) };
}

export async function updateWorkflow(workflowId: string, patch: { name?: string; description?: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit workflows.' };
  const { error } = await supabase.from('workflows').update(patch).eq('id', workflowId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Workflow updated' };
}

export async function setWorkflowStatus(workflowId: string, status: WorkflowStatus): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to manage workflows.' };
  const { error } = await supabase.from('workflows').update({ status }).eq('id', workflowId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Workflow ${status}` };
}

export async function deleteWorkflow(workflowId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete workflows.' };
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Workflow deleted' };
}

export async function duplicateWorkflow(projectId: string, sourceId: string, sourceName: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to duplicate workflows.' };
  const latest = await getLatestVersion(sourceId);
  const { data, error } = await supabase
    .from('workflows')
    .insert({ project_id: projectId, name: `${sourceName} (copy)`, status: 'draft' })
    .select()
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not duplicate workflow.' };
  const newId = String((data as Row).id);
  if (latest?.definition) {
    await supabase.from('workflow_versions').insert({
      workflow_id: newId,
      version_number: 1,
      definition: latest.definition,
      validation_status: latest.validationStatus,
    });
  }
  return { ok: true, message: 'Workflow duplicated' };
}

/* ── Versions (immutable) ── */

export async function listVersions(workflowId: string): Promise<WorkflowVersion[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false });
  if (error || !data) return [];
  return (data as Row[]).map(mapVersion);
}

export async function getLatestVersion(workflowId: string): Promise<WorkflowVersion | null> {
  const versions = await listVersions(workflowId);
  return versions[0] ?? null;
}

export async function saveVersion(workflowId: string, definition: WorkflowDefinition, validationStatus: ValidationStatus): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to save workflow versions.' };
  const existing = await listVersions(workflowId);
  const nextNumber = (existing[0]?.versionNumber ?? 0) + 1;
  const { data, error } = await supabase
    .from('workflow_versions')
    .insert({
      workflow_id: workflowId,
      version_number: nextNumber,
      definition,
      validation_status: validationStatus,
    })
    .select()
    .single();
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not save version.' };
  const versionId = String((data as Row).id);
  await supabase.from('workflows').update({ current_version_id: versionId }).eq('id', workflowId);
  return { ok: true, message: `Saved version ${nextNumber}` };
}

/* ── Connections ── */

const CONNECTION_COLUMNS = 'id, project_id, connection_type, display_name, status, created_by, created_at, updated_at';

export async function listConnections(projectId: string): Promise<WorkflowConnection[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflow_connections')
    .select(CONNECTION_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(mapConnection);
}

export async function createConnection(projectId: string, input: { connectionType: ConnectionType; displayName: string }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to add connections.' };
  const { error } = await supabase
    .from('workflow_connections')
    .insert({ project_id: projectId, connection_type: input.connectionType, display_name: input.displayName.trim(), status: 'disabled' });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Connection "${input.displayName}" added` };
}

export async function updateConnection(connectionId: string, patch: { displayName?: string; status?: ConnectionStatus }): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to edit connections.' };
  const { error } = await supabase.from('workflow_connections').update(patch).eq('id', connectionId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Connection updated' };
}

export async function deleteConnection(connectionId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Sign in to delete connections.' };
  const { error } = await supabase.from('workflow_connections').delete().eq('id', connectionId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Connection deleted' };
}

/* ── Run history ── */

export async function listWorkflowRuns(projectId: string, testOnly = false): Promise<WorkflowRun[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_test', testOnly)
    .order('started_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Row[]).map(mapRun);
}

export async function listStepRuns(runId: string): Promise<WorkflowStepRun[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('workflow_step_runs')
    .select('*')
    .eq('workflow_run_id', runId)
    .order('started_at', { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(mapStepRun);
}

/* ── Current user role (UI gating only; server RLS is authoritative) ── */

export async function currentProjectRole(projectId: string): Promise<string | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (String(row.status) !== 'active') return null;
  return row.role ? String(row.role) : null;
}