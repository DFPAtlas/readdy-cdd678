import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSandboxClient, resolveSandboxProject } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Types & constants
   ────────────────────────────────────────────────────────────── */

export type AssetKind = 'image' | 'svg' | 'video' | 'document';
export type AssetTypeFilter = 'all' | 'image' | 'video' | 'svg' | 'document' | 'recent' | 'unused';

export type AssetRecord = {
  id: string;
  projectId: string;
  name: string;
  type: AssetKind;
  mimeType: string;
  size: number;
  url: string;
  storagePath?: string;
  altText: string;
  createdAt: string;
  local: boolean;
};

export type UploadStatus = 'queued' | 'uploading' | 'optimizing' | 'success' | 'error';

export type UploadItem = {
  id: string;
  file: File;
  name: string;
  type: AssetKind;
  mimeType: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  assetId?: string;
  objectUrl?: string;
};

export const MAX_BYTES: Record<AssetKind, number> = {
  image: 10 * 1024 * 1024,
  svg: 2 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

const EXTENSION_MIME: Record<string, { kind: AssetKind; mimeType: string }> = {
  jpg: { kind: 'image', mimeType: 'image/jpeg' },
  jpeg: { kind: 'image', mimeType: 'image/jpeg' },
  png: { kind: 'image', mimeType: 'image/png' },
  webp: { kind: 'image', mimeType: 'image/webp' },
  gif: { kind: 'image', mimeType: 'image/gif' },
  svg: { kind: 'svg', mimeType: 'image/svg+xml' },
  mp4: { kind: 'video', mimeType: 'video/mp4' },
  webm: { kind: 'video', mimeType: 'video/webm' },
  pdf: { kind: 'document', mimeType: 'application/pdf' },
  txt: { kind: 'document', mimeType: 'text/plain' },
};

const BUCKET = 'forge-assets';
const LOCAL_META_KEY = 'forge:assets:local:v1';
const IDB_NAME = 'forge-assets-local';
const IDB_STORE = 'blobs';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extensionOf(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

export function classifyFile(name: string, mimeType: string): { kind: AssetKind; mimeType: string } | null {
  const ext = extensionOf(name);
  const byExt = EXTENSION_MIME[ext];
  if (byExt) return { kind: byExt.kind, mimeType: byExt.mimeType };
  // Fallback on MIME type only for well-known types without a mapped extension.
  if (mimeType === 'image/svg+xml') return { kind: 'svg', mimeType: 'image/svg+xml' };
  if (mimeType.startsWith('image/')) return { kind: 'image', mimeType };
  if (mimeType.startsWith('video/')) return { kind: 'video', mimeType };
  if (mimeType === 'application/pdf' || mimeType === 'text/plain') return { kind: 'document', mimeType };
  return null;
}

export function validateFile(file: File): { ok: true; kind: AssetKind; mimeType: string } | { ok: false; error: string } {
  const classified = classifyFile(file.name, file.type);
  if (!classified) {
    return { ok: false, error: `Unsupported file type “${extensionOf(file.name) || file.type || 'unknown'}”. Allowed: JPG, PNG, WebP, GIF, SVG, MP4, WebM, PDF, TXT.` };
  }
  const limit = MAX_BYTES[classified.kind];
  if (file.size > limit) {
    return { ok: false, error: `“${file.name}” is ${formatBytes(file.size)} — the limit for ${classified.kind} files is ${formatBytes(limit)}.` };
  }
  return { ok: true, kind: classified.kind, mimeType: classified.mimeType };
}

/* ──────────────────────────────────────────────────────────────
   IndexedDB helpers (local-only blob storage)
   ────────────────────────────────────────────────────────────── */

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbPutBlob(id: string, blob: Blob): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function idbGetBlob(id: string): Promise<Blob | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(id);
    request.onsuccess = () => { db.close(); resolve((request.result as Blob) ?? null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function idbDeleteBlob(id: string): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/* ──────────────────────────────────────────────────────────────
   Object URL tracking (revoke to avoid leaks)
   ────────────────────────────────────────────────────────────── */

const liveObjectUrls = new Set<string>();

export function createTrackedObjectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  liveObjectUrls.add(url);
  return url;
}

export function revokeObjectUrl(url?: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    liveObjectUrls.delete(url);
  }
}

export function revokeAllObjectUrls(): void {
  liveObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  liveObjectUrls.clear();
}

/* ──────────────────────────────────────────────────────────────
   Image optimisation (browser-side WebP compression)
   ────────────────────────────────────────────────────────────── */

export type OptimizeResult = { blob: Blob; originalSize: number; compressedSize: number };

export async function compressImageToWebP(file: File): Promise<OptimizeResult | null> {
  const kind = classifyFile(file.name, file.type)?.kind;
  if (kind !== 'image') return null;
  if (extensionOf(file.name) === 'gif' || extensionOf(file.name) === 'svg') return null;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image'));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const maxDimension = 2048;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('WebP encode failed'))), 'image/webp', 0.82);
  });

  if (blob.size >= file.size) return null;
  return { blob, originalSize: file.size, compressedSize: blob.size };
}

