import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ENVIRONMENTS = ['development', 'staging', 'production', 'sandbox'];

type Category = 'ai' | 'search' | 'email' | 'automation' | 'payments' | 'infrastructure';

type CatalogItem = { provider_id: string; name: string; category: Category; auth_type: string; description: string; needs_base_url: boolean; sensitive: boolean };

const PROVIDER_CATALOG: CatalogItem[] = [
  { provider_id: 'openai', name: 'OpenAI', category: 'ai', auth_type: 'api_key', description: 'GPT models for AI-assisted development and agents.', needs_base_url: false, sensitive: false },
  { provider_id: 'anthropic', name: 'Anthropic', category: 'ai', auth_type: 'api_key', description: 'Claude models for AI-assisted development.', needs_base_url: false, sensitive: false },
  { provider_id: 'gemini', name: 'Google Gemini', category: 'ai', auth_type: 'api_key', description: 'Gemini models for multimodal generation.', needs_base_url: false, sensitive: false },
  { provider_id: 'groq', name: 'Groq', category: 'ai', auth_type: 'api_key', description: 'Ultra-fast inference for open-weight models.', needs_base_url: false, sensitive: false },
  { provider_id: 'tavily', name: 'Tavily', category: 'search', auth_type: 'api_key', description: 'Web search for agent research and retrieval.', needs_base_url: false, sensitive: false },
  { provider_id: 'serper', name: 'Serper', category: 'search', auth_type: 'api_key', description: 'Google search results API.', needs_base_url: false, sensitive: false },
  { provider_id: 'resend', name: 'Resend', category: 'email', auth_type: 'api_key', description: 'Transactional email delivery.', needs_base_url: false, sensitive: true },
  { provider_id: 'n8n', name: 'n8n', category: 'automation', auth_type: 'api_key', description: 'Workflow automation and webhooks.', needs_base_url: true, sensitive: true },
  { provider_id: 'stripe', name: 'Stripe', category: 'payments', auth_type: 'api_key', description: 'Payment processing. Use sandbox for test keys and production for live keys.', needs_base_url: false, sensitive: true },
  { provider_id: 'supabase', name: 'Supabase', category: 'infrastructure', auth_type: 'api_key', description: 'Database, auth and storage for Forge environments (service-role key).', needs_base_url: true, sensitive: true },
];

type OAuthProviderDef = {
  id: string;
  name: string;
  service: string;
  connectLabel: string;
  description: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  granted: string[];
  denied: string[];
  sensitive: boolean;
};

const OAUTH_PROVIDERS: Record<string, OAuthProviderDef> = {
  github: {
    id: 'github',
    name: 'GitHub',
    service: 'GitHub',
    connectLabel: 'Connect GitHub',
    description: 'Connect a GitHub account to allow authorised Forge services to manage repositories, branches, commits and pull requests.',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['repo', 'read:org'],
    clientIdEnv: 'GITHUB_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GITHUB_OAUTH_CLIENT_SECRET',
    granted: ['Read repositories', 'Create branches', 'Create commits', 'Create pull requests', 'Read organisation membership'],
    denied: ['Delete repositories', 'Change organisation settings'],
    sensitive: true,
  },
  google: {
    id: 'google',
    name: 'Google',
    service: 'Gmail',
    connectLabel: 'Connect Google',
    description: 'Connect a Google account to allow authorised Forge services to read and send Gmail on your behalf.',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
    granted: ['Read your email address and profile', 'Read Gmail messages', 'Send email on your behalf'],
    denied: ['Delete Gmail messages permanently', 'Manage your entire Google account'],
    sensitive: true,
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    service: 'Outlook',
    connectLabel: 'Connect Microsoft',
    description: 'Connect a Microsoft account to allow authorised Forge services to read and send Outlook mail on your behalf.',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['offline_access', 'openid', 'email', 'profile', 'User.Read', 'Mail.Read', 'Mail.Send'],
    clientIdEnv: 'MICROSOFT_OAUTH_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_OAUTH_CLIENT_SECRET',
    granted: ['Read your profile and email address', 'Read Outlook mail', 'Send mail on your behalf'],
    denied: ['Delete mail permanently', 'Manage your organisation directory'],
    sensitive: true,
  },
};

const ACCESS_LEVELS = ['none', 'read', 'execute', 'manage'];
const LEVEL_RANK: Record<string, number> = { none: 0, read: 1, execute: 2, manage: 3 };

function isSensitiveProvider(providerId: string): boolean {
  const api = PROVIDER_CATALOG.find((p) => p.provider_id === providerId);
  if (api) return api.sensitive;
  return OAUTH_PROVIDERS[providerId]?.sensitive ?? false;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = /^https:\/\/[^/]*readdy\.ai$/.test(origin ?? '') || /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '');
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function maskSuffix(key: string): string {
  return key.length <= 4 ? '••••' : key.slice(-4);
}

async function hasIntegrationsManage(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from('platform_admins').select('role, permissions, active').eq('user_id', userId).maybeSingle();
  if (!data?.active) return false;
  if (data.role === 'super_admin' || data.role === 'operations_admin') return true;
  const stored: string[] = Array.isArray(data.permissions) ? data.permissions.filter((p: unknown) => typeof p === 'string') : [];
  return stored.includes('*') || stored.includes('ai.operate') || stored.includes('integrations.manage');
}

async function audit(admin: ReturnType<typeof createClient>, userId: string, action: string, targetType: string | null, targetId: string | null, safeMetadata: Record<string, unknown> | null) {
  await admin.from('admin_audit_events').insert({ admin_user_id: userId, action, target_type: targetType, target_id: targetId, safe_metadata: safeMetadata }).then(() => {}).catch(() => {});
}

