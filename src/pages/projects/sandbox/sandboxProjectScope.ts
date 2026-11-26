import { useAuthStore } from '@/stores/authStore';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Capture this ID before awaiting work; never resolve a default portfolio project. */
export function sandboxProjectId(pathname = window.location.pathname): string | null {
  const match = /^\/projects\/([^/]+)\/sandbox\/?$/.exec(pathname);
  return match && UUID.test(match[1]) ? match[1] : null;
}

export function projectStorageKey(userId: string, projectId: string, kind: string): string {
  if (!UUID.test(userId) || !UUID.test(projectId)) throw new Error('Invalid project storage scope');
  return `forge:sandbox:${userId}:${projectId}:${kind}:v2`;
}

export function currentProjectStorageKey(kind: string): string {
  const projectId = sandboxProjectId();
  const userId = useAuthStore.getState().user?.id;
  if (!projectId || !userId) throw new Error('No authenticated project is open');
  return projectStorageKey(userId, projectId, kind);
}
