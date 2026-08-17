import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyActivityData,
  fetchActivity,
  type ActivityData,
} from '@/services/activityService';

export function useActivity() {
  const [data, setData] = useState<ActivityData>(createEmptyActivityData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchActivity();
      setData(result);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, lastUpdated, retry: load };
}