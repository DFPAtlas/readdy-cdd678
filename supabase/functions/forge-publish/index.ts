import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Publish — secure, authenticated publishing gateway.
   The browser NEVER calls a hosting provider directly, never sends
   credentials or entitlement values, and never supplies an
   authoritative deployment status. Everything is validated here.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Server-only provider + DNS credentials. Never exposed to the browser.
const FORGE_HOSTING_PROVIDER = Deno.env.get('FORGE_HOSTING_PROVIDER') ?? '';
const FORGE_HOSTING_API_TOKEN = Deno.env.get('FORGE_HOSTING_API_TOKEN') ?? '';
const FORGE_DNS_API_TOKEN = Deno.env.get('FORGE_DNS_API_TOKEN') ?? '';

const ALLOWED_ENVIRONMENTS = ['preview', 'staging', 'production'];

/* ─── Server-side entitlement interface (billing connects here later) ─── */
// Reads allowed environments from server config. Defaults permit all three
// for workspace owners; a billing layer can later gate production per plan.
function allowedEnvironments(): string[] {
  const configured = (Deno.env.get('FORGE_ALLOWED_ENVIRONMENTS') ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!configured.length) return ALLOWED_ENVIRONMENTS;
  return configured.filter((env) => ALLOWED_ENVIRONMENTS.includes(env));
}

function hostingProviderConfigured(): boolean {
  return Boolean(FORGE_HOSTING_PROVIDER);
}

/* ─── Helpers ─── */

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = /^https:\/\/[^/]*readdy\.ai$/.test(origin ?? '') || /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '');
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function error(requestId: string, errorCode: string, message: string, status = 400) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status);
}

/* ─── Ownership: project must belong to a workspace owned by the user ─── */