/* ──────────────────────────────────────────────────────────────
   Asset store (zustand)
   ────────────────────────────────────────────────────────────── */

type AssetStoreState = {
  assets: AssetRecord[];
  loading: boolean;
  error: string | null;
  uploads: UploadItem[];
  syncing: boolean;
  load: () => Promise<void>;
  addFiles: (files: File[], optimize?: boolean) => void;
  cancelUpload: (id: string) => void;
  removeAsset: (id: string, removeCanvasRefs: boolean) => Promise<{ ok: boolean; message?: string }>;
  renameAsset: (id: string, name: string) => Promise<void>;
  setAltText: (id: string, altText: string) => Promise<void>;
  replaceAsset: (id: string, file: File) => Promise<{ ok: boolean; message?: string }>;
  syncLocalAssets: () => Promise<void>;
  clearError: () => void;
};

const seededAssets: AssetRecord[] = [];

function loadLocalMeta(): AssetRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_META_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AssetRecord => Boolean(item && (item as AssetRecord).id));
  } catch {
    return [];
  }
}

function saveLocalMeta(assets: AssetRecord[]) {
  try {
    const localOnly = assets.filter((asset) => asset.local);
    window.localStorage.setItem(LOCAL_META_KEY, JSON.stringify(localOnly));
  } catch { /* storage unavailable */ }
}

async function signUrl(supabase: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

async function fetchCloudAssets(supabase: SupabaseClient, projectId: string): Promise<AssetRecord[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, type, mime_type, size, url, alt_text, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string; name: string; type: string; mime_type: string | null;
    size: number; url: string | null; alt_text: string | null; created_at: string;
  }>;

  const records: AssetRecord[] = [];
  for (const row of rows) {
    const kind = (row.type === 'svg' || row.type === 'image' || row.type === 'video' || row.type === 'document' ? row.type : 'image') as AssetKind;
    let displayUrl = '';
    if (row.url) {
      displayUrl = await signUrl(supabase, row.url);
    }
    records.push({
      id: row.id,
      projectId,
      name: row.name,
      type: kind,
      mimeType: row.mime_type ?? 'application/octet-stream',
      size: row.size,
      url: displayUrl,
      storagePath: row.url ?? undefined,
      altText: row.alt_text ?? '',
      createdAt: row.created_at,
      local: false,
    });
  }
  return records;
}

