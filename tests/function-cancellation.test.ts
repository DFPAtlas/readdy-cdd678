import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { invokeFunctionWithSignal } from '../src/services/invokeFunctionWithSignal';

function sessionClient() {
  const client = createClient('https://forge.example', 'test-anon', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  vi.spyOn(client.auth, 'getSession').mockResolvedValue({ data: { session: {
    access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer',
    user: { id: 'synthetic-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-26T00:00:00Z' },
  } }, error: null });
  return client;
}

beforeEach(() => {
  vi.stubEnv('VITE_PUBLIC_SUPABASE_URL', 'https://forge.example');
  vi.stubEnv('VITE_PUBLIC_SUPABASE_ANON_KEY', 'test-anon');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('authenticated cancellable AI transport', () => {
  it('uses the existing auth session, endpoint and exact request signal', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'OK' }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', mockFetch);
    const client = sessionClient(), controller = new AbortController();
    const result = await invokeFunctionWithSignal(client, 'forge-ai', { projectId: 'site-a' }, controller.signal);
    expect(result.data).toEqual({ code: 'OK' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://forge.example/functions/v1/forge-ai');
    expect(init.signal).toBe(controller.signal);
    expect(init.headers).toMatchObject({ apikey: 'test-anon', Authorization: 'Bearer synthetic-access' });
    expect(JSON.parse(init.body)).toEqual({ projectId: 'site-a' });
  });
  it('does not start any fetch for an already-cancelled request', async () => {
    const mockFetch = vi.fn(); vi.stubGlobal('fetch', mockFetch);
    const client = sessionClient(), controller = new AbortController(); controller.abort();
    await expect(invokeFunctionWithSignal(client, 'forge-ai', {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mockFetch).not.toHaveBeenCalled(); expect(client.auth.getSession).not.toHaveBeenCalled();
  });
  it('aborts an in-flight fetch and propagates cancellation instead of a provider-failure result', async () => {
    let started: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Stopped', 'AbortError')), { once: true });
      started();
    })));
    const controller = new AbortController();
    const pending = invokeFunctionWithSignal(sessionClient(), 'forge-ai', {}, controller.signal);
    const outcome = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await ready; controller.abort(); await outcome;
  });
  it('retains the SDK HTTP error result for a failed edge function', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })));
    const result = await invokeFunctionWithSignal(sessionClient(), 'forge-ai', {}, new AbortController().signal);
    expect(result.error).toBeInstanceOf(FunctionsHttpError);
  });
  it('fails before fetch if the auth session is absent', async () => {
    const mockFetch = vi.fn(); vi.stubGlobal('fetch', mockFetch);
    const client = sessionClient(); vi.mocked(client.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    await expect(invokeFunctionWithSignal(client, 'forge-ai', {}, new AbortController().signal)).rejects.toThrow('Authentication required');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
