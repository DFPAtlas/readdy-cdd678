import { beforeEach, describe, expect, it, vi } from 'vitest';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const V = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const mocks = vi.hoisted(() => ({ getClient: vi.fn(), user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }));
vi.mock('@/services/supabaseClient', () => ({ getSupabaseClient: mocks.getClient }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: mocks.user }) } }));
import { createBlankDocument, loadSandboxDocument, resolveSandboxProject, saveSandboxDocument } from '../src/pages/projects/sandbox/sandboxPersistence';
import { currentProjectStorageKey, projectStorageKey, sandboxProjectId } from '../src/pages/projects/sandbox/sandboxProjectScope';

const records = new Map<string, { id: string; name: string; workspace_id: string; blueprint: unknown }>();
const local = new Map<string, string>();
let updateFails = false;
let updateDenied = false;
const writes: string[] = [];
function fakeClient() {
  return {
    auth: { getUser: async () => ({ data: { user: mocks.user }, error: null }) },
    from: (table: string) => {
      expect(table).toBe('projects');
      const filters: Record<string, string> = {};
      let update: Record<string, unknown> | undefined;
      const query = {
        select: () => query,
        eq: (key: string, value: string) => { filters[key] = value; return query; },
        update: (value: Record<string, unknown>) => { update = value; return query; },
        maybeSingle: async () => {
          const record = records.get(filters.id);
          if (!record || (filters.workspace_id && filters.workspace_id !== record.workspace_id)) return { data: null, error: null };
          if (update) {
            if (updateFails) return { data: null, error: new Error('Cloud unavailable') };
            if (updateDenied) return { data: null, error: null };
            writes.push(record.id);
            record.blueprint = update.blueprint;
          }
          return { data: record, error: null };
        },
      };
      return query;
    },
  };
}

beforeEach(() => {
  mocks.user.id = U;
  records.clear(); local.clear(); writes.length = 0;
  updateFails = false; updateDenied = false;
  for (const [id, name] of [[A, 'First site'], [B, 'Second site']]) records.set(id, { id, name, workspace_id: 'workspace', blueprint: null });
  vi.stubGlobal('window', { location: { pathname: `/projects/${A}/sandbox` }, localStorage: {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => local.set(key, value),
    removeItem: (key: string) => local.delete(key),
  } });
  mocks.getClient.mockReturnValue(fakeClient());
});

describe('requested project isolation', () => {
  it('resolves the requested ID, not a shared slug; missing IDs do not create projects', async () => {
    expect((await resolveSandboxProject(B))?.projectId).toBe(B);
    records.delete(A);
    expect(await resolveSandboxProject(A)).toBeNull();
    expect(writes).toEqual([]);
    expect(records.size).toBe(1);
  });
  it('rejects invalid or non-project routes', () => {
    expect(sandboxProjectId('/projects/anything/sandbox')).toBeNull();
    expect(sandboxProjectId('/pricing')).toBeNull();
    expect(sandboxProjectId(`/projects/${A}/sandbox`)).toBe(A);
  });
  it('starts an empty project with an actual draft home page', async () => {
    const doc = await loadSandboxDocument(A);
    expect(doc.projectName).toBe('First site');
    expect(doc.projectId).toBe(A);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].status).toBe('draft');
    expect(doc.activePageId).toBe(doc.pages[0].id);
    expect(doc.pages[0].elements).toEqual([]);
  });
  it('isolates cached documents by both account and project', async () => {
    const a = await loadSandboxDocument(A);
    a.pages[0].name = 'Only on first site';
    await saveSandboxDocument(a, A);
    expect((await loadSandboxDocument(B)).pages[0].name).toBe('Home');
    expect(projectStorageKey(U, A, 'document')).not.toBe(projectStorageKey(V, A, 'document'));
    expect(projectStorageKey(U, A, 'recovery')).not.toBe(projectStorageKey(U, B, 'recovery'));
    const previous = currentProjectStorageKey('versions');
    mocks.user.id = V;
    expect(currentProjectStorageKey('versions')).not.toBe(previous);
  });
  it('never adopts the ambiguous old shared local cache', async () => {
    const old = createBlankDocument('Someone else');
    old.updatedAt = '2099-01-01T00:00:00Z';
    old.pages[0].name = 'Wrong page';
    local.set('forge:sandbox:portfolio-website:v1', JSON.stringify(old));
    expect((await loadSandboxDocument(A)).pages[0].name).toBe('Home');
    expect(local.has('forge:sandbox:portfolio-website:v1')).toBe(true);
  });
  it('rejects a cross-project save before any update', async () => {
    const doc = await loadSandboxDocument(A);
    await expect(saveSandboxDocument(doc, B)).rejects.toThrow('Project changed');
    expect(writes).toEqual([]);
  });
  it('requires access before revealing even a scoped local cache', async () => {
    const doc = { ...createBlankDocument('Private'), projectId: A };
    local.set(projectStorageKey(U, A, 'document'), JSON.stringify(doc));
    records.delete(A);
    await expect(loadSandboxDocument(A)).rejects.toThrow('access denied');
  });
  it('blocks invalid existing blueprints rather than overwriting them with a blank page', async () => {
    records.get(A)!.blueprint = { schemaVersion: 4, pages: 'corrupt' };
    await expect(loadSandboxDocument(A)).rejects.toThrow('recovery');
    expect(writes).toEqual([]);
  });
  it('surfaces zero-row update failures rather than claiming a cloud save', async () => {
    const doc = await loadSandboxDocument(A);
    updateDenied = true;
    await expect(saveSandboxDocument(doc, A)).rejects.toThrow('not saved');
  });
  it('retains a correctly scoped local copy after a cloud error', async () => {
    const doc = await loadSandboxDocument(A);
    updateFails = true;
    await expect(saveSandboxDocument(doc, A)).rejects.toThrow('Cloud unavailable');
    expect(local.has(projectStorageKey(U, A, 'document'))).toBe(true);
    expect(writes).toEqual([]);
  });
  it('can save to cloud when browser storage is unavailable', async () => {
    const doc = await loadSandboxDocument(A);
    window.localStorage.setItem = () => { throw new Error('quota'); };
    expect(await saveSandboxDocument(doc, A)).toEqual({ storage: 'cloud', projectId: A });
    expect(writes).toEqual([A]);
  });
});
