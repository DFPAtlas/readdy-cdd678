import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyDashboardData,
  fetchDashboardData,
  type DashboardData,
} from '@/services/dashboardData';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(createEmptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load };
}