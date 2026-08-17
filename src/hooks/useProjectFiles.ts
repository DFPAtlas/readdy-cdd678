import { useCallback, useEffect, useState } from 'react';
import {
  createEmptyFilesData,
  fetchProjectFiles,
  type ProjectFilesData,
} from '@/services/projectFilesService';

export function useProjectFiles(projectId: string | undefined) {
  const [data, setData] = useState<ProjectFilesData>(createEmptyFilesData);
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
      setData(await fetchProjectFiles(projectId));
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