import { getSandboxClient, resolveSandboxProject } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Publishing client — deployments, domains, rollback & unpublish.
   All privileged operations go through the `forge-publish` edge
   function; the browser never touches a provider directly and never
   supplies authoritative status, credentials or entitlement values.
   ────────────────────────────────────────────────────────────── */

export type DeploymentEnvironment = 'preview' | 'staging' | 'production';

export const DEPLOYMENT_ENVIRONMENTS: DeploymentEnvironment[] = ['preview', 'staging', 'production'];

export const ENVIRONMENT_LABELS: Record<DeploymentEnvironment, string> = {
  preview: 'Preview',
  staging: 'Staging',
  production: 'Production',
};

export type DeploymentStatus =
  | 'queued' | 'validating' | 'deploying' | 'verifying'
  | 'active' | 'failed' | 'cancelled' | 'superseded' | 'rolled_back';

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  queued: 'Queued',
  validating: 'Validating',
  deploying: 'Deploying',
  verifying: 'Verifying',
  active: 'Active',
  failed: 'Failed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
  rolled_back: 'Rolled back',
};

export type DeploymentRecord = {
  id: string;
  projectId: string;
  buildId: string | null;
  sourceVersionId: string | null;
  requestedBy: string | null;
  environment: DeploymentEnvironment;
  provider: string | null;
  providerProjectId: string | null;
  providerDeploymentId: string | null;
  status: DeploymentStatus;
  deploymentUrl: string | null;
  artifactChecksum: string | null;
  idempotencyKey: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type DomainStatus = 'pending' | 'verified' | 'failed' | 'disconnected';

export type DomainRecord = {
  id: string;
  projectId: string;
  hostname: string;
  environment: DeploymentEnvironment;
  provider: string | null;
  status: DomainStatus;
  verificationTokenHash: string | null;
  dnsRecords: unknown | null;
  sslStatus: 'pending' | 'provisioning' | 'active' | 'failed';
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  isPrimary: boolean;
  redirectWww: boolean;
  forceHttps: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeploymentEvent = {
  id: string;
  deploymentId: string;
  projectId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type PublishStatus = {
  providerConfigured: boolean;
  allowedEnvironments: DeploymentEnvironment[];
};

export type PublishActionResult =
  | { ok: true; deploymentId?: string; idempotent?: boolean; deployment?: Record<string, unknown> }
  | { ok: false; errorCode: string; message: string; deploymentId?: string };

/* ──────────────────────────────────────────────────────────────
   Hostname normalisation & validation
   ────────────────────────────────────────────────────────────── */

export function normalizeHostname(input: string): string {
  return input.trim().toLowerCase().replace(/\/+$/, '');
}

export function validateHostname(input: string): { ok: boolean; error?: string } {
  const hostname = normalizeHostname(input);
  if (!hostname) return { ok: false, error: 'Enter a hostname.' };
  if (/^https?:\/\//i.test(hostname) || hostname.includes('/') || hostname.includes(':') || hostname.includes(' ')) {
    return { ok: false, error: 'Enter a bare hostname (no http://, paths or ports).' };
  }
  if (hostname.startsWith('*')) {
    return { ok: false, error: 'Wildcard domains are not supported.' };
  }
  // Punycode-safe: allow unicode labels plus standard DNS characters.
  if (!/^[a-z0-9\u00a1-\uffff]([a-z0-9\u00a1-\uffff.-]*[a-z0-9\u00a1-\uffff])?$/.test(hostname)) {
    return { ok: false, error: 'That does not look like a valid hostname.' };
  }
  if (!hostname.includes('.')) {
    return { ok: false, error: 'Enter a full domain (e.g. example.com).' };
  }
  return { ok: true };
}

/* ──────────────────────────────────────────────────────────────
   Token hashing (store only a hash, never the raw token)
   ────────────────────────────────────────────────────────────── */

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `fnv-${`00000000${hash.toString(16)}`.slice(-8)}`;
}

/* ──────────────────────────────────────────────────────────────
   Row mappers
   ────────────────────────────────────────────────────────────── */

function mapDeployment(row: Record<string, unknown>): DeploymentRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    buildId: row.build_id ? String(row.build_id) : null,
    sourceVersionId: row.source_version_id ? String(row.source_version_id) : null,
    requestedBy: row.requested_by ? String(row.requested_by) : null,
    environment: (String(row.environment) as DeploymentEnvironment) || 'preview',
    provider: row.provider ? String(row.provider) : null,
    providerProjectId: row.provider_project_id ? String(row.provider_project_id) : null,
    providerDeploymentId: row.provider_deployment_id ? String(row.provider_deployment_id) : null,
    status: (String(row.status) as DeploymentStatus) || 'queued',
    deploymentUrl: row.deployment_url ? String(row.deployment_url) : null,
    artifactChecksum: row.artifact_checksum ? String(row.artifact_checksum) : null,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
  };
}

