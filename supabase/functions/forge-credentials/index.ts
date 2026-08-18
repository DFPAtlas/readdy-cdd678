import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Credentials — centrally managed platform API credential vault.

   Forge moves away from customer-managed provider keys (BYOK) toward platform
   credentials controlled by authorised Forge administrators. Customers never
   supply OpenAI / Anthropic / Google / other keys.

   SECURITY
   * `encrypted_secret` is AES-256-GCM (versioned payload) using the
     server-only `FORGE_VAULT_KEY`. It is NEVER returned or logged.
   * Only safe metadata and a masked `key_suffix` leave this function.
   * Every action re-verifies `secrets.manage` / `super_admin` server-side;
     client-side role checks are never treated as authority.
   * Every attempted mutation and test writes an audit event (no secrets).

   Legacy `workspace_ai_keys` remains BYOK infrastructure and is NOT deleted.
   It is preserved for safe migration/rollback and is NOT the default source of
   AI credentials after the routing phase.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/* ─── Provider registry (safe display info + validation rules; no secrets) ─── */

type ProviderKind = 'ai' | 'search' | 'email' | 'automation' | 'payments' | 'infrastructure';

type ProviderInfo = {
  key: string;
  label: string;
  kind: ProviderKind;
  needsBaseUrl: boolean;
  baseUrl: string;
  description: string;
};

