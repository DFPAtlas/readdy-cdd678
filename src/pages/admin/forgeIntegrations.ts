import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Forge Integrations client — transports data to/from the
   forge-integrations edge function. Secrets never pass back to
   the browser; only metadata and a masked suffix are returned.
   ────────────────────────────────────────────────────────────── */

export type ProviderCategory = 'ai' | 'search' | 'email' | 'automation' | 'payments' | 'infrastructure';

export type ProviderCatalogItem = {
  provider_id: string;
  name: string;
  category: ProviderCategory;
  auth_type: string;
  description: string;
  needs_base_url: boolean;
  sensitive: boolean;
};

export type OAuthProvider = {
  id: string;
  name: string;
  service: string;
  connectLabel: string;
  description: string;
  scopes: string[];
  granted: string[];
  denied: string[];
  sensitive: boolean;
  configured: boolean;
};

export type IntegrationConnection = {
  id: string;
  provider_id: string;
  connection_name: string;
  provider_category: string;
  auth_type: string;
  environment: string;
  base_url: string | null;
  secret_suffix: string | null;
  status: string;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  account_name: string | null;
  account_email: string | null;
  account_avatar_url: string | null;
  provider_account_id: string | null;
  scopes: string[] | null;
  oauth_expires_at: string | null;
  connected_at: string | null;
  sensitive: boolean;
};

export type TestResult = {
  ok: boolean;
  status: number | null;
  message: string;
  latencyMs: number;
  provider?: string;
  timestamp?: string;
  mode?: 'test' | 'live' | null;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function invoke<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, code: 'NO_CLIENT', message: 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.functions.invoke('forge-integrations', { body: { action, ...body } });
    if (error) return { ok: false, code: 'INVOKE_ERROR', message: error.message ?? 'Request failed.' };
    const d = data as { code?: string; errorCode?: string; message?: string } & Record<string, unknown>;
    if (!d || d.code !== 'OK') return { ok: false, code: d?.errorCode ?? 'ERROR', message: d?.message ?? 'Request failed.' };
    return { ok: true, data: d as unknown as T };
  } catch (e) {
    return { ok: false, code: 'EXCEPTION', message: e instanceof Error ? e.message : 'Request failed.' };
  }
}

export const integrationsApi = {
  catalog: () => invoke<{ providers: ProviderCatalogItem[] }>('catalog'),
  list: () => invoke<{ connections: IntegrationConnection[] }>('list'),
  test: (providerId: string, apiKey: string, baseUrl?: string) => invoke<TestResult>('test', { providerId, apiKey, baseUrl }),
  save: (payload: { providerId: string; connectionName: string; environment: string; apiKey: string; baseUrl?: string; testFirst: boolean }) =>
    invoke<{ connection: IntegrationConnection }>('save', payload),
  testStored: (connectionId: string) => invoke<{ result: TestResult; status: string }>('test_stored', { connectionId }),
  replace: (payload: { connectionId: string; apiKey: string; testFirst: boolean; confirmProduction?: boolean }) =>
    invoke<{ replaced: boolean; secret_suffix: string }>('replace', payload),
  disable: (connectionId: string, confirmProduction = false) => invoke('disable', { connectionId, confirmProduction }),
  enable: (connectionId: string) => invoke('enable', { connectionId }),
  remove: (connectionId: string, confirm: 'DELETE' | 'PRODUCTION' = 'DELETE') => invoke('delete', { connectionId, confirm }),
  oauthProviders: () => invoke<{ providers: OAuthProvider[] }>('oauth_providers'),
  oauthStart: (payload: { provider: string; connectionName: string; environment: string; returnUrl: string; connectionId?: string }) =>
    invoke<{ url: string }>('oauth_start', payload),
  oauthRevoke: (connectionId: string, confirmProduction = false) => invoke<{ revoked: boolean }>('oauth_revoke', { connectionId, confirmProduction }),
  agents: () => invoke<{ agents: ForgeAgent[] }>('agents'),
  agentPermissions: (connectionId?: string) =>
    invoke<{ permissions: AgentPermission[] }>('agent_permissions', connectionId ? { connectionId } : {}),
  setAgentPermission: (payload: { connectionId: string; agentId: string; accessLevel: AccessLevel; enabled: boolean }) =>
    invoke<{ updated: boolean; accessLevel: AccessLevel; enabled: boolean }>('set_agent_permission', payload),
  bulkSetPermissions: (payload: { connectionId: string; agentIds: string[]; accessLevel: AccessLevel; enabled: boolean; confirmSensitive?: boolean }) =>
    invoke<{ updated: boolean; count: number }>('bulk_set_permissions', payload),
  setAgentStatus: (agentId: string, status: 'active' | 'disabled') =>
    invoke<{ updated: boolean; status: string }>('set_agent_status', { agentId, status }),
  setAgentEnvironments: (agentId: string, environments: Environment[]) =>
    invoke<{ updated: boolean; environments: string[] }>('set_agent_environments', { agentId, environments }),
  route: (payload: { agentId: string; providerId: string; environment: Environment; requiredLevel?: AccessLevel }) =>
    invoke<{ authorized: boolean; connectionId?: string; provider?: string; connectionName?: string; environment?: string; agent?: string; level?: string }>('route', payload),
  clone: (payload: { sourceId: string; targetEnvironment: Environment; connectionName?: string; copyAgentMappings?: boolean }) =>
    invoke<{ connectionId: string; connectionName: string }>('clone', payload),
};

export type AccessLevel = 'none' | 'read' | 'execute' | 'manage';

export const ACCESS_LEVELS: { value: AccessLevel; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'read', label: 'Read' },
  { value: 'execute', label: 'Execute' },
  { value: 'manage', label: 'Manage' },
];

export type ForgeAgent = {
  id: string;
  name: string;
  agent_type: string;
  description: string | null;
  status: string;
  sensitivity_level: string;
  allowed_environments: string[] | null;
  created_at: string;
  updated_at: string;
};

export type AgentPermission = {
  id: string;
  integration_connection_id: string;
  agent_id: string;
  access_level: AccessLevel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  agent_name: string | null;
  agent_type: string | null;
  agent_status: string | null;
  agent_sensitivity: string | null;
  connection_name: string | null;
  provider_id: string | null;
  environment: string | null;
};

export const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
  { value: 'sandbox', label: 'Sandbox' },
];

export type Environment = 'development' | 'staging' | 'production' | 'sandbox';

export const ENVIRONMENTS: Environment[] = ['development', 'staging', 'production', 'sandbox'];