import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyAssetsData,
  fetchProjectAssets,
  uploadProjectAsset,
  deleteProjectAsset,
  renameProjectAsset,
  type ProjectAssetsData,
} from '@/services/projectAssetsService';
import type { AssetRecord } from '@/pages/projects/sandbox/sandboxAssets';

export type AssetMutationResult = { ok: boolean; error?: string };

export function useProjectAssets(projectId: string | undefined) {
  const [data, setData] = useState<ProjectAssetsData>(createEmptyAssetsData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setData(await fetchProjectAssets(projectId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (file: File): Promise<AssetMutationResult> => {
      if (!projectId) return { ok: false, error: 'No project' };
      const result = await uploadProjectAsset(projectId, file);
      if (result.ok && result.asset) {
        setData((d) => ({ ...d, assets: [result.asset!, ...d.assets] }));
      }
      return { ok: result.ok, error: result.error };
    },
    [projectId],
  );

  const remove = useCallback(async (asset: AssetRecord): Promise<AssetMutationResult> => {
    const result = await deleteProjectAsset(asset);
    if (result.ok) {
      setData((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== asset.id) }));
    }
    return { ok: result.ok, error: result.error };
  }, []);

  const rename = useCallback(
    async (id: string, name: string): Promise<AssetMutationResult> => {
      const result = await renameProjectAsset(id, name);
      if (result.ok) {
        setData((d) => ({
          ...d,
          assets: d.assets.map((a) => (a.id === id ? { ...a, name: name.trim() } : a)),
        }));
      }
      return { ok: result.ok, error: result.error };
    },
    [],
  );

  return { data, loading, error, retry: load, upload, remove, rename };
}