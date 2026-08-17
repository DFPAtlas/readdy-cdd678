import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyProvidersData,
  fetchProviders,
  type ProvidersData,
} from '@/services/providersService';

export function useProviders() {
  const [data, setData] = useState<ProvidersData>(createEmptyProvidersData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchProviders());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await fetchProviders());
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