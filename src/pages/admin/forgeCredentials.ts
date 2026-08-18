import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Forge Credentials client — transports data to/from the
   forge-credentials edge function. Secrets never return to the
   browser; only safe metadata and a masked suffix are exposed.
   ────────────────────────────────────────────────────────────── */

export type CredentialKind = 'ai' | 'search' | 'email' | 'automation' | 'payments' | 'infrastructure';

export type CredentialProvider = {
  key: string;
  label: string;
  kind: CredentialKind;
  needsBaseUrl: boolean;
  description: string;
};

export type PlatformCredential = {
  id: string;
  provider_key: string;
  credential_type: string;
  key_suffix: string;
  environment: string;
  status: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_by_email: string | null;
  updated_by_email: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  last_used_at: string | null;
  rotated_at: string | null;
};

export type CredentialActivity = {
  id: string;
  action: string;
  provider_key: string | null;
  environment: string | null;
  credential_type: string | null;
  actor_email: string | null;
  actor_name: string | null;
  success: boolean | null;
  error_code: string | null;
  created_at: string;
};

export type CredentialTest = { ok: boolean; code: string; message: string };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function invoke<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, code: 'NO_CLIENT', message: 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.functions.invoke('forge-credentials', { body: { action, ...body } });
    if (error) {
      let code = 'INVOKE_ERROR';
      let message = error.message ?? 'Request failed.';
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const parsed = (await context.json()) as { errorCode?: string; message?: string } | null;
          if (parsed?.errorCode) code = parsed.errorCode;
          if (parsed?.message) message = parsed.message;
        } catch {
          // Body wasn't JSON; keep the generic message.
        }
      }
      return { ok: false, code, message };
    }
    const d = data as { code?: string; errorCode?: string; message?: string } & Record<string, unknown>;
    if (!d || d.code !== 'OK') return { ok: false, code: d?.errorCode ?? 'ERROR', message: d?.message ?? 'Request failed.' };
    return { ok: true, data: d as unknown as T };
  } catch (e) {
    return { ok: false, code: 'EXCEPTION', message: e instanceof Error ? e.message : 'Request failed.' };
  }
}

export const credentialsApi = {
  providers: () => invoke<{ providers: CredentialProvider[] }>('list_providers'),
  list: () => invoke<{ credentials: PlatformCredential[] }>('list_platform_credentials'),
  activity: () => invoke<{ activity: CredentialActivity[] }>('list_activity'),
  test: (providerKey: string, secret: string, baseUrl?: string) =>
    invoke<CredentialTest>('test_platform_credential', { providerKey, secret, baseUrl: baseUrl || undefined }),
  testStored: (id: string) => invoke<CredentialTest>('test_platform_credential', { id }),
  save: (payload: { providerKey: string; environment: string; secret: string; baseUrl?: string; credentialType?: string }) =>
    invoke<{ providerKey: string; environment: string; key_suffix: string }>('save_platform_credential', { ...payload, credentialType: payload.credentialType || 'api_key' }),
  replace: (payload: { providerKey: string; environment: string; secret: string; baseUrl?: string; credentialType?: string }) =>
    invoke<{ replaced: boolean; key_suffix: string }>('replace_platform_credential', { ...payload, credentialType: payload.credentialType || 'api_key' }),
  disable: (id: string) => invoke<{ disabled: boolean }>('disable_platform_credential', { id }),
  enable: (id: string) => invoke<{ enabled: boolean }>('enable_platform_credential', { id }),
  remove: (id: string) => invoke<{ deleted: boolean }>('delete_platform_credential', { id }),
};

/* ─── Status derivation — never "connected" merely because a row exists ─── */

export type CredentialStatus = 'connected' | 'disabled' | 'failed' | 'unavailable' | 'never_tested' | 'not_configured';

export function deriveStatus(cred: PlatformCredential | null | undefined): CredentialStatus {
  if (!cred) return 'not_configured';
  if (cred.status === 'disabled') return 'disabled';
  if (cred.status === 'invalid' || cred.last_test_status === 'failed') {
    if (cred.last_test_message === 'Unable to reach provider') return 'unavailable';
    return 'failed';
  }
  if (cred.last_test_status === 'success') return 'connected';
  return 'never_tested';
}

export const ENVIRONMENT_OPTIONS = [
  { value: 'test', label: 'Test' },
  { value: 'production', label: 'Production' },
];

export const KIND_ICON: Record<string, string> = {
  ai: 'ri-robot-line',
  search: 'ri-search-line',
  email: 'ri-mail-line',
  automation: 'ri-flow-chart',
  payments: 'ri-bank-card-line',
  infrastructure: 'ri-database-2-line',
};