function mapDomain(row: Record<string, unknown>): DomainRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    hostname: String(row.hostname),
    environment: (String(row.environment) as DeploymentEnvironment) || 'production',
    provider: row.provider ? String(row.provider) : null,
    status: (String(row.status) as DomainStatus) || 'pending',
    verificationTokenHash: row.verification_token_hash ? String(row.verification_token_hash) : null,
    dnsRecords: row.dns_records ?? null,
    sslStatus: (String(row.ssl_status) as DomainRecord['sslStatus']) || 'pending',
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    lastCheckedAt: row.last_checked_at ? String(row.last_checked_at) : null,
    isPrimary: row.is_primary === true,
    redirectWww: row.redirect_www === true,
    forceHttps: row.force_https === true,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEvent(row: Record<string, unknown>): DeploymentEvent {
  return {
    id: String(row.id),
    deploymentId: String(row.deployment_id),
    projectId: String(row.project_id),
    eventType: String(row.event_type),
    previousStatus: row.previous_status ? String(row.previous_status) : null,
    newStatus: row.new_status ? String(row.new_status) : null,
    message: row.message ? String(row.message) : null,
    metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null,
    createdAt: String(row.created_at),
  };
}

/* ──────────────────────────────────────────────────────────────
   Edge-function wrapper
   ────────────────────────────────────────────────────────────── */

async function invokePublish(body: Record<string, unknown>): Promise<PublishActionResult> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Sign in to publish.' };
  try {
    const { data, error } = await supabase.functions.invoke('forge-publish', { body });
    if (error) {
      // HTTP-level error (auth/validation). Prefer the structured message.
      const message = (error as { message?: string }).message ?? 'Publishing request failed.';
      return { ok: false, errorCode: 'REQUEST_FAILED', message };
    }
    const payload = data as Record<string, unknown> | null;
    if (!payload) return { ok: false, errorCode: 'REQUEST_FAILED', message: 'No response from the publishing service.' };
    if (payload.code === 'OK') {
      return { ok: true, deploymentId: payload.deploymentId as string | undefined, idempotent: payload.idempotent === true, deployment: payload.deployment as Record<string, unknown> | undefined };
    }
    return {
      ok: false,
      errorCode: String(payload.errorCode ?? 'REQUEST_FAILED'),
      message: String(payload.message ?? 'Publishing failed.'),
      deploymentId: payload.deploymentId as string | undefined,
    };
  } catch (err) {
    return { ok: false, errorCode: 'NETWORK_ERROR', message: (err as Error).message ?? 'Could not reach the publishing service.' };
  }
}

/* ──────────────────────────────────────────────────────────────
   Public client API
   ────────────────────────────────────────────────────────────── */

export async function getPublishStatus(): Promise<PublishStatus> {
  const supabase = getSandboxClient();
  if (!supabase) return { providerConfigured: false, allowedEnvironments: ['preview', 'staging', 'production'] };
  try {
    const { data } = await supabase.functions.invoke('forge-publish', { body: { action: 'status' } });
    const payload = data as Record<string, unknown> | null;
    return {
      providerConfigured: payload?.providerConfigured === true,
      allowedEnvironments: Array.isArray(payload?.allowedEnvironments)
        ? (payload.allowedEnvironments as DeploymentEnvironment[]).filter((env) => DEPLOYMENT_ENVIRONMENTS.includes(env))
        : ['preview', 'staging', 'production'],
    };
  } catch {
    return { providerConfigured: false, allowedEnvironments: ['preview', 'staging', 'production'] };
  }
}