async function loadPermissions(admin: ReturnType<typeof createClient>, connectionId?: string) {
  let q = admin.from('integration_agent_permissions').select('*');
  if (connectionId) q = q.eq('integration_connection_id', connectionId);
  const { data: perms } = await q;
  const { data: agents } = await admin.from('forge_agents').select('*');
  const { data: conns } = await admin.from('integration_connections').select('id, connection_name, provider_id, environment');
  const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));
  const connMap = new Map((conns ?? []).map((c) => [c.id, c]));
  return (perms ?? []).map((p) => ({
    id: p.id,
    integration_connection_id: p.integration_connection_id,
    agent_id: p.agent_id,
    access_level: p.access_level,
    is_enabled: p.is_enabled,
    created_at: p.created_at,
    updated_at: p.updated_at,
    agent_name: agentMap.get(p.agent_id)?.name ?? null,
    agent_type: agentMap.get(p.agent_id)?.agent_type ?? null,
    agent_status: agentMap.get(p.agent_id)?.status ?? null,
    agent_sensitivity: agentMap.get(p.agent_id)?.sensitivity_level ?? null,
    connection_name: connMap.get(p.integration_connection_id)?.connection_name ?? null,
    provider_id: connMap.get(p.integration_connection_id)?.provider_id ?? null,
    environment: connMap.get(p.integration_connection_id)?.environment ?? null,
  }));
}

type TestOutcome = { ok: boolean; status: number | null; message: string; latencyMs: number; mode?: 'test' | 'live' | null };

