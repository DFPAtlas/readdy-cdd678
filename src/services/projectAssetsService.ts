import { getSupabaseClient } from '@/services/supabaseClient';
import {
  validateFile,
  revokeObjectUrl,
  type AssetRecord,
  type AssetKind,
} from '@/pages/projects/sandbox/sandboxAssets';

const BUCKET = 'forge-assets';

export interface ProjectAssetsData {
  authenticated: boolean;
  found: boolean;
  project: { id: string; name: string } | null;
  assets: AssetRecord[];
}

export function createEmptyAssetsData(): ProjectAssetsData {
  return { authenticated: false, found: false, project: null, assets: [] };
}

async function signUrl(path: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) return '';
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

export async function fetchProjectAssets(projectId: string): Promise<ProjectAssetsData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyAssetsData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyAssetsData();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) {
    return { ...createEmptyAssetsData(), authenticated: true, found: false };
  }

  const { data: rows, error: assetsError } = await supabase
    .from('assets')
    .select('id, name, type, mime_type, size, url, alt_text, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (assetsError) throw assetsError;

  const assets: AssetRecord[] = [];
  for (const row of rows ?? []) {
    const type = (['image', 'svg', 'video', 'document'].includes(row.type)
      ? row.type
      : 'image') as AssetKind;
    let url = '';
    if (row.url) url = await signUrl(row.url);
    assets.push({
      id: row.id,
      projectId,
      name: row.name,
      type,
      mimeType: row.mime_type ?? 'application/octet-stream',
      size: row.size,
      url,
      storagePath: row.url ?? undefined,
      altText: row.alt_text ?? '',
      createdAt: row.created_at,
      local: false,
    });
  }

  return {
    authenticated: true,
    found: true,
    project: { id: project.id, name: project.name },
    assets,
  };
}

export async function uploadProjectAsset(
  projectId: string,
  file: File,
): Promise<{ ok: boolean; asset?: AssetRecord; error?: string }> {
  const validated = validateFile(file);
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Storage unavailable' };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { ok: false, error: 'Sign in required' };

  const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `${authData.user.id}/${projectId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: validated.mimeType, upsert: false });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: created, error: dbError } = await supabase
    .from('assets')
    .insert({
      project_id: projectId,
      name: file.name,
      type: validated.kind,
      mime_type: validated.mimeType,
      size: file.size,
      url: path,
      alt_text: '',
    })
    .select('id, created_at')
    .single();

  if (dbError || !created) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: dbError?.message ?? 'Failed to record asset' };
  }

  const url = await signUrl(path);
  const asset: AssetRecord = {
    id: created.id as string,
    projectId,
    name: file.name,
    type: validated.kind,
    mimeType: validated.mimeType,
    size: file.size,
    url,
    storagePath: path,
    altText: '',
    createdAt: created.created_at as string,
    local: false,
  };
  return { ok: true, asset };
}

export async function deleteProjectAsset(
  asset: AssetRecord,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Storage unavailable' };

  const { error: dbError } = await supabase.from('assets').delete().eq('id', asset.id);
  if (dbError) return { ok: false, error: dbError.message };

  if (asset.storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([asset.storagePath]);
    if (storageError) return { ok: false, error: storageError.message };
  }

  revokeObjectUrl(asset.url);
  return { ok: true };
}

export async function renameProjectAsset(
  id: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Storage unavailable' };

  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: 'Name cannot be empty' };

  const { error } = await supabase.from('assets').update({ name: cleanName }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}