async function hydrateLocalAssets(meta: AssetRecord[]): Promise<AssetRecord[]> {
  const hydrated: AssetRecord[] = [];
  for (const item of meta) {
    const blob = await idbGetBlob(item.id).catch(() => null);
    hydrated.push({ ...item, url: blob ? createTrackedObjectUrl(blob) : '', local: true });
  }
  return hydrated;
}

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  assets: seededAssets,
  loading: true,
  error: null,
  uploads: [],
  syncing: false,

  clearError: () => set({ error: null }),

  load: async () => {
    set({ loading: true, error: null });
    const supabase = getSandboxClient();
    let cloud: AssetRecord[] = [];
    let local: AssetRecord[] = [];
    if (supabase) {
      const project = await resolveSandboxProject();
      if (project) {
        try {
          cloud = await fetchCloudAssets(supabase, project.projectId);
        } catch {
          cloud = [];
        }
      }
    }
    const meta = loadLocalMeta();
    local = await hydrateLocalAssets(meta);
    const merged = [...cloud, ...local];
    set({ assets: merged, loading: false });
  },

  addFiles: (files, optimize = false) => {
    const store = get();
    const nextUploads = [...store.uploads];
    for (const file of files) {
      const validated = validateFile(file);
      const uploadId = crypto.randomUUID();
      if (!validated.ok) {
        nextUploads.push({
          id: uploadId, file, name: file.name, type: 'image', mimeType: file.type,
          size: file.size, progress: 0, status: 'error', error: validated.error,
        });
        continue;
      }
      nextUploads.push({
        id: uploadId, file, name: file.name, type: validated.kind, mimeType: validated.mimeType,
        size: file.size, progress: 0, status: 'queued',
      });
    }
    set({ uploads: nextUploads });
    void processUploadQueue(get, set, optimize);
  },

  cancelUpload: (id) => {
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === id && (u.status === 'queued' || u.status === 'uploading' || u.status === 'optimizing') ? { ...u, status: 'error', error: 'Cancelled', progress: 0 } : u)),
    }));
  },

  removeAsset: async (id, removeCanvasRefs) => {
    const asset = get().assets.find((a) => a.id === id);
    if (!asset) return { ok: false, message: 'Asset not found' };

    let dbOk = true;
    let storageOk = true;

    if (!asset.local) {
      const supabase = getSandboxClient();
      if (supabase) {
        const { error: dbError } = await supabase.from('assets').delete().eq('id', id);
        if (dbError) dbOk = false;
        if (asset.storagePath) {
          const { error: storageError } = await supabase.storage.from(BUCKET).remove([asset.storagePath]);
          if (storageError) storageOk = false;
        }
      }
    } else {
      await idbDeleteBlob(id).catch(() => { storageOk = false; });
    }

    if (!dbOk || !storageOk) {
      return { ok: false, message: `Could not fully delete “${asset.name}”. ${!dbOk ? 'Database deletion failed. ' : ''}${!storageOk ? 'Storage deletion failed.' : ''}` };
    }

    revokeObjectUrl(asset.url);
    set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
    saveLocalMeta(get().assets);
    return { ok: true };
  },

  renameAsset: async (id, name) => {
    const asset = get().assets.find((a) => a.id === id);
    if (!asset) return;
    const cleanName = name.trim() || asset.name;
    if (asset.local) {
      set((state) => ({ assets: state.assets.map((a) => (a.id === id ? { ...a, name: cleanName } : a)) }));
      saveLocalMeta(get().assets);
      return;
    }
    const supabase = getSandboxClient();
    if (!supabase) return;
    const { error } = await supabase.from('assets').update({ name: cleanName }).eq('id', id);
    if (!error) {
      set((state) => ({ assets: state.assets.map((a) => (a.id === id ? { ...a, name: cleanName } : a)) }));
    }
  },

  setAltText: async (id, altText) => {
    const asset = get().assets.find((a) => a.id === id);
    if (!asset) return;
    if (asset.local) {
      set((state) => ({ assets: state.assets.map((a) => (a.id === id ? { ...a, altText } : a)) }));
      saveLocalMeta(get().assets);
      return;
    }
    const supabase = getSandboxClient();
    if (!supabase) return;
    const { error } = await supabase.from('assets').update({ alt_text: altText }).eq('id', id);
    if (!error) {
      set((state) => ({ assets: state.assets.map((a) => (a.id === id ? { ...a, altText } : a)) }));
    }
  },

  replaceAsset: async (id, file) => {
    const asset = get().assets.find((a) => a.id === id);
    if (!asset) return { ok: false, message: 'Asset not found' };
    const validated = validateFile(file);
    if (!validated.ok) return { ok: false, message: validated.error };

    if (!asset.local) {
      const supabase = getSandboxClient();
      if (!supabase) return { ok: false, message: 'Supabase unavailable' };
      if (!asset.storagePath) return { ok: false, message: 'Asset has no storage path' };
      const { error } = await supabase.storage.from(BUCKET).upload(asset.storagePath, file, { contentType: validated.mimeType, upsert: true });
      if (error) return { ok: false, message: error.message };
      const newUrl = await signUrl(supabase, asset.storagePath);
      const { error: dbError } = await supabase.from('assets').update({ mime_type: validated.mimeType, size: file.size, name: asset.name }).eq('id', id);
      if (dbError) return { ok: false, message: dbError.message };
      set((state) => ({
        assets: state.assets.map((a) => (a.id === id ? { ...a, mimeType: validated.mimeType, size: file.size, url: newUrl } : a)),
      }));
      return { ok: true };
    }

    await idbPutBlob(id, file);
    const newUrl = createTrackedObjectUrl(file);
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, mimeType: validated.mimeType, size: file.size, url: newUrl } : a)),
    }));
    saveLocalMeta(get().assets);
    return { ok: true };
  },

  syncLocalAssets: async () => {
    const supabase = getSandboxClient();
    if (!supabase) return;
    const project = await resolveSandboxProject();
    if (!project) return;
    set({ syncing: true });
    try {
      const localAssets = get().assets.filter((a) => a.local);
      const remaining: AssetRecord[] = [];
      for (const asset of localAssets) {
        const blob = await idbGetBlob(asset.id).catch(() => null);
        if (!blob) { remaining.push(asset); continue; }
        const safeName = `${crypto.randomUUID()}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${project.userId}/${project.projectId}/${safeName}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: asset.mimeType });
        if (error) { remaining.push(asset); continue; }
        const { data: created, error: dbError } = await supabase
          .from('assets')
          .insert({ project_id: project.projectId, name: asset.name, type: asset.type, mime_type: asset.mimeType, size: asset.size, url: path, alt_text: asset.altText })
          .select('id, created_at')
          .single();
        if (dbError || !created) { remaining.push(asset); continue; }
        const url = await signUrl(supabase, path);
        const synced: AssetRecord = { ...asset, id: created.id as string, url, storagePath: path, local: false, createdAt: created.created_at as string };
        await idbDeleteBlob(asset.id).catch(() => undefined);
        revokeObjectUrl(asset.url);
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== asset.id).concat(synced),
        }));
      }
      saveLocalMeta(get().assets);
    } finally {
      set({ syncing: false });
    }
  },
}));

/* ──────────────────────────────────────────────────────────────
   Upload queue
   ────────────────────────────────────────────────────────────── */

async function processUploadQueue(
  get: () => AssetStoreState,
  set: (partial: Partial<AssetStoreState> | ((state: AssetStoreState) => Partial<AssetStoreState>)) => void,
  optimize: boolean,
) {
  const queued = get().uploads.filter((u) => u.status === 'queued');
  for (const upload of queued) {
    // Skip if it was cancelled while waiting.
    if (get().uploads.find((u) => u.id === upload.id && u.status !== 'queued')) continue;
    await processOneUpload(upload, get, set, optimize);
  }
}

async function processOneUpload(
  upload: UploadItem,
  get: () => AssetStoreState,
  set: (partial: Partial<AssetStoreState> | ((state: AssetStoreState) => Partial<AssetStoreState>)) => void,
  optimize: boolean,
) {
  const update = (patch: Partial<UploadItem>) => set((state) => ({ uploads: state.uploads.map((u) => (u.id === upload.id ? { ...u, ...patch } : u)) }));

  let finalFile: File = upload.file;

  if (optimize && upload.type === 'image') {
    update({ status: 'optimizing' });
    try {
      const result = await compressImageToWebP(upload.file);
      if (result) {
        finalFile = new File([result.blob], upload.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      }
    } catch { /* optimisation is best-effort */ }
  }

  const supabase = getSandboxClient();
  const project = supabase ? await resolveSandboxProject() : null;
  const isCloud = Boolean(supabase && project);

  update({ status: 'uploading', progress: 0 });

  if (isCloud && supabase && project) {
    try {
      const safeName = `${crypto.randomUUID()}-${finalFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${project.userId}/${project.projectId}/${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, finalFile, {
        contentType: upload.mimeType,
        upsert: false,
      });
      if (error) throw error;
      update({ progress: 100 });

      const { data: created, error: dbError } = await supabase
        .from('assets')
        .insert({ project_id: project.projectId, name: upload.name, type: upload.type, mime_type: upload.mimeType, size: finalFile.size, url: path, alt_text: '' })
        .select('id, created_at')
        .single();
      if (dbError || !created) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbError ?? new Error('Failed to record asset');
      }
      const url = await signUrl(supabase, path);
      const record: AssetRecord = {
        id: created.id as string, projectId: project.projectId, name: upload.name,
        type: upload.type, mimeType: upload.mimeType, size: finalFile.size,
        url, storagePath: path, altText: '', createdAt: created.created_at as string, local: false,
      };
      set((state) => ({ assets: [record, ...state.assets] }));
      update({ status: 'success', assetId: record.id });
    } catch (err) {
      update({ status: 'error', error: (err as Error).message ?? 'Upload failed' });
    }
    return;
  }

  // Local / offline path — store the blob in IndexedDB.
  try {
    const id = crypto.randomUUID();
    await idbPutBlob(id, finalFile);
    const url = createTrackedObjectUrl(finalFile);
    const record: AssetRecord = {
      id, projectId: project?.projectId ?? 'local', name: upload.name,
      type: upload.type, mimeType: upload.mimeType, size: finalFile.size,
      url, altText: '', createdAt: new Date().toISOString(), local: true,
    };
    set((state) => ({ assets: [record, ...state.assets] }));
    saveLocalMeta(get().assets);
    update({ status: 'success', assetId: record.id, progress: 100 });
  } catch (err) {
    update({ status: 'error', error: (err as Error).message ?? 'Local save failed' });
  }
}

