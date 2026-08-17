import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyProjectSettingsData,
  fetchProjectSettings,
  type ProjectSettingsData,
} from '@/services/projectSettingsService';

export function useProjectSettings(projectId: string | undefined) {
  const [data, setData] = useState<ProjectSettingsData>(createEmptyProjectSettingsData);
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
      setData(await fetchProjectSettings(projectId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setRefreshing(true);
    try {
      setData(await fetchProjectSettings(projectId));
    } catch {
      // Keep existing data on a background refresh failure.
    } finally {
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load, refresh, refreshing };
}