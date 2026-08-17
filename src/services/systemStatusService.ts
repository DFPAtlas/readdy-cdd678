import { getSupabaseClient } from '@/services/supabaseClient';

/* ──────────────────────────────────────────────────────────────
   System Status — real, safe client-side checks only.

   Every value here is derived from genuine signals available in the
   browser. We never fabricate uptime, never invent service probes,
   and never touch admin-only endpoints (forge-admin `health` /
   `incidents` are gated behind platform-admin permissions).

   Checks performed:
   * Supabase client configured  (env vars present)
   * Authentication reachable    (existing getSession() mechanism)
   * AI provider registry        (forge-providers `registry` action,
                                   which reads Postgres — so a success
                                   also proves the DB + edge function)
   * Provider keys configured    (forge-providers `list_keys`, masked)
   ────────────────────────────────────────────────────────────── */

export type CheckStatus = 'operational' | 'degraded' | 'unavailable' | 'not_configured' | 'unknown';
export type OverallStatus = 'operational' | 'degraded' | 'unavailable' | 'action_required' | 'unknown';

export interface CheckOutcome {
  status: CheckStatus;
  detail: string;
}

export interface ProviderHealth {
  id: string;
  providerKey: string;
  displayName: string;
  configured: boolean;
  keySuffix: string | null;
  modelCount: number;
  lastHealthCheck: string | null;
}

export interface StatusSnapshot {
  checkedAt: string;
  supabaseConfigured: boolean;
  authenticated: boolean;
  auth: CheckOutcome;
  registry: CheckOutcome;
  providers: ProviderHealth[];
  configuredCount: number;
}

export interface CoreService {
  key: string;
  name: string;
  description: string;
  status: CheckStatus;
  detail: string;
}

export interface DerivedStatus {
  overall: { status: OverallStatus; title: string; sentence: string };
  coreServices: CoreService[];
  issues: string[];
}

export function createEmptySnapshot(): StatusSnapshot {
  return {
    checkedAt: '',
    supabaseConfigured: false,
    authenticated: false,
    auth: { status: 'unknown', detail: '' },
    registry: { status: 'unknown', detail: '' },
    providers: [],
    configuredCount: 0,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

interface RegistryPayload {
  providers?: Array<{
    id: string;
    provider_key: string;
    display_name: string;
    status: string;
    base_url: string | null;
    data_classification: string;
    last_health_check: string | null;
  }>;
  models?: Array<{ id: string; provider_id: string; enabled: boolean }>;
}

async function resolveWorkspaceId(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function fetchSystemStatus(): Promise<StatusSnapshot> {
  const checkedAt = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      checkedAt,
      supabaseConfigured: false,
      authenticated: false,
      auth: { status: 'not_configured', detail: 'Supabase is not configured for this environment.' },
      registry: { status: 'not_configured', detail: 'Supabase is not configured for this environment.' },
      providers: [],
      configuredCount: 0,
    };
  }

  // 1. Authentication — reachability via the existing safe session mechanism.
  let authenticated = false;
  let userId: string | null = null;
  let auth: CheckOutcome;
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 8000);
    if (error) {
      auth = { status: 'unavailable', detail: 'The authentication service could not be reached.' };
    } else {
      authenticated = Boolean(data.session);
      userId = data.session?.user?.id ?? null;
      auth = {
        status: 'operational',
        detail: authenticated ? 'Signed in — session verified.' : 'Reachable — no active session.',
      };
    }
  } catch {
    auth = { status: 'unavailable', detail: 'The authentication service could not be reached.' };
  }

  // 2. AI provider registry — proves edge functions + a Postgres read.
  let registry: CheckOutcome;
  let providers: ProviderHealth[] = [];
  if (!authenticated || !userId) {
    registry = { status: 'unknown', detail: 'Sign in to verify the AI provider service.' };
  } else {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('forge-providers', { body: { action: 'registry' } }),
        10000,
      );
      const payload = (data ?? {}) as { code?: string; providers?: unknown; models?: unknown };
      if (error || payload.code !== 'OK') {
        registry = { status: 'unavailable', detail: 'The AI provider service could not be reached.' };
      } else {
        registry = { status: 'operational', detail: 'Provider registry responded.' };
        const regProviders = (Array.isArray(payload.providers) ? payload.providers : []) as RegistryPayload['providers'];
        const models = (Array.isArray(payload.models) ? payload.models : []) as RegistryPayload['models'];

        const suffixByProvider = new Map<string, string>();
        const workspaceId = await resolveWorkspaceId(userId);
        if (workspaceId) {
          const keysRes = await supabase.functions.invoke('forge-providers', {
            body: { action: 'list_keys', workspaceId },
          });
          const keysPayload = (keysRes.data ?? {}) as { code?: string; keys?: unknown };
          const keys = keysPayload.code === 'OK' && Array.isArray(keysPayload.keys)
            ? (keysPayload.keys as Array<{ provider_key: string; key_suffix: string }>)
            : [];
          keys.forEach((k) => suffixByProvider.set(k.provider_key, k.key_suffix));
        }

        providers = (regProviders ?? []).map((p) => {
          const keySuffix = suffixByProvider.get(p.provider_key) ?? null;
          const modelCount = (models ?? []).filter((m) => m.provider_id === p.id && m.enabled).length;
          return {
            id: p.id,
            providerKey: p.provider_key,
            displayName: p.display_name,
            configured: keySuffix !== null,
            keySuffix,
            modelCount,
            lastHealthCheck: p.last_health_check ?? null,
          };
        });
      }
    } catch {
      registry = { status: 'unavailable', detail: 'The AI provider service could not be reached.' };
    }
  }

  return {
    checkedAt,
    supabaseConfigured: true,
    authenticated,
    auth,
    registry,
    providers,
    configuredCount: providers.filter((p) => p.configured).length,
  };
}

