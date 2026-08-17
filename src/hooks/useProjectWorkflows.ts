import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyWorkflowsData,
  fetchProjectWorkflows,
  type ProjectWorkflowsData,
} from '@/services/projectWorkflowsService';

export function useProjectWorkflows(projectId: string | undefined) {
  const [data, setData] = useState<ProjectWorkflowsData>(createEmptyWorkflowsData);
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
      setData(await fetchProjectWorkflows(projectId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!projectId || refreshing) return;
    setRefreshing(true);
    try {
      setData(await fetchProjectWorkflows(projectId));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [projectId, refreshing]);

  return { data, loading, error, retry: load, refresh, refreshing };
}