/* ──────────────────────────────────────────────────────────────
   Helpers used by the UI
   ────────────────────────────────────────────────────────────── */

export async function uploadSingleFile(file: File): Promise<{ asset?: AssetRecord; error?: string }> {
  const validated = validateFile(file);
  if (!validated.ok) return { error: validated.error };
  const supabase = getSandboxClient();
  const project = supabase ? await resolveSandboxProject() : null;

  if (supabase && project) {
    try {
      const safeName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${project.userId}/${project.projectId}/${safeName}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: validated.mimeType, upsert: false });
      if (error) throw error;
      const { data: created, error: dbError } = await supabase
        .from('assets')
        .insert({ project_id: project.projectId, name: file.name, type: validated.kind, mime_type: validated.mimeType, size: file.size, url: path, alt_text: '' })
        .select('id, created_at')
        .single();
      if (dbError || !created) throw dbError ?? new Error('Failed to record asset');
      const url = await signUrl(supabase, path);
      const record: AssetRecord = {
        id: created.id as string, projectId: project.projectId, name: file.name, type: validated.kind,
        mimeType: validated.mimeType, size: file.size, url, storagePath: path, altText: '',
        createdAt: created.created_at as string, local: false,
      };
      useAssetStore.setState((state) => ({ assets: [record, ...state.assets] }));
      return { asset: record };
    } catch (err) {
      return { error: (err as Error).message ?? 'Upload failed' };
    }
  }

  try {
    const id = crypto.randomUUID();
    await idbPutBlob(id, file);
    const url = createTrackedObjectUrl(file);
    const record: AssetRecord = {
      id, projectId: project?.projectId ?? 'local', name: file.name, type: validated.kind,
      mimeType: validated.mimeType, size: file.size, url, altText: '',
      createdAt: new Date().toISOString(), local: true,
    };
    useAssetStore.setState((state) => ({ assets: [record, ...state.assets] }));
    saveLocalMeta(useAssetStore.getState().assets);
    return { asset: record };
  } catch (err) {
    return { error: (err as Error).message ?? 'Local save failed' };
  }
}

export async function getDownloadUrl(asset: AssetRecord): Promise<string | null> {
  if (asset.local) return asset.url || null;
  if (asset.url) return asset.url;
  const supabase = getSandboxClient();
  if (!supabase || !asset.storagePath) return null;
  return signUrl(supabase, asset.storagePath);
}

export async function copyAssetUrl(asset: AssetRecord): Promise<boolean> {
  const url = await getDownloadUrl(asset);
  if (!url) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function usageCount(assetId: string, elements: Array<{ asset?: { assetId: string } }>): number {
  return elements.filter((element) => element.asset?.assetId === assetId).length;
}