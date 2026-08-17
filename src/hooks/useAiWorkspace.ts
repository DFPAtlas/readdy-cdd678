import { useCallback, useEffect, useState } from 'react';
import { fetchAiWorkspace, type AiWorkspaceSnapshot } from '@/services/agentsService';

export function useAiWorkspace() {
  const [data, setData] = useState<AiWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchAiWorkspace());
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