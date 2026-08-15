import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Providers — BYOK, connection tests, admin, n8n webhooks.
   Provider secrets are encrypted (AES-GCM) before storage and the
   full key is never returned to a client.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com',
  mistral: 'https://api.mistral.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  forge: '',
  ollama: '',
  custom: Deno.env.get('FORGE_CUSTOM_BASE_URL') ?? '',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function fail(errorCode: string, message: string, status = 400) {
  return json({ code: 'ERROR', errorCode, message }, status);
}

function ok(data: unknown) {
  return json({ code: 'OK', ...(data as Record<string, unknown>) });
}

function maskKey(key: string): string {
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

/* ─── AES-GCM encryption (server-side vault) ─── */

async function vaultKey(): Promise<CryptoKey | null> {
  const secret = Deno.env.get('FORGE_VAULT_KEY');
  if (!secret) return null;
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return await crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptKey(plain: string): Promise<string | null> {
  const key = await vaultKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return JSON.stringify({ iv: toB64(iv), data: toB64(ciphertext) });
}

/* ─── Connection test (never logs the key) ─── */

async function testConnection(providerKey: string, apiKey: string, url?: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (providerKey === 'ollama') {
      const base = url || Deno.env.get('FORGE_OLLAMA_URL');
      if (!base) return { ok: false, message: 'No Ollama gateway configured.' };
      const res = await fetch(`${base.replace(/\/$/, '')}/api/tags`);
      return { ok: res.ok, message: res.ok ? 'Connected' : `HTTP ${res.status}` };
    }
    if (providerKey === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
      return { ok: res.ok, message: res.ok ? 'Connected' : `HTTP ${res.status}` };
    }
    if (providerKey === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return { ok: res.ok, message: res.ok ? 'Connected' : `HTTP ${res.status}` };
    }
    const base = url || PROVIDER_BASE_URLS[providerKey] || '';
    if (!base) return { ok: false, message: 'No base URL configured.' };
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    });
    return { ok: res.ok, message: res.ok ? 'Connected' : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/* ─── Ownership resolution ─── */

async function resolveWorkspace(admin: ReturnType<typeof createClient>, userId: string, workspaceId: string): Promise<boolean> {
  if (workspaceId) {
    const { data: ws } = await admin.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
    if (ws && ws.owner_id === userId) return true;
    const { data: adminProfile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (adminProfile?.role === 'admin') return true;
  }
  return false;
}

/* ─── Main handler ─── */

serve(async (req) => {
  if (req.method !== 'POST') return fail('INVALID_REQUEST', 'Method not allowed', 405);

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return fail('AUTH_REQUIRED', 'Authentication required', 401);

  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return fail('AUTH_REQUIRED', 'Invalid session', 401);
    userId = data.user.id;
  } catch {
    return fail('AUTH_REQUIRED', 'Unable to verify session', 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('INVALID_REQUEST', 'Malformed JSON', 400); }

  const action = typeof body.action === 'string' ? body.action : '';
  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : '';
  const providerKey = typeof body.providerKey === 'string' ? body.providerKey : '';
  const environment = typeof body.environment === 'string' ? body.environment : 'production';

  const isOwner = await resolveWorkspace(admin, userId, workspaceId);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  switch (action) {
    case 'registry': {
      const { data: providers } = await admin.from('ai_providers').select('id, provider_key, display_name, status, base_url, data_classification, last_health_check').order('provider_key');
      const { data: models } = await admin.from('ai_models').select('id, provider_id, model_key, display_name, capabilities, allowed_plans, context_window, relative_speed, relative_cost, routing_priority, data_handling, enabled').order('routing_priority', { ascending: false });
      return ok({ providers: providers ?? [], models: models ?? [] });
    }

    case 'list_keys': {
      if (!isOwner && !isAdmin) return fail('FORBIDDEN', 'Not authorised', 403);
      const { data: keys } = await admin.from('workspace_ai_keys').select('id, provider_key, key_suffix, environment, created_at, last_used_at').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      return ok({ keys: keys ?? [] });
    }

    case 'add_key': {
      if (!isOwner && !isAdmin) return fail('FORBIDDEN', 'Not authorised', 403);
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      if (!workspaceId || !providerKey || !apiKey) return fail('INVALID_REQUEST', 'workspaceId, providerKey and apiKey are required');
      if (!/^(test|production)$/.test(environment)) return fail('INVALID_REQUEST', 'environment must be test or production');
      const test = await testConnection(providerKey, apiKey);
      if (!test.ok) return fail('CONNECTION_FAILED', test.message, 502);
      const encrypted = await encryptKey(apiKey);
      if (!encrypted) return fail('VAULT_UNAVAILABLE', 'Server-side key vault is not configured', 500);
      const { error } = await admin.from('workspace_ai_keys').upsert({
        workspace_id: workspaceId, provider_key: providerKey, encrypted_key: encrypted,
        key_suffix: maskKey(apiKey), environment, created_by: userId, last_used_at: null, updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,provider_key,environment' });
      if (error) return fail('STORE_FAILED', 'Unable to store key', 500);
      return ok({ providerKey, suffix: maskKey(apiKey), environment });
    }

    case 'delete_key': {
      if (!isOwner && !isAdmin) return fail('FORBIDDEN', 'Not authorised', 403);
      const { error } = await admin.from('workspace_ai_keys').delete().eq('workspace_id', workspaceId).eq('provider_key', providerKey).eq('environment', environment);
      if (error) return fail('STORE_FAILED', 'Unable to delete key', 500);
      return ok({ deleted: true });
    }

    case 'test_provider': {
      if (!isOwner && !isAdmin) return fail('FORBIDDEN', 'Not authorised', 403);
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      if (!providerKey || !apiKey) return fail('INVALID_REQUEST', 'providerKey and apiKey are required');
      const test = await testConnection(providerKey, apiKey);
      return ok({ ok: test.ok, message: test.message });
    }

    case 'toggle_model': {
      if (!isAdmin) return fail('FORBIDDEN', 'Admin only', 403);
      const modelId = typeof body.modelId === 'string' ? body.modelId : '';
      const enabled = body.enabled === true;
      if (!modelId) return fail('INVALID_REQUEST', 'modelId is required');
      const { error } = await admin.from('ai_models').update({ enabled, updated_at: new Date().toISOString() }).eq('id', modelId);
      if (error) return fail('STORE_FAILED', 'Unable to update model', 500);
      return ok({ updated: true, enabled });
    }

    case 'n8n_trigger': {
      if (!isAdmin) return fail('FORBIDDEN', 'Admin only', 403);
      const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL');
      const n8nSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
      if (!n8nUrl || !n8nSecret) return fail('NOT_CONFIGURED', 'n8n is not configured', 503);
      const payload = body.payload ?? {};
      const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : crypto.randomUUID();
      const raw = JSON.stringify(payload);
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(n8nSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, enc.encode(raw));
      const sigHex = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const res = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forge-signature': sigHex, 'x-idempotency-key': idempotencyKey },
        body: raw,
      });
      return ok({ status: res.status, ok: res.ok });
    }

    default:
      return fail('INVALID_REQUEST', 'Unknown action', 400);
  }
});
