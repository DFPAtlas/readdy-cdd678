import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type CanvasElementKind =
  | 'Heading'
  | 'Text'
  | 'Button'
  | 'Image'
  | 'Video'
  | 'Container'
  | 'Columns'
  | 'Form';

export type CanvasElement = {
  id: string;
  type: CanvasElementKind;
  name: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  color: string;
};

export type SandboxDocument = {
  schemaVersion: 1;
  projectName: string;
  viewport: 'desktop' | 'tablet' | 'mobile';
  elements: CanvasElement[];
  updatedAt: string;
};

export type SaveResult = {
  storage: 'cloud' | 'local';
  projectId?: string;
};

const STORAGE_KEY = 'forge:sandbox:portfolio-website:v1';
let client: SupabaseClient | null | undefined;

function getClient() {
  if (client !== undefined) return client;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  client = url && key ? createClient(url, key) : null;
  return client;
}

function isSandboxDocument(value: unknown): value is SandboxDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SandboxDocument>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.elements);
}

function loadLocal() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isSandboxDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveLocal(document: SandboxDocument) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
}

async function getOwnedWorkspaceId(supabase: SupabaseClient, userId: string, email?: string) {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: email ?? null,
      display_name: email?.split('@')[0] ?? 'Forge user',
      initials: (email?.slice(0, 2) ?? 'FU').toUpperCase(),
    },
    { onConflict: 'id' },
  );
  if (profileError) throw profileError;

  const { data: existing, error: lookupError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from('workspaces')
    .insert({
      name: 'My Forge Workspace',
      slug: `forge-${userId}`,
      owner_id: userId,
      description: 'Created by the Forge visual sandbox',
    })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id as string;
}

async function loadCloud(supabase: SupabaseClient) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', authData.user.id)
    .limit(1);
  if (workspaceError || !workspaces?.[0]?.id) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('blueprint')
    .eq('workspace_id', workspaces[0].id)
    .eq('slug', 'portfolio-website')
    .limit(1)
    .maybeSingle();
  if (projectError || !isSandboxDocument(project?.blueprint)) return null;
  return project.blueprint;
}

export async function loadSandboxDocument() {
  const local = loadLocal();
  const supabase = getClient();
  if (!supabase) return local;

  try {
    const cloud = await loadCloud(supabase);
    if (!cloud) return local;
    if (!local || Date.parse(cloud.updatedAt) >= Date.parse(local.updatedAt)) {
      saveLocal(cloud);
      return cloud;
    }
  } catch {
    // Offline or unconfigured cloud storage must never block the editor.
  }
  return local;
}

export async function saveSandboxDocument(document: SandboxDocument): Promise<SaveResult> {
  saveLocal(document);
  const supabase = getClient();
  if (!supabase) return { storage: 'local' };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { storage: 'local' };

  const workspaceId = await getOwnedWorkspaceId(supabase, authData.user.id, authData.user.email);
  const { data: existing, error: lookupError } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('slug', 'portfolio-website')
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await supabase
      .from('projects')
      .update({ blueprint: document, updated_at: document.updatedAt })
      .eq('id', existing.id);
    if (error) throw error;
    return { storage: 'cloud', projectId: existing.id as string };
  }

  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert({
      name: document.projectName,
      slug: 'portfolio-website',
      workspace_id: workspaceId,
      status: 'draft',
      blueprint: document,
    })
    .select('id')
    .single();
  if (createError) throw createError;
  return { storage: 'cloud', projectId: created.id as string };
}