const PROVIDER_REGISTRY: Record<string, ProviderInfo> = {
  openai: { key: 'openai', label: 'OpenAI', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://api.openai.com/v1', description: 'GPT models via the OpenAI API.' },
  anthropic: { key: 'anthropic', label: 'Anthropic', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://api.anthropic.com/v1', description: 'Claude models via the Anthropic API.' },
  google: { key: 'google', label: 'Google Gemini', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://generativelanguage.googleapis.com', description: 'Gemini models via the Google Generative Language API.' },
  mistral: { key: 'mistral', label: 'Mistral', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://api.mistral.ai/v1', description: 'Mistral models via the Mistral API.' },
  groq: { key: 'groq', label: 'Groq', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://api.groq.com/openai/v1', description: 'Fast inference via the Groq API.' },
  openrouter: { key: 'openrouter', label: 'OpenRouter', kind: 'ai', needsBaseUrl: false, baseUrl: 'https://openrouter.ai/api/v1', description: 'Aggregated model routing via OpenRouter.' },
  forge: { key: 'forge', label: 'Forge Hosted AI', kind: 'ai', needsBaseUrl: true, baseUrl: '', description: 'Forge-hosted inference endpoint (base URL required).' },
  ollama: { key: 'ollama', label: 'Ollama', kind: 'ai', needsBaseUrl: true, baseUrl: '', description: 'Self-hosted Ollama gateway (base URL required).' },
  resend: { key: 'resend', label: 'Resend', kind: 'email', needsBaseUrl: false, baseUrl: 'https://api.resend.com', description: 'Transactional email via the Resend API.' },
  tavily: { key: 'tavily', label: 'Tavily', kind: 'search', needsBaseUrl: false, baseUrl: 'https://api.tavily.com', description: 'Web search for agent research.' },
  n8n: { key: 'n8n', label: 'n8n', kind: 'automation', needsBaseUrl: true, baseUrl: '', description: 'n8n webhook secret (base URL / health endpoint required).' },
  github: { key: 'github', label: 'GitHub', kind: 'infrastructure', needsBaseUrl: false, baseUrl: 'https://api.github.com', description: 'GitHub token for authenticated API access.' },
  stripe: { key: 'stripe', label: 'Stripe', kind: 'payments', needsBaseUrl: false, baseUrl: 'https://api.stripe.com', description: 'Stripe secret key for account-level operations.' },
};

function registryEntries(): Array<Omit<ProviderInfo, 'baseUrl'>> {
  return Object.values(PROVIDER_REGISTRY).map(({ key, label, kind, needsBaseUrl, description }) => ({
    key, label, kind, needsBaseUrl, description,
  }));
}

/* ─── Response helpers ─── */

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
  if (!key) return '••••';
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

/* ─── Base64 helpers (binary-safe) ─── */

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ─── AES-256-GCM encryption (versioned payload) ─── */

const VAULT_VERSION = 1;
const VAULT_ALG = 'AES-GCM';

async function vaultCryptoKey(usage: 'encrypt' | 'decrypt'): Promise<CryptoKey | null> {
  const secret = Deno.env.get('FORGE_VAULT_KEY');
  if (!secret) return null;
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return await crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, [usage]);
}

async function encryptSecret(plain: string): Promise<string | null> {
  const key = await vaultCryptoKey('encrypt');
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return JSON.stringify({
    v: VAULT_VERSION,
    alg: VAULT_ALG,
    iv: bytesToB64(iv),
    data: bytesToB64(new Uint8Array(ciphertext)),
  });
}

async function decryptSecret(encryptedSecret: string): Promise<string | null> {
  try {
    const key = await vaultCryptoKey('decrypt');
    if (!key) return null;
    const payload = JSON.parse(encryptedSecret) as Record<string, unknown>;
    if (payload.v !== VAULT_VERSION) return null;
    if (payload.alg !== VAULT_ALG) return null;
    if (typeof payload.iv !== 'string' || typeof payload.data !== 'string') return null;
    const iv = b64ToBytes(payload.iv);
    const ciphertext = b64ToBytes(payload.data);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

/* ─── Provider-specific connection tests (sanitised, never raw bodies) ─── */

type TestOutcome = { ok: boolean; code: string; message: string };

function testOk(): TestOutcome { return { ok: true, code: 'CONNECTED', message: 'Connected' }; }
function testFail(status: number): TestOutcome {
  if (status === 401 || status === 403) return { ok: false, code: 'AUTH_FAILED', message: `Authentication rejected (HTTP ${status})` };
  return { ok: false, code: 'CONNECTION_FAILED', message: `Provider responded with HTTP ${status}` };
}

async function testProvider(providerKey: string, secret: string, baseUrl?: string): Promise<TestOutcome> {
  const info = PROVIDER_REGISTRY[providerKey];
  if (!info) return { ok: false, code: 'UNKNOWN_PROVIDER', message: 'Unknown provider' };

  try {
    const base = (baseUrl || info.baseUrl).replace(/\/$/, '');

    if (info.needsBaseUrl && !base) {
      return { ok: false, code: 'BASE_URL_REQUIRED', message: `${info.label} requires a base URL` };
    }

    switch (providerKey) {
      case 'openai':
      case 'mistral':
      case 'groq':
      case 'openrouter': {
        const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${secret}` } });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': secret, 'anthropic-version': '2023-06-01' },
        });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'google': {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secret}`);
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'ollama': {
        const res = await fetch(`${base}/api/tags`);
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'resend': {
        const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${secret}` } });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'tavily': {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
          body: JSON.stringify({ query: 'credential check', max_results: 1 }),
        });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'stripe': {
        const res = await fetch('https://api.stripe.com/v1/account', { headers: { Authorization: `Bearer ${secret}` } });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'github': {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${secret}`, 'X-GitHub-Api-Version': '2022-11-28', Accept: 'application/vnd.github+json' },
        });
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'n8n': {
        const res = await fetch(`${base}/healthz`);
        return res.ok ? testOk() : testFail(res.status);
      }

      case 'forge': {
        const res = await fetch(`${base}/models`);
        return res.ok ? testOk() : testFail(res.status);
      }

      default:
        return { ok: false, code: 'UNKNOWN_PROVIDER', message: 'Unknown provider' };
    }
  } catch {
    return { ok: false, code: 'TEST_ERROR', message: 'Unable to reach provider' };
  }
}

/* ─── Server-side authority (single source: platform_admins) ─── */

async function canManageSecrets(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from('platform_admins')
    .select('role, permissions, active').eq('user_id', userId).maybeSingle();
  if (!data?.active) return false;
  if (data.role === 'super_admin') return true;
  const stored: string[] = Array.isArray(data.permissions)
    ? data.permissions.filter((p: unknown) => typeof p === 'string')
    : [];
  return stored.includes('*') || stored.includes('secrets.manage');
}

/* ─── Audit logging (never secrets) ─── */

async function audit(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  targetId: string | null,
  safeMetadata: Record<string, unknown> | null,
): Promise<void> {
  await admin.from('admin_audit_events').insert({
    admin_user_id: actorId, action,
    target_type: 'platform_api_credential', target_id: targetId,
    reason: null, safe_metadata: safeMetadata,
  }).then(() => {}).catch(() => {});
}

/* ─── Safe row projection (never encrypted_secret) ─── */

function safeRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    provider_key: row.provider_key,
    credential_type: row.credential_type,
    key_suffix: row.key_suffix,
    environment: row.environment,
    status: row.status,
    metadata: row.metadata ?? {},
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_tested_at: row.last_tested_at ?? null,
    last_test_status: row.last_test_status ?? null,
    last_test_message: row.last_test_message ?? null,
    last_used_at: row.last_used_at ?? null,
    rotated_at: row.rotated_at ?? null,
  };
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
    if (error || !data.user) return fail('AUTH_REQUIRED', 'Invalid or expired session', 401);
    userId = data.user.id;
  } catch {
    return fail('AUTH_REQUIRED', 'Unable to verify session', 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('INVALID_REQUEST', 'Malformed JSON', 400); }

  const action = typeof body.action === 'string' ? body.action : '';

  const allowed = await canManageSecrets(admin, userId);
  if (!allowed) return fail('FORBIDDEN', 'You do not have permission to manage platform credentials', 403);

  const providerKey = typeof body.providerKey === 'string' ? body.providerKey.trim() : '';
  const environment = typeof body.environment === 'string' ? body.environment : 'production';
  const credentialType = typeof body.credentialType === 'string' && body.credentialType.trim()
    ? body.credentialType.trim() : 'api_key';
  const id = typeof body.id === 'string' ? body.id : '';

  const validEnvironment = (env: string) => env === 'test' || env === 'production';

  switch (action) {
    case 'list_providers': {
      return ok({ providers: registryEntries() });
    }

    case 'list_platform_credentials': {
      const { data: rows } = await admin.from('platform_api_credentials')
        .select('*').order('provider_key').order('environment');
      const list = rows ?? [];
      const actorIds = [...new Set(
        list.flatMap((r) => [r.created_by, r.updated_by]).filter((v): v is string => typeof v === 'string' && v.length > 0),
      )];
      const { data: profiles } = actorIds.length
        ? await admin.from('profiles').select('id, email, display_name').in('id', actorIds)
        : { data: [] as Record<string, unknown>[] };
      const profileMap: Record<string, Record<string, unknown>> = {};
      for (const p of (profiles ?? [])) profileMap[p.id as string] = p;
      const actorLabel = (id: unknown): string | null => {
        if (typeof id !== 'string' || !id) return null;
        const p = profileMap[id];
        return (p?.email ?? p?.display_name ?? null) as string | null;
      };
      return ok({ credentials: list.map((row) => ({
        ...safeRow(row),
        created_by_email: actorLabel(row.created_by),
        updated_by_email: actorLabel(row.updated_by),
        updated_by_name: (typeof row.updated_by === 'string' && row.updated_by) ? (profileMap[row.updated_by]?.display_name ?? null) : null,
      })) });
    }

    case 'list_activity': {
      const { data: events } = await admin.from('admin_audit_events')
        .select('*').eq('target_type', 'platform_api_credential')
        .order('created_at', { ascending: false }).limit(50);
      const rows = events ?? [];
      const actorIds = [...new Set(rows.map((e) => e.admin_user_id as string).filter((v) => typeof v === 'string' && v.length > 0))];
      const { data: profiles } = actorIds.length
        ? await admin.from('profiles').select('id, email, display_name').in('id', actorIds)
        : { data: [] as Record<string, unknown>[] };
      const profileMap: Record<string, Record<string, unknown>> = {};
      for (const p of (profiles ?? [])) profileMap[p.id as string] = p;
      const metaOf = (e: Record<string, unknown>): Record<string, unknown> =>
        (e.safe_metadata && typeof e.safe_metadata === 'object') ? (e.safe_metadata as Record<string, unknown>) : {};
      const activity = rows.map((e) => {
        const m = metaOf(e);
        return {
          id: e.id,
          action: e.action,
          provider_key: typeof m.provider_key === 'string' ? m.provider_key : null,
          environment: typeof m.environment === 'string' ? m.environment : null,
          credential_type: typeof m.credential_type === 'string' ? m.credential_type : null,
          actor_email: (profileMap[e.admin_user_id as string]?.email ?? null) as string | null,
          actor_name: (profileMap[e.admin_user_id as string]?.display_name ?? null) as string | null,
          success: typeof m.success === 'boolean' ? m.success : null,
          error_code: typeof m.error_code === 'string' ? m.error_code : null,
          created_at: e.created_at,
        };
      });
      return ok({ activity });
    }

    case 'save_platform_credential': {
      const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
      if (!providerKey || !PROVIDER_REGISTRY[providerKey]) return fail('INVALID_REQUEST', 'Valid providerKey is required');
      if (!validEnvironment(environment)) return fail('INVALID_REQUEST', 'environment must be test or production');
      if (!secret) return fail('INVALID_REQUEST', 'secret is required');
      const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';

      const test = await testProvider(providerKey, secret, baseUrl);
      await audit(admin, userId, 'credential.save_attempted', null, {
        provider_key: providerKey, environment, credential_type: credentialType,
        success: test.ok, error_code: test.code,
      });
      if (!test.ok) return fail(test.code, test.message, 502);

      const encrypted = await encryptSecret(secret);
      if (!encrypted) return fail('VAULT_UNAVAILABLE', 'Server-side key vault is not configured', 500);

      const metadata: Record<string, unknown> = (typeof body.metadata === 'object' && body.metadata && !Array.isArray(body.metadata)) ? (body.metadata as Record<string, unknown>) : {};
      if (baseUrl && PROVIDER_REGISTRY[providerKey]?.needsBaseUrl) metadata.base_url = baseUrl;
      const { error } = await admin.from('platform_api_credentials').upsert({
        provider_key: providerKey, credential_type: credentialType, encrypted_secret: encrypted,
        key_suffix: maskKey(secret), environment, status: 'active', metadata,
        created_by: userId, updated_by: userId,
        last_tested_at: new Date().toISOString(), last_test_status: 'success', last_test_message: test.message,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_key,environment,credential_type' });
      if (error) return fail('STORE_FAILED', 'Unable to store credential', 500);

      await audit(admin, userId, 'credential.saved', null, {
        provider_key: providerKey, environment, credential_type: credentialType,
        new_suffix: maskKey(secret),
      });
      return ok({ providerKey, credentialType, environment, key_suffix: maskKey(secret) });
    }

    case 'replace_platform_credential': {
      const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
      if (!providerKey || !PROVIDER_REGISTRY[providerKey]) return fail('INVALID_REQUEST', 'Valid providerKey is required');
      if (!validEnvironment(environment)) return fail('INVALID_REQUEST', 'environment must be test or production');
      if (!secret) return fail('INVALID_REQUEST', 'secret is required');
      const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';

      const { data: existing } = await admin.from('platform_api_credentials')
        .select('id, key_suffix').eq('provider_key', providerKey)
        .eq('environment', environment).eq('credential_type', credentialType).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'No existing credential to replace', 404);

      const test = await testProvider(providerKey, secret, baseUrl);
      await audit(admin, userId, 'credential.replace_attempted', existing.id as string, {
        provider_key: providerKey, environment, credential_type: credentialType,
        old_suffix: existing.key_suffix, success: test.ok, error_code: test.code,
      });
      if (!test.ok) return fail(test.code, test.message, 502);

      const encrypted = await encryptSecret(secret);
      if (!encrypted) return fail('VAULT_UNAVAILABLE', 'Server-side key vault is not configured', 500);

      const metadata: Record<string, unknown> = (typeof body.metadata === 'object' && body.metadata && !Array.isArray(body.metadata)) ? (body.metadata as Record<string, unknown>) : {};
      if (baseUrl && PROVIDER_REGISTRY[providerKey]?.needsBaseUrl) metadata.base_url = baseUrl;
      const { error } = await admin.from('platform_api_credentials').update({
        encrypted_secret: encrypted, key_suffix: maskKey(secret), metadata,
        updated_by: userId, updated_at: new Date().toISOString(), rotated_at: new Date().toISOString(),
        last_tested_at: new Date().toISOString(), last_test_status: 'success', last_test_message: test.message,
        status: 'active',
      }).eq('id', existing.id);
      if (error) return fail('STORE_FAILED', 'Unable to replace credential', 500);

      await audit(admin, userId, 'credential.replaced', existing.id as string, {
        provider_key: providerKey, environment, credential_type: credentialType,
        old_suffix: existing.key_suffix, new_suffix: maskKey(secret),
      });
      return ok({ replaced: true, providerKey, credentialType, environment, key_suffix: maskKey(secret) });
    }

    case 'test_platform_credential': {
      const secret = typeof body.secret === 'string' ? body.secret.trim() : '';
      const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
      let targetProvider = providerKey;
      let targetSecret = secret;
      let targetId: string | null = null;

      if (!secret) {
        if (!id) return fail('INVALID_REQUEST', 'secret or id is required');
        const { data: stored } = await admin.from('platform_api_credentials')
          .select('*').eq('id', id).maybeSingle();
        if (!stored) return fail('NOT_FOUND', 'Credential not found', 404);
        targetProvider = stored.provider_key as string;
        targetId = id;
        const plain = await decryptSecret(stored.encrypted_secret as string);
        if (!plain) return fail('VAULT_UNAVAILABLE', 'Unable to decrypt stored credential', 500);
        targetSecret = plain;
      }

      if (!targetProvider || !PROVIDER_REGISTRY[targetProvider]) return fail('INVALID_REQUEST', 'Valid providerKey is required');
      if (!targetSecret) return fail('INVALID_REQUEST', 'secret is required');

      const test = await testProvider(targetProvider, targetSecret, baseUrl);
      await audit(admin, userId, 'credential.tested', targetId, {
        provider_key: targetProvider, success: test.ok, error_code: test.code,
      });

      if (targetId) {
        await admin.from('platform_api_credentials').update({
          last_tested_at: new Date().toISOString(),
          last_test_status: test.ok ? 'success' : 'failed',
          last_test_message: test.message,
          status: test.ok ? undefined : 'invalid',
        }).eq('id', targetId).then(() => {}).catch(() => {});
      }

      return ok({ ok: test.ok, code: test.code, message: test.message });
    }

    case 'disable_platform_credential': {
      if (!id) return fail('INVALID_REQUEST', 'id is required');
      const { data: existing } = await admin.from('platform_api_credentials')
        .select('id, provider_key, environment, credential_type').eq('id', id).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'Credential not found', 404);
      const { error } = await admin.from('platform_api_credentials')
        .update({ status: 'disabled', updated_by: userId, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail('STORE_FAILED', 'Unable to disable credential', 500);
      await audit(admin, userId, 'credential.disabled', id, {
        provider_key: existing.provider_key, environment: existing.environment, credential_type: existing.credential_type,
      });
      return ok({ disabled: true });
    }

    case 'enable_platform_credential': {
      if (!id) return fail('INVALID_REQUEST', 'id is required');
      const { data: existing } = await admin.from('platform_api_credentials')
        .select('id, provider_key, environment, credential_type').eq('id', id).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'Credential not found', 404);
      const { error } = await admin.from('platform_api_credentials')
        .update({ status: 'active', updated_by: userId, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return fail('STORE_FAILED', 'Unable to enable credential', 500);
      await audit(admin, userId, 'credential.enabled', id, {
        provider_key: existing.provider_key, environment: existing.environment, credential_type: existing.credential_type,
      });
      return ok({ enabled: true });
    }

    case 'delete_platform_credential': {
      if (!id) return fail('INVALID_REQUEST', 'id is required');
      const { data: existing } = await admin.from('platform_api_credentials')
        .select('id, provider_key, environment, credential_type').eq('id', id).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'Credential not found', 404);
      const { error } = await admin.from('platform_api_credentials').delete().eq('id', id);
      if (error) return fail('STORE_FAILED', 'Unable to delete credential', 500);
      await audit(admin, userId, 'credential.deleted', id, {
        provider_key: existing.provider_key, environment: existing.environment, credential_type: existing.credential_type,
      });
      return ok({ deleted: true });
    }

    default:
      return fail('INVALID_REQUEST', 'Unknown action', 400);
  }
});
