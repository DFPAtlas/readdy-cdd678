import { useCallback, useEffect, useState } from 'react';
import { fetchProjects, type ProjectsProject } from '@/services/projectsService';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setProjects(await fetchProjects());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { projects, loading, error, retry: load };
}