async function testProvider(providerId: string, apiKey: string, baseUrl?: string): Promise<TestOutcome> {
  const start = Date.now();
  const finish = (o: TestOutcome) => ({ ...o, latencyMs: Date.now() - start });
  try {
    let url = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let body: string | undefined;
    switch (providerId) {
      case 'openai': url = 'https://api.openai.com/v1/models'; headers['Authorization'] = `Bearer ${apiKey}`; break;
      case 'anthropic': method = 'POST'; url = 'https://api.anthropic.com/v1/messages'; headers['x-api-key'] = apiKey; headers['anthropic-version'] = '2023-06-01'; headers['Content-Type'] = 'application/json'; body = JSON.stringify({ model: 'claude-3-5-haiku-20241022', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }); break;
      case 'gemini': url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`; break;
      case 'groq': url = 'https://api.groq.com/openai/v1/models'; headers['Authorization'] = `Bearer ${apiKey}`; break;
      case 'tavily': method = 'POST'; url = 'https://api.tavily.com/search'; headers['Authorization'] = `Bearer ${apiKey}`; headers['Content-Type'] = 'application/json'; body = JSON.stringify({ query: 'test', max_results: 1 }); break;
      case 'serper': method = 'POST'; url = 'https://google.serper.dev/search'; headers['X-API-KEY'] = apiKey; headers['Content-Type'] = 'application/json'; body = JSON.stringify({ q: 'test' }); break;
      case 'resend': url = 'https://api.resend.com/domains'; headers['Authorization'] = `Bearer ${apiKey}`; break;
      case 'n8n': if (!baseUrl) return finish({ ok: false, status: null, message: 'A base URL is required for n8n.', latencyMs: 0 }); url = `${baseUrl.replace(/\/+$/, '')}/api/v1/workflows`; headers['X-N8N-API-KEY'] = apiKey; break;
      case 'stripe': url = 'https://api.stripe.com/v1/account'; headers['Authorization'] = `Bearer ${apiKey}`; break;
      case 'supabase': if (!baseUrl) return finish({ ok: false, status: null, message: 'A base URL (project URL) is required for Supabase.', latencyMs: 0 }); url = `${baseUrl.replace(/\/+$/, '')}/rest/v1/`; headers['apikey'] = apiKey; headers['Authorization'] = `Bearer ${apiKey}`; break;
      default: return finish({ ok: false, status: null, message: 'Unknown provider.', latencyMs: 0 });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try { res = await fetch(url, { method, headers, body, signal: controller.signal }); } finally { clearTimeout(timer); }
    const status = res.status;
    const mode = providerId === 'stripe' ? (apiKey.startsWith('sk_live_') ? 'live' : apiKey.startsWith('sk_test_') ? 'test' : null) : null;
    if (res.ok) return finish({ ok: true, status, message: 'Connected', latencyMs: 0, mode });
    if (status === 401 || status === 403) return finish({ ok: false, status, message: 'Authentication was rejected by the provider.', latencyMs: 0, mode });
    if (status === 429) return finish({ ok: false, status, message: 'Rate limit reached.', latencyMs: 0, mode });
    if (status >= 500) return finish({ ok: false, status, message: 'Provider unavailable.', latencyMs: 0, mode });
    return finish({ ok: false, status, message: `Provider returned an error (HTTP ${status}).`, latencyMs: 0, mode });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return finish({ ok: false, status: null, message: 'Request timed out.', latencyMs: 0 });
    return finish({ ok: false, status: null, message: 'Provider unavailable.', latencyMs: 0 });
  }
}

type OAuthTokens = { accessToken: string; refreshToken: string | null; expiresAt: string | null; scopes: string[] };
type OAuthAccount = { name: string | null; email: string | null; avatar: string | null; accountId: string | null };

async function oauthExchange(def: OAuthProviderDef, code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = Deno.env.get(def.clientIdEnv) ?? '';
  const clientSecret = Deno.env.get(def.clientSecretEnv) ?? '';
  if (!clientId || !clientSecret) throw new Error(`${def.name} OAuth is not configured.`);

  let accessToken = '';
  let refreshToken: string | null = null;
  let expiresIn = 0;
  let grantedScopes: string[] = [];

  if (def.id === 'github') {
    const res = await fetch(def.tokenUrl, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error('GitHub rejected the authorization code.');
    accessToken = data.access_token ?? '';
    refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : null;
    grantedScopes = typeof data.scope === 'string' ? data.scope.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  } else {
    const params = new URLSearchParams();
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
    params.set('grant_type', 'authorization_code');
    if (def.id === 'microsoft') params.set('scope', def.scopes.join(' '));
    const res = await fetch(def.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(`${def.name} rejected the authorization code.`);
    accessToken = data.access_token ?? '';
    refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : null;
    expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 0;
    grantedScopes = typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : [];
  }

  if (!accessToken) throw new Error(`${def.name} did not return an access token.`);
  const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  return { accessToken, refreshToken, expiresAt, scopes: grantedScopes };
}

async function oauthFetchAccount(def: OAuthProviderDef, accessToken: string): Promise<OAuthAccount> {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${accessToken}` };
  if (def.id === 'github') headers['Accept'] = 'application/vnd.github+json';
  const res = await fetch(def.userInfoUrl, { headers });
  if (!res.ok) throw new Error(`${def.name} account lookup failed.`);
  const data = await res.json();
  if (def.id === 'github') {
    return { name: data.login ?? data.name ?? null, email: data.email ?? null, avatar: data.avatar_url ?? null, accountId: data.id != null ? String(data.id) : null };
  }
  if (def.id === 'google') {
    return { name: data.name ?? null, email: data.email ?? null, avatar: data.picture ?? null, accountId: data.sub ?? null };
  }
  return { name: data.displayName ?? null, email: data.mail ?? data.userPrincipalName ?? null, avatar: null, accountId: data.id ?? null };
}

async function handleOauthCallback(url: URL): Promise<Response> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const provider = url.searchParams.get('provider') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const error = url.searchParams.get('error') ?? '';
  const def = OAUTH_PROVIDERS[provider];

  const htmlRedirect = (to: string) => new Response(null, { status: 302, headers: { Location: to } });

  const errorRedirect = async (message: string) => {
    let returnTo: string | null = null;
    if (state) {
      const { data } = await admin.from('oauth_flow_states').select('return_to').eq('state', state).maybeSingle();
      returnTo = (data?.return_to as string) ?? null;
    }
    if (!returnTo || !/^https?:\/\//.test(returnTo)) {
      return new Response(`OAuth connection failed: ${message}`, { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }
    const sep = returnTo.includes('?') ? '&' : '?';
    return htmlRedirect(`${returnTo}${sep}oauth=error&provider=${encodeURIComponent(provider)}&message=${encodeURIComponent(message)}`);
  };

  if (!def || !code || !state) return errorRedirect('Invalid OAuth callback.');

  const { data: flow } = await admin.from('oauth_flow_states').select('*').eq('state', state).maybeSingle();
  if (!flow || flow.used_at || new Date(flow.expires_at).getTime() < Date.now()) {
    return errorRedirect('The authorization flow has expired or is no longer valid.');
  }

  await admin.from('oauth_flow_states').update({ used_at: new Date().toISOString() }).eq('id', flow.id);

  const returnTo = String(flow.return_to ?? '');
  const sep = returnTo.includes('?') ? '&' : '?';

  if (error) {
    return htmlRedirect(`${returnTo}${sep}oauth=error&provider=${encodeURIComponent(provider)}&message=${encodeURIComponent(error === 'access_denied' ? 'You cancelled the authorization request.' : `The provider returned an error: ${error}`)}`);
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/forge-integrations/oauth/callback`;

  let tokens: OAuthTokens;
  let account: OAuthAccount;
  try {
    tokens = await oauthExchange(def, code, redirectUri);
    account = await oauthFetchAccount(def, tokens.accessToken);
  } catch (err) {
    return errorRedirect(err instanceof Error ? err.message : 'The provider rejected the authorization code.');
  }

  const secretJson = JSON.stringify({
    provider: def.id,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_at: tokens.expiresAt,
    scopes: tokens.scopes,
  });
  const { data: secretId, error: storeErr } = await admin.rpc('forge_integration_store_secret', {
    p_secret: secretJson,
    p_name: `Forge ${def.name} OAuth`,
    p_description: `Forge ${String(flow.connection_name ?? def.name)} OAuth (${String(flow.environment ?? 'production')})`,
  });
  if (storeErr || typeof secretId !== 'string') return errorRedirect('Unable to store the OAuth credentials securely.');

  const now = new Date().toISOString();
  const base = {
    provider_id: def.id,
    connection_name: String(flow.connection_name ?? def.name),
    provider_category: 'oauth',
    auth_type: 'oauth',
    environment: String(flow.environment ?? 'production'),
    secret_reference: secretId,
    secret_suffix: null,
    status: 'connected',
    account_name: account.name,
    account_email: account.email,
    account_avatar_url: account.avatar,
    provider_account_id: account.accountId,
    scopes: tokens.scopes.length ? tokens.scopes : def.scopes,
    oauth_expires_at: tokens.expiresAt,
    connected_at: now,
    updated_at: now,
  };

  if (flow.connection_id) {
    const { error: updErr } = await admin.from('integration_connections').update(base).eq('id', flow.connection_id);
    if (updErr) return errorRedirect('Unable to save the integration record.');
  } else {
    const { error: insErr } = await admin.from('integration_connections').insert({ ...base, created_by: flow.user_id });
    if (insErr) {
      await admin.rpc('forge_integration_delete_secret', { p_secret_id: secretId }).then(() => {}).catch(() => {});
      return errorRedirect('Unable to save the integration record.');
    }
  }

  await audit(admin, flow.user_id, flow.connection_id ? 'integration.oauth_reconnected' : 'integration.oauth_connected', 'integration', flow.connection_id ?? null, { provider_id: def.id, account: account.accountId, environment: base.environment });

  return htmlRedirect(`${returnTo}${sep}oauth=success&provider=${encodeURIComponent(def.id)}&account=${encodeURIComponent(account.name ?? account.email ?? '')}`);
}

serve(async (req) => {
  const cors = corsHeaders(req);
  const url = new URL(req.url);

  if (req.method === 'GET' && url.pathname.endsWith('/oauth/callback')) {
    return await handleOauthCallback(url);
  }

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
  const fail = (errorCode: string, message: string, status = 400) => json({ code: 'ERROR', errorCode, message }, status);
  const ok = (data: Record<string, unknown>) => json({ code: 'OK', ...data });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
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
  } catch { return fail('AUTH_REQUIRED', 'Unable to verify session', 401); }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail('INVALID_REQUEST', 'Malformed JSON', 400); }
  const action = typeof body.action === 'string' ? body.action : '';

  const validEnv = (v: unknown) => typeof v === 'string' && ENVIRONMENTS.includes(v);
  const validProvider = (v: unknown) => typeof v === 'string' && PROVIDER_CATALOG.some((p) => p.provider_id === v);

  // ─────────────────────────────────────────────────────────────
  // Runtime authorization (not admin-gated). Internal Forge
  // services ask "may agent X use integration Y (in environment Z)?"
  // and the answer is enforced here. Never returns a secret.
  // ─────────────────────────────────────────────────────────────
  if (action === 'authorize') {
    const agentId = typeof body.agentId === 'string' ? body.agentId : '';
    const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
    const requiredLevel = typeof body.requiredLevel === 'string' ? body.requiredLevel : 'execute';
    if (!agentId || !connectionId) return fail('INVALID_INPUT', 'agentId and connectionId are required', 400);
    const deny = (provider: string | null, agentName: string, reason: string) => json({ code: 'ACCESS_DENIED', errorCode: 'ACCESS_DENIED', provider, agent: agentName, reason }, 403);
    const { data: agent } = await admin.from('forge_agents').select('id, name, status, allowed_environments').eq('id', agentId).maybeSingle();
    if (!agent) return deny(null, agentId, 'Unknown agent.');
    if (agent.status !== 'active') return deny(null, agent.name, 'Agent is disabled.');
    const { data: conn } = await admin.from('integration_connections').select('id, provider_id, connection_name, status, environment').eq('id', connectionId).maybeSingle();
    if (!conn) return deny(null, agent.name, 'Unknown integration.');
    const provider = String(conn.provider_id ?? '');
    if (conn.status !== 'connected') return deny(provider, agent.name, 'Integration is not connected.');
    const env = String(conn.environment ?? '');
    const allowedEnvs = Array.isArray(agent.allowed_environments) ? agent.allowed_environments : [];
    if (env && !allowedEnvs.includes(env)) return deny(provider, agent.name, 'Agent is not permitted in this environment.');
    const { data: perm } = await admin.from('integration_agent_permissions').select('access_level, is_enabled').eq('integration_connection_id', connectionId).eq('agent_id', agentId).maybeSingle();
    if (!perm || !perm.is_enabled || !perm.access_level || perm.access_level === 'none') return deny(provider, agent.name, 'Agent does not have permission to use this integration.');
    const requiredRank = LEVEL_RANK[requiredLevel] ?? LEVEL_RANK.execute;
    const grantedRank = LEVEL_RANK[perm.access_level] ?? 0;
    if (grantedRank < requiredRank) return deny(provider, agent.name, 'Agent permission level is insufficient for this operation.');
    await admin.from('integration_connections').update({ last_used_at: new Date().toISOString() }).eq('id', connectionId).then(() => {}).catch(() => {});
    return ok({ authorized: true, provider, agent: agent.name, level: perm.access_level, environment: env });
  }

  // ─────────────────────────────────────────────────────────────
  // Environment-scoped provider routing (not admin-gated). Resolves
  // agent + provider + environment to a single authorised connection.
  // Fails closed: never falls back to another environment.
  // ─────────────────────────────────────────────────────────────
  if (action === 'route') {
    const agentId = typeof body.agentId === 'string' ? body.agentId : '';
    const providerId = typeof body.providerId === 'string' ? body.providerId : '';
    const environment = typeof body.environment === 'string' ? body.environment : '';
    const requiredLevel = typeof body.requiredLevel === 'string' ? body.requiredLevel : 'execute';
    if (!agentId || !providerId || !validEnv(environment)) return fail('INVALID_INPUT', 'agentId, providerId and a valid environment are required', 400);
    const deny = (reason: string) => json({ code: 'ACCESS_DENIED', errorCode: 'ACCESS_DENIED', provider: providerId, agent: agentId, environment, reason }, 403);
    const unavailable = () => json({ code: 'INTEGRATION_UNAVAILABLE', errorCode: 'INTEGRATION_UNAVAILABLE', provider: providerId, environment, reason: 'No connected integration is available in this environment.' }, 404);
    const { data: agent } = await admin.from('forge_agents').select('id, name, status, allowed_environments').eq('id', agentId).maybeSingle();
    if (!agent) return deny('Unknown agent.');
    if (agent.status !== 'active') return deny('Agent is disabled.');
    const allowedEnvs = Array.isArray(agent.allowed_environments) ? agent.allowed_environments : [];
    if (!allowedEnvs.includes(environment)) return deny('Agent is not permitted in this environment.');
    const { data: conns } = await admin.from('integration_connections').select('id, provider_id, connection_name, status, environment').eq('provider_id', providerId).eq('environment', environment);
    const available = (conns ?? []).filter((c) => c.status === 'connected');
    if (available.length === 0) return unavailable();
    const requiredRank = LEVEL_RANK[requiredLevel] ?? LEVEL_RANK.execute;
    for (const conn of available) {
      const { data: perm } = await admin.from('integration_agent_permissions').select('access_level, is_enabled').eq('integration_connection_id', conn.id).eq('agent_id', agentId).maybeSingle();
      if (perm && perm.is_enabled && perm.access_level && perm.access_level !== 'none') {
        const grantedRank = LEVEL_RANK[perm.access_level] ?? 0;
        if (grantedRank < requiredRank) return deny('Agent permission level is insufficient for this operation.');
        await admin.from('integration_connections').update({ last_used_at: new Date().toISOString() }).eq('id', conn.id).then(() => {}).catch(() => {});
        return ok({ authorized: true, connectionId: conn.id, provider: conn.provider_id, connectionName: conn.connection_name, environment: conn.environment, agent: agent.name, level: perm.access_level });
      }
    }
    return deny('Agent does not have permission to use this integration in this environment.');
  }

  if (!(await hasIntegrationsManage(admin, userId))) return fail('FORBIDDEN', 'You do not have permission to manage integrations', 403);

  switch (action) {
    case 'catalog': return ok({ providers: PROVIDER_CATALOG });

    case 'oauth_providers': {
      const providers = Object.values(OAUTH_PROVIDERS).map((d) => {
        const clientId = Deno.env.get(d.clientIdEnv) ?? '';
        const clientSecret = Deno.env.get(d.clientSecretEnv) ?? '';
        return { id: d.id, name: d.name, service: d.service, connectLabel: d.connectLabel, description: d.description, scopes: d.scopes, granted: d.granted, denied: d.denied, sensitive: d.sensitive, configured: !!(clientId && clientSecret) };
      });
      return ok({ providers });
    }

    case 'oauth_start': {
      const provider = typeof body.provider === 'string' ? body.provider : '';
      const connectionName = typeof body.connectionName === 'string' ? body.connectionName.trim() : '';
      const environment = body.environment;
      const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl.trim() : '';
      const connectionId = typeof body.connectionId === 'string' && body.connectionId ? body.connectionId : null;
      const def = OAUTH_PROVIDERS[provider];
      if (!def) return fail('INVALID_INPUT', 'Unknown OAuth provider', 400);
      if (!connectionName) return fail('INVALID_INPUT', 'A connection name is required', 400);
      if (!validEnv(environment)) return fail('INVALID_INPUT', 'A valid environment is required', 400);
      if (!/^https?:\/\//.test(returnUrl)) return fail('INVALID_INPUT', 'A valid return URL is required', 400);
      const clientId = Deno.env.get(def.clientIdEnv) ?? '';
      const clientSecret = Deno.env.get(def.clientSecretEnv) ?? '';
      if (!clientId || !clientSecret) return fail('NOT_CONFIGURED', `${def.name} OAuth is not configured yet. Add the client ID and secret before connecting.`, 503);

      const state = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const redirectUri = `${SUPABASE_URL}/functions/v1/forge-integrations/oauth/callback`;

      const { error: stateErr } = await admin.from('oauth_flow_states').insert({
        state,
        user_id: userId,
        provider,
        connection_name: connectionName,
        connection_id: connectionId,
        environment: environment as string,
        return_to: returnUrl,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (stateErr) return fail('STORE_FAILED', 'Unable to start the authorization flow', 500);

      const authParams = new URLSearchParams();
      authParams.set('client_id', clientId);
      authParams.set('redirect_uri', redirectUri);
      authParams.set('state', state);
      authParams.set('scope', def.scopes.join(' '));
      if (def.id === 'google') {
        authParams.set('response_type', 'code');
        authParams.set('access_type', 'offline');
        authParams.set('prompt', 'consent');
      } else if (def.id === 'microsoft') {
        authParams.set('response_type', 'code');
      }

      return ok({ url: `${def.authUrl}?${authParams.toString()}` });
    }

    case 'oauth_revoke': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const confirmProduction = body.confirmProduction === true;
      if (!connectionId) return fail('INVALID_INPUT', 'connectionId is required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, environment, secret_reference').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      if (conn.environment === 'production' && !confirmProduction) return fail('PRODUCTION_CONFIRM_REQUIRED', 'You are changing a production integration. Confirm before continuing.', 409);
      if (conn.secret_reference) { await admin.rpc('forge_integration_delete_secret', { p_secret_id: conn.secret_reference }).then(() => {}).catch(() => {}); }
      await admin.from('integration_connections').update({ status: 'disconnected', secret_reference: null, secret_suffix: null, oauth_expires_at: null, updated_at: new Date().toISOString() }).eq('id', connectionId);
      await audit(admin, userId, 'integration.oauth_revoked', 'integration', connectionId, { provider_id: conn.provider_id, environment: conn.environment });
      return ok({ revoked: true });
    }

    case 'list': {
      const { data } = await admin.from('integration_connections').select('id, provider_id, connection_name, provider_category, auth_type, environment, base_url, secret_suffix, status, last_tested_at, last_test_status, last_used_at, account_name, account_email, account_avatar_url, provider_account_id, scopes, oauth_expires_at, connected_at, created_by, created_at, updated_at').order('created_at', { ascending: true });
      const connections = (data ?? []).map((c) => ({ ...c, sensitive: isSensitiveProvider(String(c.provider_id ?? '')) }));
      return ok({ connections });
    }

    case 'test': {
      const providerId = typeof body.providerId === 'string' ? body.providerId : '';
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      const baseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl.trim() : undefined;
      if (!validProvider(providerId) || !apiKey) return fail('INVALID_INPUT', 'A valid provider and credential are required', 400);
      const result = await testProvider(providerId, apiKey, baseUrl);
      return ok({ ...result, provider: providerId, timestamp: new Date().toISOString() });
    }

    case 'save': {
      const providerId = typeof body.providerId === 'string' ? body.providerId : '';
      const connectionName = typeof body.connectionName === 'string' ? body.connectionName.trim() : '';
      const environment = body.environment;
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      const baseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl.trim() : null;
      const testFirst = body.testFirst === true;
      if (!validProvider(providerId) || !connectionName || !validEnv(environment) || !apiKey) return fail('INVALID_INPUT', 'providerId, connectionName, environment and credential are required', 400);
      const meta = PROVIDER_CATALOG.find((p) => p.provider_id === providerId);
      if (!meta) return fail('INVALID_INPUT', 'Unknown provider', 400);
      if (meta.needs_base_url && !baseUrl) return fail('INVALID_INPUT', 'A base URL is required for this provider', 400);

      let tested = false; let testStatus: string | null = null; let testResult: TestOutcome | null = null;
      if (testFirst) { testResult = await testProvider(providerId, apiKey, baseUrl ?? undefined); if (!testResult.ok) return fail('CONNECTION_FAILED', testResult.message, 502); tested = true; testStatus = 'success'; }

      const now = new Date().toISOString();
      const { data: secretId, error: storeErr } = await admin.rpc('forge_integration_store_secret', { p_secret: apiKey, p_name: `Forge ${meta.name}`, p_description: `Forge ${connectionName} (${environment})` });
      if (storeErr || typeof secretId !== 'string') return fail('VAULT_UNAVAILABLE', 'Unable to store the credential securely', 500);

      const { data: row, error: insErr } = await admin.from('integration_connections').insert({ provider_id: providerId, connection_name: connectionName, provider_category: meta.category, auth_type: meta.auth_type, environment: environment as string, base_url: baseUrl, secret_reference: secretId, secret_suffix: maskSuffix(apiKey), status: 'connected', last_tested_at: tested ? now : null, last_test_status: testStatus, created_by: userId }).select('id, provider_id, connection_name, provider_category, auth_type, environment, base_url, secret_suffix, status, last_tested_at, last_test_status, created_at, updated_at').single();
      if (insErr) { await admin.rpc('forge_integration_delete_secret', { p_secret_id: secretId }).then(() => {}).catch(() => {}); return fail('STORE_FAILED', 'Unable to save the integration record', 500); }

      await audit(admin, userId, 'integration.created', 'integration', row.id, { provider_id: providerId, environment, tested });
      return ok({ connection: { ...row, sensitive: meta.sensitive }, tested: testResult ?? undefined });
    }

    case 'test_stored': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      if (!connectionId) return fail('INVALID_INPUT', 'connectionId is required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, base_url, secret_reference, status').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      if (!conn.secret_reference) return fail('NOT_CONFIGURED', 'No credential is stored for this integration', 400);
      const { data: secret, error: readErr } = await admin.rpc('forge_integration_read_secret', { p_secret_id: conn.secret_reference });
      if (readErr || typeof secret !== 'string' || !secret) return fail('VAULT_UNAVAILABLE', 'The stored credential could not be retrieved', 500);
      const result = await testProvider(String(conn.provider_id ?? ''), secret, typeof conn.base_url === 'string' && conn.base_url ? conn.base_url : undefined);
      const now = new Date().toISOString();
      await admin.from('integration_connections').update({ status: result.ok ? 'connected' : 'error', last_tested_at: now, last_test_status: result.ok ? 'success' : 'failed', updated_at: now }).eq('id', connectionId);
      return ok({ result: { ...result, provider: conn.provider_id, timestamp: now }, status: result.ok ? 'connected' : 'error' });
    }

    case 'replace': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
      const testFirst = body.testFirst === true;
      const confirmProduction = body.confirmProduction === true;
      if (!connectionId || !apiKey) return fail('INVALID_INPUT', 'connectionId and new credential are required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, connection_name, environment, base_url, secret_reference').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      if (conn.environment === 'production' && !confirmProduction) return fail('PRODUCTION_CONFIRM_REQUIRED', 'You are changing a production integration. Confirm before continuing.', 409);
      const providerId = String(conn.provider_id ?? '');
      const meta = PROVIDER_CATALOG.find((p) => p.provider_id === providerId);
      let tested = false; let testResult: TestOutcome | null = null;
      if (testFirst) { testResult = await testProvider(providerId, apiKey, typeof conn.base_url === 'string' && conn.base_url ? conn.base_url : undefined); if (!testResult.ok) return fail('CONNECTION_FAILED', testResult.message, 502); tested = true; }
      const now = new Date().toISOString();
      const { data: newSecretId, error: storeErr } = await admin.rpc('forge_integration_store_secret', { p_secret: apiKey, p_name: `Forge ${meta?.name ?? providerId}`, p_description: `Forge ${String(conn.connection_name ?? '')} (${String(conn.environment ?? '')})` });
      if (storeErr || typeof newSecretId !== 'string') return fail('VAULT_UNAVAILABLE', 'Unable to store the new credential securely', 500);
      const { error: updErr } = await admin.from('integration_connections').update({ secret_reference: newSecretId, secret_suffix: maskSuffix(apiKey), status: 'connected', last_tested_at: tested ? now : null, last_test_status: tested ? 'success' : null, updated_at: now }).eq('id', connectionId);
      if (updErr) { await admin.rpc('forge_integration_delete_secret', { p_secret_id: newSecretId }).then(() => {}).catch(() => {}); return fail('STORE_FAILED', 'Unable to replace the credential', 500); }
      if (conn.secret_reference) { await admin.rpc('forge_integration_delete_secret', { p_secret_id: conn.secret_reference }).then(() => {}).catch(() => {}); }
      await audit(admin, userId, 'integration.credential_replaced', 'integration', connectionId, { provider_id: providerId, environment: conn.environment, tested });
      return ok({ replaced: true, secret_suffix: maskSuffix(apiKey), tested: testResult ?? undefined });
    }

    case 'disable': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const confirmProduction = body.confirmProduction === true;
      if (!connectionId) return fail('INVALID_INPUT', 'connectionId is required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, environment').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      if (conn.environment === 'production' && !confirmProduction) return fail('PRODUCTION_CONFIRM_REQUIRED', 'You are changing a production integration. Confirm before continuing.', 409);
      await admin.from('integration_connections').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('id', connectionId);
      await audit(admin, userId, 'integration.disabled', 'integration', connectionId, { environment: conn.environment });
      return ok({ disabled: true });
    }

    case 'enable': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      if (!connectionId) return fail('INVALID_INPUT', 'connectionId is required', 400);
      await admin.from('integration_connections').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', connectionId);
      await audit(admin, userId, 'integration.enabled', 'integration', connectionId, null);
      return ok({ enabled: true });
    }

    case 'delete': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const confirm = typeof body.confirm === 'string' ? body.confirm : '';
      if (!connectionId) return fail('INVALID_INPUT', 'connectionId is required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, environment, secret_reference').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      const isProd = conn.environment === 'production';
      const requiredConfirm = isProd ? 'PRODUCTION' : 'DELETE';
      if (confirm !== requiredConfirm) return fail('CONFIRM_REQUIRED', isProd ? 'Type PRODUCTION to confirm permanent removal of a production integration' : 'Type DELETE to confirm permanent removal', 400);
      if (conn.secret_reference) { await admin.rpc('forge_integration_delete_secret', { p_secret_id: conn.secret_reference }).then(() => {}).catch(() => {}); }
      await admin.from('integration_connections').delete().eq('id', connectionId);
      await audit(admin, userId, 'integration.deleted', 'integration', connectionId, { provider_id: conn.provider_id, environment: conn.environment });
      return ok({ deleted: true });
    }

    case 'clone': {
      const sourceId = typeof body.sourceId === 'string' ? body.sourceId : '';
      const targetEnvironment = body.targetEnvironment;
      const connectionName = typeof body.connectionName === 'string' && body.connectionName.trim() ? body.connectionName.trim() : '';
      const copyAgentMappings = body.copyAgentMappings === true;
      if (!sourceId || !validEnv(targetEnvironment)) return fail('INVALID_INPUT', 'sourceId and a valid target environment are required', 400);
      const { data: src } = await admin.from('integration_connections').select('id, provider_id, provider_category, auth_type, base_url, connection_name').eq('id', sourceId).maybeSingle();
      if (!src) return fail('NOT_FOUND', 'Source integration not found', 404);
      const name = connectionName || `${src.connection_name} (${targetEnvironment})`;
      const { data: row, error: insErr } = await admin.from('integration_connections').insert({
        provider_id: src.provider_id,
        connection_name: name,
        provider_category: src.provider_category,
        auth_type: src.auth_type,
        environment: targetEnvironment as string,
        base_url: src.base_url,
        secret_reference: null,
        secret_suffix: null,
        status: 'disconnected',
        created_by: userId,
      }).select('id').single();
      if (insErr) return fail('STORE_FAILED', 'Unable to create the cloned connection', 500);
      if (copyAgentMappings) {
        const { data: perms } = await admin.from('integration_agent_permissions').select('agent_id, access_level, is_enabled').eq('integration_connection_id', sourceId);
        if (perms && perms.length) {
          const rows = perms.map((p) => ({ integration_connection_id: row.id, agent_id: p.agent_id, access_level: p.access_level, is_enabled: p.is_enabled, created_by: userId }));
          await admin.from('integration_agent_permissions').upsert(rows, { onConflict: 'integration_connection_id,agent_id' }).then(() => {}).catch(() => {});
        }
      }
      await audit(admin, userId, 'integration.cloned', 'integration', row.id, { sourceId, targetEnvironment, copyAgentMappings });
      return ok({ connectionId: row.id, connectionName: name });
    }

    case 'agents': {
      const { data } = await admin.from('forge_agents').select('*').order('name', { ascending: true });
      return ok({ agents: data ?? [] });
    }

    case 'agent_permissions': {
      const connectionId = typeof body.connectionId === 'string' && body.connectionId ? body.connectionId : undefined;
      return ok({ permissions: await loadPermissions(admin, connectionId) });
    }

    case 'set_agent_permission': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const agentId = typeof body.agentId === 'string' ? body.agentId : '';
      const accessLevel = typeof body.accessLevel === 'string' ? body.accessLevel : '';
      const enabled = body.enabled === true;
      if (!connectionId || !agentId || !ACCESS_LEVELS.includes(accessLevel)) return fail('INVALID_INPUT', 'connectionId, agentId and a valid access level are required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, environment').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      const { data: ag } = await admin.from('forge_agents').select('id, allowed_environments').eq('id', agentId).maybeSingle();
      if (!ag) return fail('NOT_FOUND', 'Agent not found', 404);
      if (enabled && accessLevel !== 'none' && conn.environment === 'production') {
        const envs = Array.isArray(ag.allowed_environments) ? ag.allowed_environments : [];
        if (!envs.includes('production')) return fail('ENV_NOT_ALLOWED', 'This agent does not have production access. Add production to its allowed environments first.', 409);
      }
      const { data: existing } = await admin.from('integration_agent_permissions').select('access_level, is_enabled').eq('integration_connection_id', connectionId).eq('agent_id', agentId).maybeSingle();
      const prevLevel = existing?.access_level ?? 'none';
      const prevEnabled = existing?.is_enabled ?? false;
      const finalLevel = enabled ? accessLevel : 'none';
      const now = new Date().toISOString();
      const { error } = await admin.from('integration_agent_permissions').upsert(
        { integration_connection_id: connectionId, agent_id: agentId, access_level: finalLevel, is_enabled: enabled, created_by: userId, updated_at: now },
        { onConflict: 'integration_connection_id,agent_id' },
      );
      if (error) return fail('STORE_FAILED', 'Unable to save the permission', 500);
      await audit(admin, userId, 'integration.permission_changed', 'integration', connectionId, { agentId, environment: conn.environment, previousAccessLevel: prevLevel, newAccessLevel: finalLevel, previousEnabled: prevEnabled, newEnabled: enabled });
      return ok({ updated: true, accessLevel: finalLevel, enabled });
    }

    case 'bulk_set_permissions': {
      const connectionId = typeof body.connectionId === 'string' ? body.connectionId : '';
      const agentIds = Array.isArray(body.agentIds) ? body.agentIds.filter((a): a is string => typeof a === 'string') : [];
      const accessLevel = typeof body.accessLevel === 'string' ? body.accessLevel : '';
      const enabled = body.enabled === true;
      const confirmSensitive = body.confirmSensitive === true;
      if (!connectionId || agentIds.length === 0 || !ACCESS_LEVELS.includes(accessLevel)) return fail('INVALID_INPUT', 'connectionId, agentIds and a valid access level are required', 400);
      const { data: conn } = await admin.from('integration_connections').select('id, provider_id, environment').eq('id', connectionId).maybeSingle();
      if (!conn) return fail('NOT_FOUND', 'Integration not found', 404);
      if (enabled && agentIds.length > 1 && isSensitiveProvider(String(conn.provider_id ?? '')) && !confirmSensitive) {
        return fail('SENSITIVE_CONFIRM_REQUIRED', 'Confirm before granting this sensitive integration to multiple agents', 409);
      }
      if (enabled && accessLevel !== 'none' && conn.environment === 'production') {
        const { data: ags } = await admin.from('forge_agents').select('id, name, allowed_environments').in('id', agentIds);
        const blocked = (ags ?? []).filter((a) => !(Array.isArray(a.allowed_environments) ? a.allowed_environments : []).includes('production')).map((a) => a.name);
        if (blocked.length) return fail('ENV_NOT_ALLOWED', `The following agents do not have production access: ${blocked.join(', ')}.`, 409);
      }
      const finalLevel = enabled ? accessLevel : 'none';
      const now = new Date().toISOString();
      const rows = agentIds.map((agentId) => ({ integration_connection_id: connectionId, agent_id: agentId, access_level: finalLevel, is_enabled: enabled, created_by: userId, updated_at: now }));
      const { error } = await admin.from('integration_agent_permissions').upsert(rows, { onConflict: 'integration_connection_id,agent_id' });
      if (error) return fail('STORE_FAILED', 'Unable to save permissions', 500);
      await audit(admin, userId, enabled ? 'integration.permissions_granted_bulk' : 'integration.permissions_revoked_bulk', 'integration', connectionId, { agentIds, accessLevel: finalLevel, environment: conn.environment });
      return ok({ updated: true, count: rows.length });
    }

    case 'set_agent_status': {
      const agentId = typeof body.agentId === 'string' ? body.agentId : '';
      const status = body.status === 'active' || body.status === 'disabled' ? body.status : '';
      if (!agentId || !status) return fail('INVALID_INPUT', 'agentId and a valid status are required', 400);
      const { data: existing } = await admin.from('forge_agents').select('id, status').eq('id', agentId).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'Agent not found', 404);
      await admin.from('forge_agents').update({ status, updated_at: new Date().toISOString() }).eq('id', agentId);
      await audit(admin, userId, 'agent.status_changed', 'agent', agentId, { previousStatus: existing.status, newStatus: status });
      return ok({ updated: true, status });
    }

    case 'set_agent_environments': {
      const agentId = typeof body.agentId === 'string' ? body.agentId : '';
      const environments = Array.isArray(body.environments) ? body.environments.filter((e): e is string => typeof e === 'string' && ENVIRONMENTS.includes(e)) : [];
      if (!agentId || environments.length === 0) return fail('INVALID_INPUT', 'agentId and at least one valid environment are required', 400);
      const { data: existing } = await admin.from('forge_agents').select('id, allowed_environments').eq('id', agentId).maybeSingle();
      if (!existing) return fail('NOT_FOUND', 'Agent not found', 404);
      await admin.from('forge_agents').update({ allowed_environments: environments, updated_at: new Date().toISOString() }).eq('id', agentId);
      await audit(admin, userId, 'agent.environments_changed', 'agent', agentId, { previousEnvironments: existing.allowed_environments, newEnvironments: environments });
      return ok({ updated: true, environments });
    }

    default: return fail('INVALID_ACTION', `Unknown action "${action}"`, 400);
  }
});