export async function requestDeployment(input: {
  environment: DeploymentEnvironment;
  sourceVersionId: string | null;
  buildId: string | null;
  idempotencyKey: string;
}): Promise<PublishActionResult> {
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Sign in to publish.' };
  return invokePublish({
    action: 'deploy',
    projectId: resolved.projectId,
    environment: input.environment,
    sourceVersionId: input.sourceVersionId,
    buildId: input.buildId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function rollbackDeployment(deploymentId: string): Promise<PublishActionResult> {
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Sign in to roll back.' };
  return invokePublish({
    action: 'rollback',
    projectId: resolved.projectId,
    deploymentId,
    idempotencyKey: `rollback-${deploymentId}-${Date.now()}`,
  });
}

export async function unpublishDeployment(deploymentId: string): Promise<PublishActionResult> {
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, errorCode: 'AUTH_REQUIRED', message: 'Sign in to unpublish.' };
  return invokePublish({
    action: 'unpublish',
    projectId: resolved.projectId,
    deploymentId,
  });
}

export async function listDeployments(): Promise<DeploymentRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapDeployment);
}

export async function listDeploymentEvents(deploymentId: string): Promise<DeploymentEvent[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('deployment_events')
    .select('*')
    .eq('project_id', resolved.projectId)
    .eq('deployment_id', deploymentId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapEvent);
}

export async function listDomains(): Promise<DomainRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapDomain);
}

export async function addDomain(input: { hostname: string; environment: DeploymentEnvironment }): Promise<{ ok: boolean; message: string }> {
  const hostname = normalizeHostname(input.hostname);
  const check = validateHostname(hostname);
  if (!check.ok) return { ok: false, message: check.error ?? 'Invalid hostname.' };
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to add a domain.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to add a domain.' };

  const token = `forge-verify-${crypto.randomUUID()}`;
  const verificationTokenHash = await sha256(token);

  const { error } = await supabase.from('domains').insert({
    project_id: resolved.projectId,
    hostname,
    environment: input.environment,
    status: 'pending',
    ssl_status: 'pending',
    verification_token_hash: verificationTokenHash,
    is_primary: false,
    redirect_www: false,
    force_https: true,
    created_by: resolved.userId,
  });
  if (error) {
    if (String(error.message).includes('duplicate') || error.code === '23505') {
      return { ok: false, message: 'That hostname is already attached to a project.' };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, message: `Added ${hostname}` };
}

export async function removeDomain(domainId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to remove a domain.' };
  const { error } = await supabase.from('domains').delete().eq('id', domainId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Domain removed' };
}

export async function setPrimaryDomain(domainId: string, isPrimary: boolean): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to update the domain.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to update the domain.' };
  if (isPrimary) {
    // Clear any other primary first, then promote this one.
    const { error: clearError } = await supabase
      .from('domains')
      .update({ is_primary: false })
      .eq('project_id', resolved.projectId)
      .eq('is_primary', true);
    if (clearError) return { ok: false, message: clearError.message };
  }
  const { error } = await supabase.from('domains').update({ is_primary: isPrimary }).eq('id', domainId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: isPrimary ? 'Primary domain updated' : 'Domain unset as primary' };
}

export async function updateDomainRedirects(domainId: string, patch: { redirectWww?: boolean; forceHttps?: boolean }): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to update the domain.' };
  const update: Record<string, boolean> = {};
  if (typeof patch.redirectWww === 'boolean') update.redirect_www = patch.redirectWww;
  if (typeof patch.forceHttps === 'boolean') update.force_https = patch.forceHttps;
  const { error } = await supabase.from('domains').update(update).eq('id', domainId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Domain settings updated' };
}

export async function verifyDomain(domainId: string): Promise<{ ok: boolean; message: string }> {
  // Verification is provider-driven. With no provider configured this is
  // honestly unavailable — we never claim verification without confirmation.
  const status = await getPublishStatus();
  if (!status.providerConfigured) {
    return { ok: false, message: 'Hosting provider not configured — verification is unavailable.' };
  }
  // A future provider adapter would check DNS here via the edge function.
  return { ok: false, message: 'Verification requires a configured hosting provider.' };
}