export function deriveStatus(snapshot: StatusSnapshot): DerivedStatus {
  const database: CoreService = {
    key: 'database',
    name: 'Database',
    description: 'Supabase Postgres — the data layer behind projects, builds and AI.',
    status: !snapshot.supabaseConfigured
      ? 'not_configured'
      : !snapshot.authenticated
        ? 'unknown'
        : snapshot.registry.status === 'operational'
          ? 'operational'
          : 'unknown',
    detail: !snapshot.supabaseConfigured
      ? 'Supabase is not configured.'
      : !snapshot.authenticated
        ? 'Sign in to verify database reachability.'
        : snapshot.registry.status === 'operational'
          ? 'PostgreSQL responded to a read-only registry query.'
          : 'Could not be isolated from the provider service failure.',
  };

  const coreServices: CoreService[] = [
    {
      key: 'auth',
      name: 'Authentication',
      description: 'Supabase Auth — sign-in and session handling for Forge.',
      status: snapshot.auth.status,
      detail: snapshot.auth.detail,
    },
    database,
    {
      key: 'ai_gateway',
      name: 'AI Provider Gateway',
      description: 'forge-providers — routes model registry and credential handling.',
      status: snapshot.registry.status,
      detail: snapshot.registry.detail,
    },
  ];

  const issues: string[] = [];
  if (!snapshot.supabaseConfigured) {
    issues.push('Forge backend (Supabase) is not configured — required environment values are missing.');
  } else {
    if (snapshot.auth.status === 'unavailable') {
      issues.push('Authentication service could not be reached.');
    }
    if (snapshot.registry.status === 'unavailable') {
      issues.push('AI provider service could not be reached.');
    }
    if (snapshot.registry.status === 'unknown' && !snapshot.authenticated) {
      issues.push('Sign in to verify the AI provider service and database.');
    }
    if (snapshot.registry.status === 'operational' && snapshot.configuredCount === 0) {
      issues.push('AI provider not configured — configure one to use AI-assisted Forge features.');
    }
  }

  const overall = deriveOverall(snapshot, coreServices);

  return { overall, coreServices, issues };
}

function deriveOverall(
  snapshot: StatusSnapshot,
  coreServices: CoreService[],
): DerivedStatus['overall'] {
  if (!snapshot.supabaseConfigured) {
    return {
      status: 'action_required',
      title: 'Backend not connected',
      sentence: 'Connect Forge to Supabase before service status can be verified.',
    };
  }

  const unavailable = coreServices.filter((s) => s.status === 'unavailable');
  const unknown = coreServices.filter((s) => s.status === 'unknown');

  if (unavailable.length > 0) {
    const critical = unavailable.some((s) => s.key === 'auth' || s.key === 'database');
    return critical
      ? {
          status: 'unavailable',
          title: 'Unavailable',
          sentence: 'A core Forge service is unreachable. AI-assisted features may not work right now.',
        }
      : {
          status: 'degraded',
          title: 'Degraded',
          sentence: 'One or more Forge services require attention.',
        };
  }

  if (unknown.length > 0) {
    return {
      status: 'unknown',
      title: 'Not fully verified',
      sentence: 'Some services could not be verified. Sign in to complete the checks.',
    };
  }

  if (snapshot.configuredCount === 0) {
    return {
      status: 'action_required',
      title: 'Action required',
      sentence: 'Core services are responding, but no AI provider is configured yet.',
    };
  }

  return {
    status: 'operational',
    title: 'Operational',
    sentence: 'All configured Forge services are responding normally.',
  };
}