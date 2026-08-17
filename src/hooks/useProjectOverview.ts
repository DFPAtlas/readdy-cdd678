import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyOverviewData,
  fetchProjectOverview,
  type ProjectOverviewData,
} from '@/services/projectOverviewService';

export function useProjectOverview(projectId: string | undefined) {
  const [data, setData] = useState<ProjectOverviewData>(createEmptyOverviewData);
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
      setData(await fetchProjectOverview(projectId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load };
}