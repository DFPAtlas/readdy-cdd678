import { getSupabaseClient } from '@/services/supabaseClient';
import {
  DEFAULT_ACCESS_SETTINGS,
  type ProjectAccessSettings,
} from '@/pages/projects/sandbox/sandboxCollaboration';

// ------------------------------------------------------------
// Project settings data model (derived from real Supabase records).
// Only the fields that genuinely exist on the `projects` table are
// exposed: name, description, status, timestamps and the
// `settings.collaboration` object used by the sandbox access config.
// AI configuration is workspace-level only (no project override),
// and there is no build/export config or archive/delete action.
// ------------------------------------------------------------

export interface ProjectSettingsProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string | null;
  workspaceId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectSettingsData {
  authenticated: boolean;
  found: boolean;
  canEdit: boolean;
  project: ProjectSettingsProject | null;
  accessSettings: ProjectAccessSettings;
}

export function createEmptyProjectSettingsData(): ProjectSettingsData {
  return {
    authenticated: false,
    found: false,
    canEdit: false,
    project: null,
    accessSettings: { ...DEFAULT_ACCESS_SETTINGS },
  };
}

// ------------------------------------------------------------
// Fetch
// ------------------------------------------------------------

export async function fetchProjectSettings(projectId: string): Promise<ProjectSettingsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyProjectSettingsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyProjectSettingsData();
  const userId = authData.user.id;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug, description, status, workspace_id, settings, created_at, updated_at')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyProjectSettingsData(), authenticated: true, found: false };
  }

  // Edit permission mirrors RLS: only the workspace owner may update the
  // project row. Member roles are UI-only here; RLS is the real gate.
  const workspaceId = String(project.workspace_id);
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  const canEdit = workspace?.owner_id === userId;

  const settings = (project.settings ?? {}) as Record<string, unknown>;
  const collab = (settings.collaboration ?? {}) as Partial<ProjectAccessSettings>;
  const accessSettings: ProjectAccessSettings = { ...DEFAULT_ACCESS_SETTINGS, ...collab };

  return {
    authenticated: true,
    found: true,
    canEdit,
    project: {
      id: String(project.id),
      name: String(project.name),
      slug: String(project.slug),
      description: project.description ? String(project.description) : null,
      status: project.status ? String(project.status) : null,
      workspaceId,
      createdAt: project.created_at ? String(project.created_at) : null,
      updatedAt: project.updated_at ? String(project.updated_at) : null,
    },
    accessSettings,
  };
}

// ------------------------------------------------------------
// Mutations
// ------------------------------------------------------------

export async function updateProjectDetails(
  projectId: string,
  input: { name: string; description: string },
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to update this project.' };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: 'Sign in to update this project.' };

  const name = input.name.trim();
  if (!name) return { ok: false, message: 'Project name is required.' };

  const { error } = await supabase
    .from('projects')
    .update({
      name,
      description: input.description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) return { ok: false, message: 'Unable to save changes.' };
  return { ok: true, message: 'Project details saved' };
}

export async function updateProjectAccess(
  projectId: string,
  next: ProjectAccessSettings,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Sign in to change access settings.' };

  const { data } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .maybeSingle();

  const existing = (data?.settings ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('projects')
    .update({
      settings: { ...existing, collaboration: next },
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) return { ok: false, message: 'Unable to save access settings.' };
  return { ok: true, message: 'Access settings saved' };
}