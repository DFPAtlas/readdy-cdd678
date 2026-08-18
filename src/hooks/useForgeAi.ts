import { useCallback, useEffect, useState } from 'react';
import { createEmptyForgeAiStatus, fetchForgeAiStatus, type ForgeAiStatus } from '@/services/forgeAiService';

export function useForgeAi() {
  const [data, setData] = useState<ForgeAiStatus>(createEmptyForgeAiStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchForgeAiStatus());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await fetchForgeAiStatus());
    } catch {
      // Keep existing data on a background refresh failure.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load, refresh, refreshing };
}