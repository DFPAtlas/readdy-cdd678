import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEmptySnapshot,
  deriveStatus,
  fetchSystemStatus,
  type DerivedStatus,
  type StatusSnapshot,
} from '@/services/systemStatusService';

export function useSystemStatus() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot>(createEmptySnapshot);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSnapshot(await fetchSystemStatus());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSnapshot(await fetchSystemStatus());
    } catch {
      // Keep the last known snapshot on a background refresh failure.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const derived: DerivedStatus = useMemo(() => deriveStatus(snapshot), [snapshot]);

  return { snapshot, derived, loading, error, retry: load, refresh, refreshing };
}