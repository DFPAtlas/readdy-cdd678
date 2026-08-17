import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyVersionsData,
  fetchProjectVersions,
  type ProjectVersionsData,
} from '@/services/projectVersionsService';

export function useProjectVersions(projectId: string | undefined) {
  const [data, setData] = useState<ProjectVersionsData>(createEmptyVersionsData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      setData(await fetchProjectVersions(projectId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    try {
      setData(await fetchProjectVersions(projectId));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [projectId, refreshing]);

  return { data, loading, error, retry: load, refresh, refreshing };
}