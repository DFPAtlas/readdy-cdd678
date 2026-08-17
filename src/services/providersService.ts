import { getSupabaseClient } from '@/services/supabaseClient';
import {
  fetchModelRegistry,
  listWorkspaceKeys,
  addWorkspaceKey,
  deleteWorkspaceKey,
  testProvider,
  type AiProviderInfo,
  type AiModelInfo,
} from '@/pages/projects/sandbox/sandboxAiOrchestration';

// ------------------------------------------------------------
// Global AI provider configuration, backed by the real
// forge-providers edge function and the ai_providers / ai_models /
// workspace_ai_keys tables. Keys are stored server-side (encrypted)
// and only ever shown as masked suffixes.
// ------------------------------------------------------------

export interface ProviderConnectionInfo {
  provider: AiProviderInfo;
  models: AiModelInfo[];
  keySuffix: string | null;
  configured: boolean;
}

export interface ProvidersData {
  authenticated: boolean;
  providers: ProviderConnectionInfo[];
  configuredCount: number;
}

export function createEmptyProvidersData(): ProvidersData {
  return { authenticated: false, providers: [], configuredCount: 0 };
}

async function resolveWorkspaceId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', authData.user.id)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function fetchProviders(): Promise<ProvidersData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyProvidersData();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return createEmptyProvidersData();

  const workspaceId = await resolveWorkspaceId();
  const [registry, keys] = await Promise.all([
    fetchModelRegistry(),
    workspaceId ? listWorkspaceKeys(workspaceId) : Promise.resolve([]),
  ]);

  const suffixByProvider = new Map<string, string>();
  keys.forEach((k) => suffixByProvider.set(k.provider_key, k.key_suffix));

  const providers = registry.providers.map((provider) => {
    const models = registry.models
      .filter((m) => m.provider_id === provider.id && m.enabled)
      .sort((a, b) => (b.routing_priority ?? 0) - (a.routing_priority ?? 0));
    const keySuffix = suffixByProvider.get(provider.provider_key) ?? null;
    return { provider, models, keySuffix, configured: keySuffix !== null };
  });

  return {
    authenticated: true,
    providers,
    configuredCount: providers.filter((p) => p.configured).length,
  };
}

export async function configureProvider(
  providerKey: string,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return { ok: false, message: 'No workspace found for your account.' };
  return addWorkspaceKey(workspaceId, providerKey, apiKey, 'production');
}

export async function disconnectProvider(
  providerKey: string,
): Promise<{ ok: boolean; message: string }> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return { ok: false, message: 'No workspace found for your account.' };
  return deleteWorkspaceKey(workspaceId, providerKey, 'production');
}

export async function testProviderConnection(
  providerKey: string,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return { ok: false, message: 'No workspace found for your account.' };
  return testProvider(workspaceId, providerKey, apiKey);
}