async function verifyOwnership(admin: ReturnType<typeof createClient>, userId: string, projectId: string) {
  const { data: project } = await admin
    .from('projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id')
    .eq('id', project.workspace_id)
    .eq('owner_id', userId)
    .maybeSingle();
  return workspace ? project : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/* ─── Deployment lifecycle helpers ─── */

async function recordEvent(
  admin: ReturnType<typeof createClient>,
  input: { deploymentId: string; projectId: string; eventType: string; previousStatus?: string | null; newStatus?: string | null; message?: string; metadata?: Record<string, unknown> },
) {
  await admin.from('deployment_events').insert({
    deployment_id: input.deploymentId,
    project_id: input.projectId,
    event_type: input.eventType,
    previous_status: input.previousStatus ?? null,
    new_status: input.newStatus ?? null,
    message: input.message ?? null,
    metadata: input.metadata ?? null,
  });
}

async function markFailed(
  admin: ReturnType<typeof createClient>,
  input: { deploymentId: string; projectId: string; errorCode: string; message: string; previousStatus?: string | null },
) {
  await admin.from('deployments').update({
    status: 'failed',
    error_code: input.errorCode,
    error_message: input.message,
    completed_at: new Date().toISOString(),
    duration_ms: 0,
  }).eq('id', input.deploymentId);
  await recordEvent(admin, {
    deploymentId: input.deploymentId,
    projectId: input.projectId,
    eventType: 'deployment_failed',
    previousStatus: input.previousStatus ?? 'queued',
    newStatus: 'failed',
    message: input.message,
    metadata: { error_code: input.errorCode },
  });
}

/* ─── Request handling ─── */

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401);
  }

  // 1. Verify the user from the session (never from the body).
  let userId: string;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return error(requestId, 'AUTH_REQUIRED', 'Invalid or expired session', 401);
    }
    userId = data.user.id;
  } catch {
    return error(requestId, 'AUTH_REQUIRED', 'Unable to verify session', 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(requestId, 'INVALID_REQUEST', 'Malformed JSON body', 400);
  }

  const action = typeof body.action === 'string' ? body.action : 'deploy';
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Status probe: reveal provider config (boolean only, no secrets) ──
  if (action === 'status') {
    return json({
      requestId,
      code: 'OK',
      providerConfigured: hostingProviderConfigured(),
      allowedEnvironments: allowedEnvironments(),
    }, 200, cors);
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  if (!projectId) {
    return error(requestId, 'INVALID_REQUEST', 'projectId is required', 400);
  }

  // 2. Ownership / publishing permission.
  const project = await verifyOwnership(admin, userId, projectId);
  if (!project) {
    return error(requestId, 'PROJECT_FORBIDDEN', 'Project not found or you do not have publishing permission', 403);
  }

  // 3. Entitlement / environment validation (server-controlled).
  const environment = typeof body.environment === 'string' ? body.environment : '';
  if (!ALLOWED_ENVIRONMENTS.includes(environment)) {
    return error(requestId, 'INVALID_ENVIRONMENT', `Environment must be one of: ${ALLOWED_ENVIRONMENTS.join(', ')}`, 400);
  }
  if (!allowedEnvironments().includes(environment)) {
    return error(requestId, 'ENVIRONMENT_FORBIDDEN', `Publishing to "${environment}" is not available on your plan`, 403);
  }

  // 4. Idempotency — never create duplicate deployments for the same request.
  const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey
    ? body.idempotencyKey
    : crypto.randomUUID();

  // ── DEPLOY ──
  if (action === 'deploy') {
    const { data: existing } = await admin
      .from('deployments')
      .select('id, status, environment, deployment_url, error_code, error_message, created_at')
      .eq('project_id', projectId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return json({ requestId, code: 'OK', idempotent: true, deployment: existing }, 200, cors);
    }

    const sourceVersionId = typeof body.sourceVersionId === 'string' ? body.sourceVersionId : '';
    const buildId = typeof body.buildId === 'string' ? body.buildId : '';

    // Create the deployment record (auditable, immutable history).
    const { data: deployment, error: createError } = await admin
      .from('deployments')
      .insert({
        project_id: projectId,
        build_id: buildId || null,
        source_version_id: sourceVersionId || null,
        requested_by: userId,
        environment,
        provider: FORGE_HOSTING_PROVIDER || null,
        status: 'queued',
        idempotency_key: idempotencyKey,
        started_at: new Date().toISOString(),
      })
      .select('id, status, environment, created_at')
      .single();

    if (createError || !deployment) {
      return error(requestId, 'DEPLOYMENT_CREATE_FAILED', 'Could not create the deployment record', 500);
    }
    await recordEvent(admin, {
      deploymentId: deployment.id,
      projectId,
      eventType: 'deployment_created',
      newStatus: 'queued',
      message: `Deployment requested for ${environment}`,
    });

    // 5. Provider must be configured — otherwise this is an honest failure,
    //    never a simulated success.
    if (!hostingProviderConfigured()) {
      await markFailed(admin, {
        deploymentId: deployment.id,
        projectId,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        message: 'Hosting provider not configured.',
        previousStatus: 'queued',
      });
      return json({
        requestId,
        code: 'ERROR',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        message: 'Hosting provider not configured.',
        deploymentId: deployment.id,
      }, 200, cors);
    }

    // 6. Source version must exist and be immutable.
    if (!sourceVersionId) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'SOURCE_VERSION_MISSING', message: 'A source version is required to publish.' });
      return json({ requestId, code: 'ERROR', errorCode: 'SOURCE_VERSION_MISSING', message: 'A source version is required to publish.', deploymentId: deployment.id }, 200, cors);
    }
    const { data: version } = await admin
      .from('project_versions')
      .select('id, checksum')
      .eq('id', sourceVersionId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!version) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'SOURCE_VERSION_NOT_FOUND', message: 'The source version does not exist.' });
      return json({ requestId, code: 'ERROR', errorCode: 'SOURCE_VERSION_NOT_FOUND', message: 'The source version does not exist.', deploymentId: deployment.id }, 200, cors);
    }

    // 7. Build must exist, be completed, and its checksum must be valid.
    if (!buildId) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'BUILD_MISSING', message: 'A completed build is required to publish.' });
      return json({ requestId, code: 'ERROR', errorCode: 'BUILD_MISSING', message: 'A completed build is required to publish.', deploymentId: deployment.id }, 200, cors);
    }
    const { data: build } = await admin
      .from('builds')
      .select('id, status, artifact_checksum, blueprint_checksum')
      .eq('id', buildId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!build) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'BUILD_NOT_FOUND', message: 'The build does not exist.' });
      return json({ requestId, code: 'ERROR', errorCode: 'BUILD_NOT_FOUND', message: 'The build does not exist.', deploymentId: deployment.id }, 200, cors);
    }
    if (build.status !== 'completed') {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'BUILD_NOT_COMPLETED', message: `The build has not completed (status: ${build.status}).` });
      return json({ requestId, code: 'ERROR', errorCode: 'BUILD_NOT_COMPLETED', message: `The build has not completed (status: ${build.status}).`, deploymentId: deployment.id }, 200, cors);
    }
    if (!build.artifact_checksum) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'CHECKSUM_MISSING', message: 'The build artifact has no checksum.' });
      return json({ requestId, code: 'ERROR', errorCode: 'CHECKSUM_MISSING', message: 'The build artifact has no checksum.', deploymentId: deployment.id }, 200, cors);
    }
    if (build.blueprint_checksum && version.checksum && build.blueprint_checksum !== version.checksum) {
      await markFailed(admin, { deploymentId: deployment.id, projectId, errorCode: 'CHECKSUM_MISMATCH', message: 'The build does not match the selected source version.' });
      return json({ requestId, code: 'ERROR', errorCode: 'CHECKSUM_MISMATCH', message: 'The build does not match the selected source version.', deploymentId: deployment.id }, 200, cors);
    }

    // 8. Dispatch to the Forge worker/queue. In this phase no worker is
    //    wired, so the deployment remains "queued" and is never faked.
    await recordEvent(admin, {
      deploymentId: deployment.id,
      projectId,
      eventType: 'deployment_queued',
      previousStatus: 'queued',
      newStatus: 'queued',
      message: 'Deployment accepted and queued for the Forge worker.',
    });

    return json({ requestId, code: 'OK', deploymentId: deployment.id, status: 'queued' }, 200, cors);
  }

  // ── ROLLBACK ──
  if (action === 'rollback') {
    const deploymentId = typeof body.deploymentId === 'string' ? body.deploymentId : '';
    if (!deploymentId) return error(requestId, 'INVALID_REQUEST', 'deploymentId is required', 400);

    const { data: target } = await admin
      .from('deployments')
      .select('id, project_id, source_version_id, build_id, artifact_checksum, environment, status')
      .eq('id', deploymentId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!target) return error(requestId, 'DEPLOYMENT_NOT_FOUND', 'Target deployment not found', 404);
    if (!['active', 'completed'].includes(target.status)) {
      return error(requestId, 'ROLLBACK_INVALID_TARGET', 'You can only roll back to a successful deployment', 400);
    }

    const { data: rollback } = await admin
      .from('deployments')
      .insert({
        project_id: projectId,
        build_id: target.build_id,
        source_version_id: target.source_version_id,
        requested_by: userId,
        environment: target.environment,
        provider: FORGE_HOSTING_PROVIDER || null,
        status: 'queued',
        idempotency_key: idempotencyKey,
        artifact_checksum: target.artifact_checksum,
        started_at: new Date().toISOString(),
        metadata: { rollbackFrom: target.id },
      })
      .select('id, status, environment, created_at')
      .single();

    if (!rollback) return error(requestId, 'DEPLOYMENT_CREATE_FAILED', 'Could not create the rollback deployment', 500);

    await recordEvent(admin, {
      deploymentId: rollback.id,
      projectId,
      eventType: 'rollback_requested',
      newStatus: 'queued',
      message: `Rollback requested to deployment ${deploymentId}`,
      metadata: { rollbackFrom: target.id },
    });

    if (!hostingProviderConfigured()) {
      await markFailed(admin, {
        deploymentId: rollback.id,
        projectId,
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        message: 'Hosting provider not configured.',
        previousStatus: 'queued',
      });
      return json({ requestId, code: 'ERROR', errorCode: 'PROVIDER_NOT_CONFIGURED', message: 'Hosting provider not configured.', deploymentId: rollback.id }, 200, cors);
    }

    return json({ requestId, code: 'OK', deploymentId: rollback.id, status: 'queued' }, 200, cors);
  }

  // ── UNPUBLISH ──
  if (action === 'unpublish') {
    const deploymentId = typeof body.deploymentId === 'string' ? body.deploymentId : '';
    if (!deploymentId) return error(requestId, 'INVALID_REQUEST', 'deploymentId is required', 400);

    const { data: target } = await admin
      .from('deployments')
      .select('id, project_id, environment, status')
      .eq('id', deploymentId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!target) return error(requestId, 'DEPLOYMENT_NOT_FOUND', 'Deployment not found', 404);

    if (!hostingProviderConfigured()) {
      await recordEvent(admin, {
        deploymentId: target.id,
        projectId,
        eventType: 'unpublish_failed',
        previousStatus: target.status,
        newStatus: target.status,
        message: 'Hosting provider not configured.',
        metadata: { error_code: 'PROVIDER_NOT_CONFIGURED' },
      });
      return json({ requestId, code: 'ERROR', errorCode: 'PROVIDER_NOT_CONFIGURED', message: 'Hosting provider not configured.', deploymentId: target.id }, 200, cors);
    }

    await recordEvent(admin, {
      deploymentId: target.id,
      projectId,
      eventType: 'unpublish_requested',
      previousStatus: target.status,
      newStatus: 'rolled_back',
      message: `Unpublish requested for ${target.environment}`,
    });

    return json({ requestId, code: 'OK', deploymentId: target.id, status: 'rolled_back' }, 200, cors);
  }

  return error(requestId, 'INVALID_ACTION', `Unknown action "${action}"`, 400);
});
