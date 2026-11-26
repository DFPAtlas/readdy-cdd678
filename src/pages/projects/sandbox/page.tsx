import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import ForgeSandbox from './ConceptSandbox';
import { loadSandboxDocument, type SandboxDocument } from './sandboxPersistence';

type LoadState = { key: string; document?: SandboxDocument; error?: string };

export default function SandboxPage() {
  const { projectId = '' } = useParams();
  const userId = useAuthStore((state) => state.user?.id);
  const key = `${userId}:${projectId}`;
  const [state, setState] = useState<LoadState>({ key: '' });
  useEffect(() => {
    let active = true;
    setState({ key });
    void loadSandboxDocument(projectId).then(
      (document) => { if (active) setState({ key, document }); },
      (error: unknown) => { if (active) setState({ key, error: error instanceof Error ? error.message : 'Could not load project' }); },
    );
    return () => { active = false; };
  }, [key, projectId]);
  if (state.key !== key || (!state.document && !state.error)) {
    return <main role="status" className="p-6">Loading your project…</main>;
  }
  if (state.error || !state.document) {
    return <main role="alert" className="p-6"><h1>Project unavailable</h1><p>{state.error}</p><Link to="/projects">Back to my websites</Link></main>;
  }
  return <ForgeSandbox key={key} projectId={projectId} initialDocument={state.document} />;
}
