import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type AdminRole =
  | 'super_admin' | 'operations_admin' | 'support_admin'
  | 'billing_admin' | 'security_admin' | 'template_moderator';

const ROLES: AdminRole[] = [
  'super_admin', 'operations_admin', 'support_admin',
  'billing_admin', 'security_admin', 'template_moderator',
];

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  operations_admin: ['dashboard.read', 'health.read', 'deployments.operate', 'ai.operate', 'incidents.manage', 'forms.read'],
  support_admin: ['dashboard.read', 'users.manage', 'users.suspend', 'projects.inspect', 'support.mode', 'forms.read'],
  billing_admin: ['dashboard.read', 'billing.read', 'billing.operate'],
  security_admin: ['dashboard.read', 'security.read', 'audit.read', 'users.manage', 'health.read'],
  template_moderator: ['dashboard.read', 'templates.moderate'],
};

const SERVICES = [
  'web_app', 'database', 'auth', 'storage', 'edge_functions', 'realtime',
  'ai_providers', 'ollama', 'n8n', 'stripe', 'email', 'hosting', 'deployment_workers', 'queues',
];

const PLAN_PRICE_MONTHLY: Record<string, number> = {
  free: 0, starter: 19, builder: 49, pro: 99, agency: 249,
};

function intervalAmount(planKey: string | null | undefined, interval: string | null | undefined): number {
  const price = PLAN_PRICE_MONTHLY[planKey ?? ''];
  if (price === undefined) return 0;
  return interval === 'year' ? price * 10 : price;
}

function monthlyMrrFor(planKey: string | null | undefined, interval: string | null | undefined): number {
  const price = PLAN_PRICE_MONTHLY[planKey ?? ''];
  if (price === undefined || price === 0) return 0;
  return interval === 'year' ? (price * 10) / 12 : price;
}

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
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function error(requestId: string, errorCode: string, message: string, status = 400) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status);
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

type AdminCtx = { userId: string; role: AdminRole; permissions: string[] };

async function resolveAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<AdminCtx | null> {
  const { data } = await admin.from('platform_admins').select('role, permissions, active')
    .eq('user_id', userId).maybeSingle();

  if (data?.active) {
    const role = ROLES.includes(data.role as AdminRole) ? (data.role as AdminRole) : 'support_admin';
    const stored: string[] = Array.isArray(data.permissions) ? data.permissions.filter((p: unknown) => typeof p === 'string') : [];
    return { userId, role, permissions: [...ROLE_PERMISSIONS[role], ...stored] };
  }

  return null;
}

function hasPerm(ctx: AdminCtx, perm: string): boolean {
  return ctx.permissions.includes('*') || ctx.permissions.includes(perm);
}

async function audit(admin: ReturnType<typeof createClient>, ctx: AdminCtx, action: string, targetType: string | null, targetId: string | null, reason: string | null, safeMetadata: Record<string, unknown> | null) {
  await admin.from('admin_audit_events').insert({
    admin_user_id: ctx.userId, action, target_type: targetType, target_id: targetId,
    reason: reason ? reason.slice(0, 2000) : null, safe_metadata: safeMetadata,
  }).then(() => {}).catch(() => {});
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405);

  const userId = await getUserId(req.headers.get('authorization'));
  if (!userId) return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return error(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400); }
  const action = typeof body.action === 'string' ? body.action : 'whoami';

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const ctx = await resolveAdmin(admin, userId);
  if (!ctx) return error(requestId, 'FORBIDDEN', 'You do not have admin access', 403);

  const gate = (perm: string) => {
    if (!hasPerm(ctx, perm)) return error(requestId, 'FORBIDDEN', 'You do not have permission for this action', 403);
    return null;
  };

  const count = async (table: string) => {
    const { count: c } = await admin.from(table).select('*', { count: 'exact', head: true });
    return c ?? 0;
  };

  if (action === 'whoami') {
    return json({ requestId, code: 'OK', admin: { role: ctx.role, permissions: ctx.permissions } }, 200, cors);
  }

  if (action === 'dashboard') {
    const g = gate('dashboard.read'); if (g) return g;

    const [activeUsers, activeSubscriptions, projects, publishedSites, deploymentsToday, failedDeployments, aiJobs, queueDepth, templateQueue, openIncidents, formDeliveryFailures, storageBytes, webhookFailures, aiProviders, failedBuilds] = await Promise.all([
      count('profiles'),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing', 'past_due']); return c ?? 0; })(),
      count('projects'),
      (async () => { const { count: c } = await admin.from('deployments').select('*', { count: 'exact', head: true }).eq('environment', 'production').in('status', ['active', 'completed']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('deployments').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('deployments').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
      count('ai_jobs'),
      (async () => { const { count: c } = await admin.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'running']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('templates').select('*', { count: 'exact', head: true }).in('moderation_status', ['submitted', 'changes_requested']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('platform_incidents').select('*', { count: 'exact', head: true }).in('status', ['investigating', 'identified', 'monitoring']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('form_delivery_events').select('*', { count: 'exact', head: true }).in('status', ['failed', 'error']); return c ?? 0; })(),
      (async () => { const { data } = await admin.from('assets').select('size'); return (data ?? []).reduce((s: number, r: { size?: number }) => s + (r.size || 0), 0); })(),
      (async () => { const { count: c } = await admin.from('billing_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed'); return c ?? 0; })(),
      (async () => {
        const { data } = await admin.from('ai_providers').select('status');
        const list = data ?? [];
        return { total: list.length, healthy: list.filter((p: { status?: string }) => p.status === 'healthy').length, degraded: list.filter((p: { status?: string }) => p.status === 'degraded').length };
      })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
    ]);

    const summary = {
      activeUsers, activeSubscriptions, projects, publishedSites, deploymentsToday, failedDeployments,
      aiJobs, aiProviderHealth: aiProviders, queueDepth, formDeliveryFailures, storageBytes,
      templateQueue, securityAlerts: webhookFailures, openIncidents, failedBuilds,
    };
    await audit(admin, ctx, 'dashboard.viewed', null, null, null, null);
    return json({ requestId, code: 'OK', summary }, 200, cors);
  }

  if (action === 'attention') {
    const g = gate('dashboard.read'); if (g) return g;
    const dayAgo = new Date(Date.now() - 86400000).toISOString();

    const [failedBuilds24h, failedBuildsTotal, failedDeployments, failedBillingEvents, degradedProviders, openCriticalIncidents, openMajorIncidents, formDeliveryFailures, failedExports, recentUnhealthyChecks] = await Promise.all([
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('started_at', dayAgo); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('deployments').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('billing_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('ai_providers').select('*', { count: 'exact', head: true }).in('status', ['degraded', 'down']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('platform_incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['investigating', 'identified', 'monitoring']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('platform_incidents').select('*', { count: 'exact', head: true }).eq('severity', 'major').in('status', ['investigating', 'identified', 'monitoring']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('form_delivery_events').select('*', { count: 'exact', head: true }).in('status', ['failed', 'error']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('exports').select('*', { count: 'exact', head: true }).in('status', ['failed', 'error']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('service_health_checks').select('*', { count: 'exact', head: true }).in('status', ['down', 'degraded']).gte('checked_at', dayAgo); return c ?? 0; })(),
    ]);

    const items: Array<{ key: string; severity: string; title: string; detail: string; count: number }> = [];
    if (openCriticalIncidents > 0) items.push({ key: 'critical_incidents', severity: 'critical', title: 'Critical incidents open', detail: 'Open critical incidents require immediate attention.', count: openCriticalIncidents });
    if (openMajorIncidents > 0) items.push({ key: 'major_incidents', severity: 'warning', title: 'Major incidents open', detail: 'Open major incidents are being tracked.', count: openMajorIncidents });
    if (degradedProviders > 0) items.push({ key: 'provider_health', severity: 'critical', title: 'AI provider degraded', detail: 'One or more AI providers are degraded or down.', count: degradedProviders });
    if (failedDeployments > 0) items.push({ key: 'failed_deployments', severity: 'warning', title: 'Failed deployments', detail: 'Deployments have failed and may need retry or investigation.', count: failedDeployments });
    if (failedBuildsTotal > 0) items.push({ key: 'failed_builds', severity: 'warning', title: 'Failed builds', detail: `${failedBuilds24h} in the last 24 hours, ${failedBuildsTotal} total.`, count: failedBuildsTotal });
    if (failedBillingEvents > 0) items.push({ key: 'webhook_failures', severity: 'warning', title: 'Billing webhook failures', detail: 'Stripe webhook events failed to process.', count: failedBillingEvents });
    if (formDeliveryFailures > 0) items.push({ key: 'form_delivery', severity: 'warning', title: 'Form delivery failures', detail: 'Form submission delivery has failed.', count: formDeliveryFailures });
    if (failedExports > 0) items.push({ key: 'failed_exports', severity: 'warning', title: 'Export failures', detail: 'One or more project exports failed to complete.', count: failedExports });
    if (recentUnhealthyChecks > 0) items.push({ key: 'health_degradation', severity: 'warning', title: 'Service health degradation', detail: 'Recent health checks reported degraded or down services.', count: recentUnhealthyChecks });

    return json({ requestId, code: 'OK', items, checkedAt: new Date().toISOString() }, 200, cors);
  }

  if (action === 'health') {
    const g = gate('health.read'); if (g) return g;
    const results: Record<string, { status: string; responseTimeMs: number | null; safeError: string | null }> = {};

    const dbStart = Date.now();
    let dbStatus = 'unknown'; let dbError: string | null = null;
    try { await admin.from('profiles').select('id', { count: 'exact', head: true }); dbStatus = 'healthy'; }
    catch { dbStatus = 'down'; dbError = 'Database unreachable'; }
    results['database'] = { status: dbStatus, responseTimeMs: Date.now() - dbStart, safeError: dbError };
    results['web_app'] = { status: 'healthy', responseTimeMs: null, safeError: null };
    results['edge_functions'] = { status: 'healthy', responseTimeMs: null, safeError: null };

    const { data: providers } = await admin.from('ai_providers').select('status');
    const healthyCount = (providers ?? []).filter((p: { status?: string }) => p.status === 'healthy').length;
    results['ai_providers'] = (providers ?? []).length === 0
      ? { status: 'unknown', responseTimeMs: null, safeError: 'No providers configured' }
      : healthyCount > 0 ? { status: 'healthy', responseTimeMs: null, safeError: null } : { status: 'degraded', responseTimeMs: null, safeError: 'No healthy provider' };

    for (const svc of ['auth', 'storage', 'realtime', 'ollama', 'n8n', 'stripe', 'email', 'hosting', 'deployment_workers', 'queues']) {
      results[svc] = { status: 'unknown', responseTimeMs: null, safeError: 'No health probe configured' };
    }
    results['stripe'] = Deno.env.get('STRIPE_RESTRICTED_KEY')
      ? { status: 'unknown', responseTimeMs: null, safeError: 'Configured, not verified in this environment' }
      : { status: 'unknown', responseTimeMs: null, safeError: 'Not configured' };

    const now = new Date().toISOString();
    for (const svc of SERVICES) {
      const r = results[svc] ?? { status: 'unknown', responseTimeMs: null, safeError: null };
      await admin.from('service_health_checks').insert({
        service_key: svc, environment: 'production', status: r.status,
        response_time_ms: r.responseTimeMs, safe_error: r.safeError, checked_at: now,
      }).then(() => {}).catch(() => {});
    }

    return json({ requestId, code: 'OK', services: results, checkedAt: now }, 200, cors);
  }

  if (action === 'security') {
    const g = gate('security.read'); if (g) return g;
    const [webhookFailures, auditVolume, activeAdmins] = await Promise.all([
      (async () => { const { count: c } = await admin.from('billing_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed'); return c ?? 0; })(),
      count('admin_audit_events'),
      count('platform_admins'),
    ]);
    const items = [
      { key: 'webhook_signature_failures', label: 'Stripe webhook failures', count: webhookFailures, note: 'Failed billing event processing' },
      { key: 'admin_audit_volume', label: 'Admin audit events', count: auditVolume, note: 'Total audited admin actions' },
      { key: 'active_admins', label: 'Active platform admins', count: activeAdmins, note: 'Current admin records' },
      { key: 'failed_admin_logins', label: 'Failed admin logins', count: null, note: 'Not instrumented' },
      { key: 'cross_tenant_denials', label: 'Cross-tenant denials', count: null, note: 'Not instrumented' },
      { key: 'rate_limit_spikes', label: 'Rate-limit spikes', count: null, note: 'Not instrumented' },
      { key: 'secret_scan_findings', label: 'Secret-scanner findings', count: null, note: 'Not instrumented' },
      { key: 'unsafe_domain_attempts', label: 'Unsafe domain attempts', count: null, note: 'Not instrumented' },
    ];
    return json({ requestId, code: 'OK', items, checkedAt: new Date().toISOString() }, 200, cors);
  }

  if (action === 'builds.list') {
    const g = gate('dashboard.read'); if (g) return g;
    const limit = Math.min(Number(body.limit) || 100, 200);
    const statusFilter = typeof body.status === 'string' && body.status ? body.status : null;

    const [running, queued, failed, succeeded] = await Promise.all([
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'running'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'queued'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).in('status', ['success', 'completed']); return c ?? 0; })(),
    ]);

    let q = admin.from('builds')
      .select('id, project_id, status, build_number, version, environment, started_at, completed_at, duration, warning_count, error_count, failure_code, requested_by')
      .order('started_at', { ascending: false })
      .limit(limit);
    if (statusFilter === 'failed') q = q.eq('status', 'failed');
    else if (statusFilter === 'running') q = q.in('status', ['running', 'queued']);
    else if (statusFilter === 'success') q = q.in('status', ['success', 'completed']);

    const { data: builds } = await q;
    const buildRows = builds ?? [];
    const projectIds = [...new Set(buildRows.map((b) => b.project_id as string).filter(Boolean))];
    const requestedByIds = [...new Set(buildRows.map((b) => b.requested_by as string).filter(Boolean))];

    const { data: projects } = projectIds.length ? await admin.from('projects').select('id, name, workspace_id').in('id', projectIds) : { data: [] };
    const projectMap: Record<string, { name: string | null; workspaceId: string | null }> = {};
    for (const p of (projects ?? [])) projectMap[p.id as string] = { name: (p.name as string) ?? null, workspaceId: (p.workspace_id as string) ?? null };
    const wsIds = [...new Set(Object.values(projectMap).map((x) => x.workspaceId).filter(Boolean))];
    const { data: workspaces } = wsIds.length ? await admin.from('workspaces').select('id, owner_id').in('id', wsIds as string[]) : { data: [] };
    const wsOwner: Record<string, string> = {};
    for (const w of (workspaces ?? [])) wsOwner[w.id as string] = w.owner_id as string;

    const ownerIds = [...new Set([...Object.values(wsOwner), ...requestedByIds])];
    const { data: profiles } = ownerIds.length ? await admin.from('profiles').select('id, email').in('id', ownerIds as string[]) : { data: [] };
    const emailMap: Record<string, string> = {};
    for (const pr of (profiles ?? [])) emailMap[pr.id as string] = (pr.email as string) ?? '';

    const rows = buildRows.map((b) => {
      const proj = projectMap[b.project_id as string];
      const ownerId = proj ? wsOwner[proj.workspaceId as string] : undefined;
      return {
        id: b.id, projectId: b.project_id, projectName: proj?.name ?? null,
        ownerEmail: ownerId ? emailMap[ownerId] ?? null : null,
        status: b.status, buildNumber: b.build_number, version: b.version,
        environment: b.environment, startedAt: b.started_at, completedAt: b.completed_at,
        duration: b.duration, warningCount: b.warning_count, errorCount: b.error_count,
        failureCode: b.failure_code, requestedBy: b.requested_by ? emailMap[b.requested_by as string] ?? null : null,
      };
    });

    return json({ requestId, code: 'OK', builds: rows, summary: { running, queued, failed, succeeded } }, 200, cors);
  }

  if (action === 'builds.get') {
    const g = gate('dashboard.read'); if (g) return g;
    const buildId = typeof body.buildId === 'string' ? body.buildId : '';
    if (!buildId) return error(requestId, 'INVALID_INPUT', 'buildId is required', 400);
    const { data: b } = await admin.from('builds').select('*').eq('id', buildId).maybeSingle();
    if (!b) return error(requestId, 'NOT_FOUND', 'Build not found', 404);

    const { data: p } = await admin.from('projects').select('name, workspace_id').eq('id', b.project_id).maybeSingle();
    let ownerEmail: string | null = null;
    if (p?.workspace_id) {
      const { data: ws } = await admin.from('workspaces').select('owner_id').eq('id', p.workspace_id).maybeSingle();
      if (ws?.owner_id) {
        const { data: own } = await admin.from('profiles').select('email').eq('id', ws.owner_id).maybeSingle();
        ownerEmail = own?.email ?? null;
      }
    }

    return json({ requestId, code: 'OK', build: {
      id: b.id, projectId: b.project_id, projectName: p?.name ?? null, ownerEmail,
      status: b.status, buildNumber: b.build_number, version: b.version, environment: b.environment,
      startedAt: b.started_at, completedAt: b.completed_at, duration: b.duration,
      warningCount: b.warning_count, errorCount: b.error_count,
      failureCode: b.failure_code, failureMessage: b.failure_message, cancelledAt: b.cancelled_at,
      logAvailable: false, logNote: 'Raw build logs are not retained server-side; only the curated failure message is surfaced.',
    } }, 200, cors);
  }

  if (action === 'users.list') {
    const g = gate('users.manage'); if (g) return g;
    const q = typeof body.query === 'string' ? body.query.trim() : '';
    const limit = Math.min(Number(body.limit) || 50, 200);
    let query = admin.from('profiles').select('id, email, display_name, created_at').order('created_at', { ascending: false }).limit(limit);
    if (q) query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
    const { data: users } = await query;
    const rows = [];
    for (const u of (users ?? [])) {
      const { data: ws } = await admin.from('workspaces').select('id').eq('owner_id', u.id);
      const wsIds = (ws ?? []).map((w: { id: string }) => w.id);
      const projectCount = wsIds.length
        ? ((await admin.from('projects').select('*', { count: 'exact', head: true }).in('workspace_id', wsIds)).count ?? 0)
        : 0;
      const { data: sub } = await admin.from('subscriptions').select('plan_key, status').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const { data: adm } = await admin.from('platform_admins').select('role, active').eq('user_id', u.id).maybeSingle();
      rows.push({ id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at, projectCount, plan: sub?.plan_key ?? null, subscriptionStatus: sub?.status ?? null, adminRole: adm?.role ?? null, adminActive: adm?.active ?? false });
    }
    return json({ requestId, code: 'OK', users: rows }, 200, cors);
  }

  if (action === 'users.suspend') {
    const g = gate('users.suspend'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!targetId || !reason) return error(requestId, 'INVALID_INPUT', 'userId and reason are required', 400);
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: '8760h' });
    if (banError) return error(requestId, 'SUSPEND_FAILED', 'Could not suspend account', 500);
    await audit(admin, ctx, 'user.suspended', 'user', targetId, reason, null);
    return json({ requestId, code: 'OK', message: 'Account suspended.' }, 200, cors);
  }

  if (action === 'users.restore') {
    const g = gate('users.suspend'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    const reason = typeof body.reason === 'string' ? body.reason : 'Restored';
    if (!targetId) return error(requestId, 'INVALID_INPUT', 'userId is required', 400);
    const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' });
    if (banError) return error(requestId, 'RESTORE_FAILED', 'Could not restore account', 500);
    await audit(admin, ctx, 'user.restored', 'user', targetId, reason, null);
    return json({ requestId, code: 'OK', message: 'Account restored.' }, 200, cors);
  }

  if (action === 'users.revoke_sessions') {
    const g = gate('users.manage'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    if (!targetId) return error(requestId, 'INVALID_INPUT', 'userId is required', 400);
    const { error: sErr } = await admin.auth.admin.signOut(targetId, 'all');
    if (sErr) return error(requestId, 'REVOKE_FAILED', 'Could not revoke sessions', 500);
    await audit(admin, ctx, 'user.sessions_revoked', 'user', targetId, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: 'Sessions revoked.' }, 200, cors);
  }

  if (action === 'users.reset_password') {
    const g = gate('users.manage'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    if (!targetId) return error(requestId, 'INVALID_INPUT', 'userId is required', 400);
    const { data: profile } = await admin.from('profiles').select('email').eq('id', targetId).maybeSingle();
    if (!profile?.email) return error(requestId, 'NO_EMAIL', 'User has no email on record', 400);
    const { error: linkErr } = await admin.auth.admin.generateLink({ type: 'recovery', email: profile.email });
    if (linkErr) return error(requestId, 'RESET_FAILED', 'Password reset requires a configured email provider', 501);
    await audit(admin, ctx, 'user.password_reset_requested', 'user', targetId, null, null);
    return json({ requestId, code: 'OK', message: 'Password reset email sent.' }, 200, cors);
  }

  if (action === 'users.note') {
    const g = gate('users.manage'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    const note = typeof body.note === 'string' ? body.note : '';
    if (!targetId || !note) return error(requestId, 'INVALID_INPUT', 'userId and note are required', 400);
    await audit(admin, ctx, 'user.support_note', 'user', targetId, note, null);
    return json({ requestId, code: 'OK', message: 'Support note added.' }, 200, cors);
  }

  /* ── Customers ── */

  if (action === 'customers.list') {
    const g = gate('users.manage'); if (g) return g;
    const q = typeof body.query === 'string' ? body.query.trim() : '';
    const planFilter = typeof body.plan === 'string' && body.plan ? body.plan : null;
    const statusFilter = typeof body.status === 'string' && body.status ? body.status : null;
    const page = Math.max(Number(body.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 25, 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [totalAccounts, activePaid, trialing, pastDue, newThisMonth] = await Promise.all([
      count('profiles'),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'past_due'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo); return c ?? 0; })(),
    ]);

    let profileQuery = admin.from('profiles').select('id, email, display_name, created_at', { count: 'exact' }).order('created_at', { ascending: false });
    if (q) profileQuery = profileQuery.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
    if (planFilter || statusFilter) {
      let sq = admin.from('subscriptions').select('user_id');
      if (planFilter) sq = sq.eq('plan_key', planFilter);
      if (statusFilter) sq = sq.eq('status', statusFilter);
      const { data: subUsers } = await sq;
      const ids = (subUsers ?? []).map((s: { user_id: string }) => s.user_id);
      if (ids.length === 0) {
        return json({ requestId, code: 'OK', customers: [], total: 0, page, pageSize, summary: { totalAccounts, activePaid, trialing, pastDue, newThisMonth } }, 200, cors);
      }
      profileQuery = profileQuery.in('id', ids);
    }

    const { data: profiles, count: total } = await profileQuery.range(from, to);
    const userIds = (profiles ?? []).map((p: { id: string }) => p.id);

    const [workspaces, subs, admins] = await Promise.all([
      userIds.length ? admin.from('workspaces').select('id, owner_id').in('owner_id', userIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      userIds.length ? admin.from('subscriptions').select('user_id, plan_key, status, billing_interval').in('user_id', userIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      userIds.length ? admin.from('platform_admins').select('user_id, role, active').in('user_id', userIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const wsToOwner: Record<string, string> = {};
    const wsIds: string[] = [];
    for (const w of (workspaces.data ?? [])) { wsToOwner[w.id as string] = w.owner_id as string; wsIds.push(w.id as string); }

    const { data: projects } = wsIds.length ? await admin.from('projects').select('workspace_id, updated_at').in('workspace_id', wsIds) : { data: [] };
    const byOwner: Record<string, { count: number; lastActivity: string | null }> = {};
    for (const p of (projects ?? [])) {
      const owner = wsToOwner[p.workspace_id as string];
      if (!owner) continue;
      const e = byOwner[owner] ?? { count: 0, lastActivity: null as string | null };
      e.count += 1;
      const ua = p.updated_at as string | null;
      if (ua && (!e.lastActivity || ua > e.lastActivity)) e.lastActivity = ua;
      byOwner[owner] = e;
    }

    const subByUser: Record<string, Record<string, unknown>> = {};
    for (const s of (subs.data ?? [])) { if (!subByUser[s.user_id as string]) subByUser[s.user_id as string] = s; }
    const adminByUser: Record<string, Record<string, unknown>> = {};
    for (const a of (admins.data ?? [])) adminByUser[a.user_id as string] = a;

    const rows = (profiles ?? []).map((p) => {
      const s = subByUser[p.id as string];
      const a = adminByUser[p.id as string];
      const agg = byOwner[p.id as string];
      return {
        id: p.id, email: p.email, displayName: p.display_name, createdAt: p.created_at,
        plan: s?.plan_key ?? null, subscriptionStatus: s?.status ?? null, billingInterval: s?.billing_interval ?? null,
        projectCount: agg?.count ?? 0, lastActivity: agg?.lastActivity ?? null,
        adminRole: a?.role ?? null, adminActive: a?.active ?? false,
      };
    });

    return json({ requestId, code: 'OK', customers: rows, total: total ?? 0, page, pageSize, summary: { totalAccounts, activePaid, trialing, pastDue, newThisMonth } }, 200, cors);
  }

  if (action === 'customers.get') {
    const g = gate('users.manage'); if (g) return g;
    const targetId = typeof body.userId === 'string' ? body.userId : '';
    if (!targetId) return error(requestId, 'INVALID_INPUT', 'userId is required', 400);
    const { data: profile } = await admin.from('profiles').select('id, email, display_name, created_at').eq('id', targetId).maybeSingle();
    if (!profile) return error(requestId, 'NOT_FOUND', 'Customer not found', 404);

    const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();
    const [sub, workspaces, usageRows, notes] = await Promise.all([
      admin.from('subscriptions').select('plan_key, status, billing_interval, current_period_start, current_period_end, cancel_at_period_end, trial_end, stripe_customer_id').eq('user_id', targetId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('workspaces').select('id').eq('owner_id', targetId),
      admin.from('ai_usage_events').select('credits_used, estimated_cost_micros, input_tokens, output_tokens').eq('user_id', targetId).gte('created_at', periodStart),
      admin.from('admin_audit_events').select('reason, created_at').eq('target_type', 'user').eq('target_id', targetId).eq('action', 'user.support_note').order('created_at', { ascending: false }).limit(20),
    ]);

    const wsIds = (workspaces.data ?? []).map((w: { id: string }) => w.id);
    const { data: projects } = wsIds.length ? await admin.from('projects').select('id, name, slug, status, blueprint, created_at, updated_at').in('workspace_id', wsIds).order('updated_at', { ascending: false }) : { data: [] };
    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

    const [assets, builds] = await Promise.all([
      projectIds.length ? admin.from('assets').select('project_id, size').in('project_id', projectIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      projectIds.length ? admin.from('builds').select('id, project_id, status, completed_at').in('project_id', projectIds).order('completed_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const storageBytes = (assets.data ?? []).reduce((s: number, a) => s + Number(a.size || 0), 0);
    const aiRequests = (usageRows.data ?? []).length;
    const aiCredits = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.credits_used || 0), 0);
    const aiTokens = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.input_tokens || 0) + Number(u.output_tokens || 0), 0);
    const aiCostMicros = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.estimated_cost_micros || 0), 0);

    const customerProjects = (projects ?? []).map((p: Record<string, unknown>) => ({
      id: p.id, name: p.name, slug: p.slug, status: p.status,
      pageCount: Array.isArray((p.blueprint as { pages?: unknown[] } | undefined)?.pages) ? ((p.blueprint as { pages: unknown[] }).pages.length) : 0,
      createdAt: p.created_at, updatedAt: p.updated_at,
    }));

    return json({ requestId, code: 'OK', customer: {
      account: { id: profile.id, email: profile.email, displayName: profile.display_name, createdAt: profile.created_at },
      subscription: sub?.data ? { planKey: sub.data.plan_key, status: sub.data.status, billingInterval: sub.data.billing_interval, currentPeriodEnd: sub.data.current_period_end, cancelAtPeriodEnd: sub.data.cancel_at_period_end, trialEnd: sub.data.trial_end, stripeCustomerId: sub.data.stripe_customer_id } : null,
      projects: customerProjects,
      usage: { aiRequests, aiCredits, aiTokens, aiCostMicros, storageBytes, periodStart },
      supportNotes: (notes.data ?? []).map((n: Record<string, unknown>) => ({ reason: n.reason, createdAt: n.created_at })),
      recentBuilds: (builds.data ?? []).map((b: Record<string, unknown>) => ({ id: b.id, projectId: b.project_id, status: b.status, completedAt: b.completed_at })),
    } }, 200, cors);
  }

  /* ── Projects ── */

  if (action === 'projects.list') {
    const g = gate('projects.inspect'); if (g) return g;
    const q = typeof body.query === 'string' ? body.query.trim() : '';
    const statusFilter = typeof body.status === 'string' && body.status ? body.status : null;
    const planFilter = typeof body.plan === 'string' && body.plan ? body.plan : null;
    const buildState = typeof body.buildState === 'string' && body.buildState ? body.buildState : null;
    const page = Math.max(Number(body.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 25, 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [totalProjects, activeProjects, failedBuilds, recentProjects] = await Promise.all([
      count('projects'),
      (async () => { const { count: c } = await admin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('projects').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo); return c ?? 0; })(),
    ]);

    const emptyResult = () => json({ requestId, code: 'OK', projects: [], total: 0, page, pageSize, summary: { totalProjects, activeProjects, failedBuilds, recentProjects } }, 200, cors);

    let query = admin.from('projects').select('id, name, slug, status, workspace_id, blueprint, created_at, updated_at', { count: 'exact' }).order('created_at', { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
    if (statusFilter) query = query.eq('status', statusFilter);
    if (planFilter) {
      const { data: planUsers } = await admin.from('subscriptions').select('user_id').eq('plan_key', planFilter);
      const uids = (planUsers ?? []).map((s: { user_id: string }) => s.user_id);
      if (uids.length === 0) return emptyResult();
      const { data: planWs } = await admin.from('workspaces').select('id').in('owner_id', uids);
      const pws = (planWs ?? []).map((w: { id: string }) => w.id);
      if (pws.length === 0) return emptyResult();
      query = query.in('workspace_id', pws);
    }
    if (buildState) {
      const { data: bs } = await admin.from('builds').select('project_id').eq('status', buildState);
      const pids = [...new Set((bs ?? []).map((b: { project_id: string }) => b.project_id))];
      if (pids.length === 0) return emptyResult();
      query = query.in('id', pids);
    }

    const { data: projects, count: total } = await query.range(from, to);
    const projectRows = projects ?? [];
    const wsIds = [...new Set(projectRows.map((p) => p.workspace_id as string))];
    const pIds = projectRows.map((p) => p.id as string);

    const [wsRows, builds, assets] = await Promise.all([
      wsIds.length ? admin.from('workspaces').select('id, owner_id, name').in('id', wsIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      pIds.length ? admin.from('builds').select('project_id, status, completed_at').in('project_id', pIds).order('completed_at', { ascending: false }).limit(500) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      pIds.length ? admin.from('assets').select('project_id, size').in('project_id', pIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const wsMap: Record<string, { ownerId: string; name: string }> = {};
    for (const w of (wsRows.data ?? [])) wsMap[w.id as string] = { ownerId: w.owner_id as string, name: (w.name as string) ?? '' };
    const ownerIds = [...new Set(Object.values(wsMap).map((x) => x.ownerId))];

    const [ownerRows, ownerSubs] = await Promise.all([
      ownerIds.length ? admin.from('profiles').select('id, email, display_name').in('id', ownerIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      ownerIds.length ? admin.from('subscriptions').select('user_id, plan_key, status').in('user_id', ownerIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);
    const ownerMap: Record<string, Record<string, unknown>> = {};
    for (const o of (ownerRows.data ?? [])) ownerMap[o.id as string] = o;
    const ownerSubMap: Record<string, Record<string, unknown>> = {};
    for (const s of (ownerSubs.data ?? [])) { if (!ownerSubMap[s.user_id as string]) ownerSubMap[s.user_id as string] = s; }

    const latestBuildMap: Record<string, Record<string, unknown>> = {};
    for (const b of (builds.data ?? [])) { if (!latestBuildMap[b.project_id as string]) latestBuildMap[b.project_id as string] = b; }
    const storageMap: Record<string, number> = {};
    for (const a of (assets.data ?? [])) storageMap[a.project_id as string] = (storageMap[a.project_id as string] ?? 0) + Number(a.size || 0);

    const rows = projectRows.map((p) => {
      const ws = wsMap[p.workspace_id as string];
      const owner = ws ? ownerMap[ws.ownerId] : undefined;
      const osub = ws ? ownerSubMap[ws.ownerId] : undefined;
      const lb = latestBuildMap[p.id as string];
      return {
        id: p.id, name: p.name, slug: p.slug, status: p.status,
        ownerEmail: owner?.email ?? null, ownerName: owner?.display_name ?? null,
        workspaceName: ws?.name ?? null,
        pageCount: Array.isArray((p.blueprint as { pages?: unknown[] } | undefined)?.pages) ? ((p.blueprint as { pages: unknown[] }).pages.length) : 0,
        createdAt: p.created_at, updatedAt: p.updated_at,
        latestBuildStatus: lb?.status ?? null,
        plan: osub?.plan_key ?? null, subscriptionStatus: osub?.status ?? null,
        storageBytes: storageMap[p.id as string] ?? 0,
      };
    });

    return json({ requestId, code: 'OK', projects: rows, total: total ?? 0, page, pageSize, summary: { totalProjects, activeProjects, failedBuilds, recentProjects } }, 200, cors);
  }

  if (action === 'projects.get') {
    const g = gate('projects.inspect'); if (g) return g;
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!projectId) return error(requestId, 'INVALID_INPUT', 'projectId is required', 400);
    const { data: p } = await admin.from('projects').select('id, name, slug, status, workspace_id, blueprint, created_at, updated_at').eq('id', projectId).maybeSingle();
    if (!p) return error(requestId, 'NOT_FOUND', 'Project not found', 404);

    const [members, builds, deployments, domains, forms, aiJobs, assets, ws] = await Promise.all([
      admin.from('project_members').select('user_id, role, status').eq('project_id', projectId),
      admin.from('builds').select('id, status, version, created_at, completed_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
      admin.from('deployments').select('id, status, environment, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
      admin.from('domains').select('id, domain, status').eq('project_id', projectId),
      admin.from('forms').select('id, name, created_at').eq('project_id', projectId),
      admin.from('ai_jobs').select('id, task_type, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
      admin.from('assets').select('size').eq('project_id', projectId),
      admin.from('workspaces').select('owner_id, name').eq('id', p.workspace_id).maybeSingle(),
    ]);

    const memberUserIds = (members.data ?? []).map((m: { user_id: string }) => m.user_id);
    const { data: memberProfiles } = memberUserIds.length ? await admin.from('profiles').select('id, email, display_name').in('id', memberUserIds) : { data: [] };
    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const mp of (memberProfiles ?? [])) profileMap[mp.id as string] = mp;
    const ownerId = ws?.data?.owner_id as string | undefined;
    const { data: ownerProfile } = ownerId ? await admin.from('profiles').select('id, email, display_name').eq('id', ownerId).maybeSingle() : { data: null };
    const { data: ownerSub } = ownerId ? await admin.from('subscriptions').select('plan_key, status').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null };

    const storageBytes = (assets.data ?? []).reduce((s: number, a) => s + Number(a.size || 0), 0);
    const pageCount = Array.isArray((p.blueprint as { pages?: unknown[] } | undefined)?.pages) ? ((p.blueprint as { pages: unknown[] }).pages.length) : 0;
    const latestBuild = (builds.data ?? [])[0] ?? null;
    const recentIssues = [
      ...(builds.data ?? []).filter((b) => b.status === 'failed').slice(0, 5).map((b) => ({ kind: 'build', id: b.id, status: b.status, at: b.completed_at ?? b.created_at })),
      ...(deployments.data ?? []).filter((d) => d.status === 'failed').slice(0, 5).map((d) => ({ kind: 'deployment', id: d.id, status: d.status, at: d.created_at })),
    ];

    return json({ requestId, code: 'OK', project: {
      id: p.id, name: p.name, slug: p.slug, status: p.status, pageCount, createdAt: p.created_at, updatedAt: p.updated_at,
      workspaceName: ws?.data?.name ?? null,
      owner: { id: ownerId ?? null, email: ownerProfile?.email ?? null, displayName: ownerProfile?.display_name ?? null, plan: ownerSub?.plan_key ?? null, subscriptionStatus: ownerSub?.status ?? null },
      memberCount: (members.data ?? []).length,
      members: (members.data ?? []).map((m) => ({ userId: m.user_id, role: m.role, status: m.status, email: profileMap[m.user_id]?.email ?? null, displayName: profileMap[m.user_id]?.display_name ?? null })),
      buildCount: (builds.data ?? []).length,
      latestBuild: latestBuild ? { id: latestBuild.id, status: latestBuild.status, version: latestBuild.version, completedAt: latestBuild.completed_at } : null,
      deploymentCount: (deployments.data ?? []).length,
      domainCount: (domains.data ?? []).length,
      formCount: (forms.data ?? []).length,
      aiJobCount: (aiJobs.data ?? []).length,
      storageBytes,
      recentDeployments: (deployments.data ?? []).slice(0, 5),
      recentIssues,
    } }, 200, cors);
  }

  if (action === 'support.start') {
    const g = gate('support.mode'); if (g) return g;
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    const durationMinutes = Math.min(Math.max(Number(body.durationMinutes) || 30, 1), 480);
    if (!projectId || !reason) return error(requestId, 'INVALID_INPUT', 'projectId and reason are required', 400);
    const expiresAt = new Date(Date.now() + durationMinutes * 60000).toISOString();
    const { data } = await admin.from('support_access_sessions').insert({
      admin_user_id: ctx.userId, project_id: projectId, scope: typeof body.scope === 'string' ? body.scope : 'read-only',
      reason, status: 'active', expires_at: expiresAt,
    }).select('id').single();
    await audit(admin, ctx, 'support.mode_started', 'project', projectId, reason, { session_id: data?.id, expires_at: expiresAt });
    return json({ requestId, code: 'OK', session: { id: data?.id, expiresAt }, message: 'Support mode started (read-only).' }, 200, cors);
  }

  if (action === 'support.end') {
    const g = gate('support.mode'); if (g) return g;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) return error(requestId, 'INVALID_INPUT', 'sessionId is required', 400);
    await admin.from('support_access_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId).eq('admin_user_id', ctx.userId);
    await audit(admin, ctx, 'support.mode_ended', 'support_session', sessionId, null, null);
    return json({ requestId, code: 'OK', message: 'Support mode ended.' }, 200, cors);
  }

  /* ── Billing & Revenue ── */

  if (action === 'billing.summary') {
    const g = gate('billing.read'); if (g) return g;
    const { data: subs } = await admin.from('subscriptions').select('plan_key, status, billing_interval, cancel_at_period_end');
    let mrr = 0, activeSubscriptions = 0, trialing = 0, pastDue = 0, cancellations = 0;
    for (const s of (subs ?? [])) {
      const st = s.status;
      if (st === 'active') activeSubscriptions++;
      if (st === 'trialing') trialing++;
      if (st === 'past_due') pastDue++;
      if (s.cancel_at_period_end) cancellations++;
      if (st === 'active' || st === 'past_due') mrr += monthlyMrrFor(s.plan_key, s.billing_interval);
    }
    const { count: failedPayments } = await admin.from('billing_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed');
    return json({ requestId, code: 'OK', summary: {
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptions, trialing, pastDue, cancellations, failedPayments: failedPayments ?? 0,
      pricingSource: 'plan-pricing-mirror', calculatedAt: new Date().toISOString(),
    } }, 200, cors);
  }

  if (action === 'billing.list') {
    const g = gate('billing.read'); if (g) return g;
    const statusFilter = typeof body.status === 'string' && body.status ? body.status : null;
    let q = admin.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data: subs } = await q;
    const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
    const { data: profiles } = userIds.length ? await admin.from('profiles').select('id, email, display_name').in('id', userIds) : { data: [] };
    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of (profiles ?? [])) profileMap[p.id as string] = p;
    const rows = (subs ?? []).map((s) => ({
      id: s.id, userId: s.user_id, planKey: s.plan_key, status: s.status,
      billingInterval: s.billing_interval, currentPeriodStart: s.current_period_start,
      currentPeriodEnd: s.current_period_end, cancelAtPeriodEnd: s.cancel_at_period_end,
      trialEnd: s.trial_end, stripeSubscriptionId: s.stripe_subscription_id, stripeCustomerId: s.stripe_customer_id,
      createdAt: s.created_at, updatedAt: s.updated_at,
      customerEmail: profileMap[s.user_id]?.email ?? null, customerName: profileMap[s.user_id]?.display_name ?? null,
      amount: intervalAmount(s.plan_key, s.billing_interval),
      monthlyAmount: monthlyMrrFor(s.plan_key, s.billing_interval),
    }));
    return json({ requestId, code: 'OK', subscriptions: rows }, 200, cors);
  }

  if (action === 'billing.payment_problems') {
    const g = gate('billing.read'); if (g) return g;
    const [pastDueSubs, failedEvents] = await Promise.all([
      admin.from('subscriptions').select('id, user_id, plan_key, status, billing_interval, current_period_end, updated_at').eq('status', 'past_due').order('updated_at', { ascending: false }).limit(50),
      admin.from('billing_events').select('id, event_type, received_at, safe_error').eq('processing_status', 'failed').order('received_at', { ascending: false }).limit(50),
    ]);
    const userIds = [...new Set((pastDueSubs.data ?? []).map((s) => s.user_id as string))];
    const { data: profiles } = userIds.length ? await admin.from('profiles').select('id, email, display_name').in('id', userIds) : { data: [] };
    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of (profiles ?? [])) profileMap[p.id as string] = p;
    const subscriptions = (pastDueSubs.data ?? []).map((s) => ({
      kind: 'past_due_subscription', id: s.id, userId: s.user_id,
      customerEmail: profileMap[s.user_id]?.email ?? null, customerName: profileMap[s.user_id]?.display_name ?? null,
      planKey: s.plan_key, amount: intervalAmount(s.plan_key, s.billing_interval), status: s.status,
      at: s.updated_at, detail: 'Subscription is past due and requires payment attention.',
    }));
    const events = (failedEvents.data ?? []).map((e) => ({
      kind: 'failed_webhook_event', id: e.id, eventType: e.event_type,
      at: e.received_at, detail: (e.safe_error ?? 'Webhook event failed to process.').slice(0, 300),
    }));
    return json({ requestId, code: 'OK', items: [...subscriptions, ...events] }, 200, cors);
  }

  if (action === 'billing.events') {
    const g = gate('billing.read'); if (g) return g;
    const { data: events } = await admin.from('billing_events').select('*').order('received_at', { ascending: false }).limit(100);
    return json({ requestId, code: 'OK', events: events ?? [] }, 200, cors);
  }

  if (action === 'billing.replay') {
    const g = gate('billing.operate'); if (g) return g;
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    if (!eventId) return error(requestId, 'INVALID_INPUT', 'eventId is required', 400);
    if (!Deno.env.get('STRIPE_RESTRICTED_KEY')) return error(requestId, 'NOT_CONFIGURED', 'Stripe is not configured', 501);
    await admin.from('billing_events').update({ processing_status: 'pending', attempt_count: 0 }).eq('id', eventId).eq('processing_status', 'failed');
    await audit(admin, ctx, 'billing.event_replayed', 'billing_event', eventId, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: 'Event queued for replay.' }, 200, cors);
  }

  if (action === 'billing.refresh') {
    const g = gate('billing.operate'); if (g) return g;
    if (!Deno.env.get('STRIPE_RESTRICTED_KEY')) return error(requestId, 'NOT_CONFIGURED', 'Stripe is not configured', 501);
    await audit(admin, ctx, 'billing.refresh_requested', 'subscription', typeof body.userId === 'string' ? body.userId : null, null, null);
    return json({ requestId, code: 'OK', message: 'Subscription refresh queued.' }, 200, cors);
  }

  if (action === 'billing.grant_credits') {
    const g = gate('billing.operate'); if (g) return g;
    const targetUserId = typeof body.userId === 'string' ? body.userId : '';
    const credits = Number(body.credits) || 0;
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!targetUserId || credits <= 0 || !reason) return error(requestId, 'INVALID_INPUT', 'userId, positive credits and reason required', 400);
    await admin.from('usage_ledger').insert({
      user_id: targetUserId, usage_type: 'ai_credit_grant', quantity: credits, status: 'settled',
      idempotency_key: `grant-${crypto.randomUUID()}`, safe_metadata: { reason, granted_by: ctx.userId }, settled_at: new Date().toISOString(),
    });
    await audit(admin, ctx, 'billing.credits_granted', 'user', targetUserId, reason, { credits });
    return json({ requestId, code: 'OK', message: 'Promotional credits granted.' }, 200, cors);
  }

  /* ── Usage ── */

  if (action === 'usage.summary') {
    const g = gate('billing.read'); if (g) return g;
    const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();
    const [usageRows, buildsPeriod, exportsPeriod, assetsRows, workflowRunsPeriod, aiJobsPeriod] = await Promise.all([
      admin.from('ai_usage_events').select('input_tokens, output_tokens, credits_used, estimated_cost_micros').gte('created_at', periodStart),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).gte('started_at', periodStart); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('exports').select('*', { count: 'exact', head: true }).gte('created_at', periodStart); return c ?? 0; })(),
      admin.from('assets').select('size'),
      (async () => { const { count: c } = await admin.from('workflow_runs').select('*', { count: 'exact', head: true }).gte('created_at', periodStart); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('ai_jobs').select('*', { count: 'exact', head: true }).gte('created_at', periodStart); return c ?? 0; })(),
    ]);
    const aiRequests = (usageRows.data ?? []).length;
    const aiTokens = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.input_tokens || 0) + Number(u.output_tokens || 0), 0);
    const aiCredits = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.credits_used || 0), 0);
    const aiCostMicros = (usageRows.data ?? []).reduce((s: number, u) => s + Number(u.estimated_cost_micros || 0), 0);
    const storageBytes = (assetsRows.data ?? []).reduce((s: number, a) => s + Number(a.size || 0), 0);
    const hasCostData = (usageRows.data ?? []).some((u) => Number(u.estimated_cost_micros) > 0);
    return json({ requestId, code: 'OK', summary: {
      aiRequests, aiTokens, aiCredits, aiCostMicros, hasCostData,
      builds: buildsPeriod, exports: exportsPeriod, storageBytes, workflowRuns: workflowRunsPeriod, aiJobs: aiJobsPeriod,
      periodStart, periodDays: 30,
    } }, 200, cors);
  }

  if (action === 'usage.customers') {
    const g = gate('billing.read'); if (g) return g;
    const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();
    const page = Math.max(Number(body.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 25, 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [planEnts, profiles, workspaces] = await Promise.all([
      admin.from('plan_entitlements').select('plan_key, entitlement_key, limit_value').eq('active', true),
      admin.from('profiles').select('id, email, display_name', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
      admin.from('workspaces').select('id, owner_id'),
    ]);

    const allowanceMap: Record<string, { aiCredits: number | null; storageMb: number | null }> = {};
    for (const e of (planEnts.data ?? [])) {
      const key = e.plan_key as string;
      const ent = allowanceMap[key] ?? { aiCredits: null as number | null, storageMb: null as number | null };
      if (e.entitlement_key === 'monthly_ai_credits') ent.aiCredits = Number(e.limit_value);
      if (e.entitlement_key === 'asset_storage_mb') ent.storageMb = Number(e.limit_value);
      allowanceMap[key] = ent;
    }

    const wsToOwner: Record<string, string> = {};
    const wsByOwner: Record<string, string[]> = {};
    for (const w of (workspaces.data ?? [])) {
      wsToOwner[w.id as string] = w.owner_id as string;
      (wsByOwner[w.owner_id as string] ??= []).push(w.id as string);
    }

    const pageUserIds = (profiles.data ?? []).map((p) => p.id as string);
    const pageWsIds = pageUserIds.flatMap((uid) => wsByOwner[uid] ?? []);

    const [projects, usageRows, subs] = await Promise.all([
      pageWsIds.length ? admin.from('projects').select('id, workspace_id').in('workspace_id', pageWsIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      pageUserIds.length ? admin.from('ai_usage_events').select('user_id, credits_used').gte('created_at', periodStart).in('user_id', pageUserIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      pageUserIds.length ? admin.from('subscriptions').select('user_id, plan_key, status').in('user_id', pageUserIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const projectOwner: Record<string, string> = {};
    const projectCountByOwner: Record<string, number> = {};
    const projectIds: string[] = [];
    for (const p of (projects.data ?? [])) {
      const owner = wsToOwner[p.workspace_id as string];
      if (owner) { projectOwner[p.id as string] = owner; projectCountByOwner[owner] = (projectCountByOwner[owner] ?? 0) + 1; projectIds.push(p.id as string); }
    }

    const [assets, builds] = await Promise.all([
      projectIds.length ? admin.from('assets').select('project_id, size').in('project_id', projectIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      projectIds.length ? admin.from('builds').select('project_id').in('project_id', projectIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const storageByOwner: Record<string, number> = {};
    for (const a of (assets.data ?? [])) {
      const owner = projectOwner[a.project_id as string];
      if (owner) storageByOwner[owner] = (storageByOwner[owner] ?? 0) + Number(a.size || 0);
    }
    const buildCountByOwner: Record<string, number> = {};
    for (const b of (builds.data ?? [])) {
      const owner = projectOwner[b.project_id as string];
      if (owner) buildCountByOwner[owner] = (buildCountByOwner[owner] ?? 0) + 1;
    }
    const creditsByUser: Record<string, number> = {};
    for (const u of (usageRows.data ?? [])) creditsByUser[u.user_id as string] = (creditsByUser[u.user_id as string] ?? 0) + Number(u.credits_used || 0);
    const subByUser: Record<string, Record<string, unknown>> = {};
    for (const s of (subs.data ?? [])) { if (!subByUser[s.user_id as string]) subByUser[s.user_id as string] = s; }

    const rows = (profiles.data ?? []).map((p) => {
      const uid = p.id as string;
      const planKey = (subByUser[uid]?.plan_key as string) ?? 'free';
      const allowance = allowanceMap[planKey] ?? allowanceMap['free'] ?? { aiCredits: null, storageMb: null };
      return {
        userId: uid, email: p.email, displayName: p.display_name,
        plan: planKey, subscriptionStatus: subByUser[uid]?.status ?? null,
        aiCredits: creditsByUser[uid] ?? 0, aiCreditLimit: allowance.aiCredits,
        builds: buildCountByOwner[uid] ?? 0,
        storageBytes: storageByOwner[uid] ?? 0, storageLimitMb: allowance.storageMb,
        projects: projectCountByOwner[uid] ?? 0,
      };
    });

    return json({ requestId, code: 'OK', customers: rows, total: profiles.count ?? 0, page, pageSize, plans: Object.keys(PLAN_PRICE_MONTHLY) }, 200, cors);
  }

  if (action === 'ai.overview') {
    const g = gate('ai.operate'); if (g) return g;
    const periodStart = new Date(Date.now() - 30 * 86400000).toISOString();

    const [providers, models, flags, usageRows, recentFailures, aiJobsFailed] = await Promise.all([
      admin.from('ai_providers').select('*').order('created_at', { ascending: true }),
      admin.from('ai_models').select('*').order('routing_priority', { ascending: true }),
      admin.from('feature_flags').select('flag_key, enabled').in('flag_key', ['ai_paused', 'local_only']),
      admin.from('ai_usage_events').select('provider, model, status, input_tokens, output_tokens, credits_used, estimated_cost_micros, duration_ms, error_code').gte('created_at', periodStart),
      admin.from('ai_usage_events').select('provider, model, task_class, status, error_code, created_at').or('status.eq.failed,error_code.not.is.null').order('created_at', { ascending: false }).limit(20),
      admin.from('ai_jobs').select('id, project_id, task_type, status, safe_error, created_at').eq('status', 'failed').order('created_at', { ascending: false }).limit(20),
    ]);
    const { count: queueDepth } = await admin.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'running']);

    const usage = usageRows.data ?? [];
    const byProvider: Record<string, { requests: number; failures: number; tokens: number; costMicros: number; durationMs: number }> = {};
    let totalTokens = 0; let totalCostMicros = 0; let hasCostData = false; let totalFailures = 0;
    for (const u of usage) {
      const key = (u.provider ?? 'unknown') as string;
      const e = byProvider[key] ?? { requests: 0, failures: 0, tokens: 0, costMicros: 0, durationMs: 0 };
      e.requests += 1;
      if (u.status === 'failed' || u.error_code) { e.failures += 1; totalFailures += 1; }
      e.tokens += Number(u.input_tokens || 0) + Number(u.output_tokens || 0);
      const cost = Number(u.estimated_cost_micros || 0);
      e.costMicros += cost;
      e.durationMs += Number(u.duration_ms || 0);
      byProvider[key] = e;
      totalTokens += Number(u.input_tokens || 0) + Number(u.output_tokens || 0);
      totalCostMicros += cost;
      if (cost > 0) hasCostData = true;
    }

    const failures = [
      ...(recentFailures.data ?? []).map((f: Record<string, unknown>) => ({ provider: f.provider ?? null, model: f.model ?? null, taskClass: f.task_class ?? null, errorCode: f.error_code ?? null, at: f.created_at ?? null, source: 'usage_event' })),
      ...(aiJobsFailed.data ?? []).map((j: Record<string, unknown>) => ({ provider: null, model: null, taskClass: j.task_type ?? null, errorCode: j.safe_error ? String(j.safe_error).slice(0, 200) : 'Job failed', at: j.created_at ?? null, source: 'job' })),
    ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 20);

    return json({ requestId, code: 'OK', providers: providers.data ?? [], models: models.data ?? [], queueDepth: queueDepth ?? 0, flags: flags.data ?? [], usage: { byProvider, totalTokens, totalCostMicros, hasCostData, totalFailures, totalRequests: usage.length, periodDays: 30 }, failures }, 200, cors);
  }

  if (action === 'ai.set_model') {
    const g = gate('ai.operate'); if (g) return g;
    const modelId = typeof body.modelId === 'string' ? body.modelId : '';
    const enabled = Boolean(body.enabled);
    if (!modelId) return error(requestId, 'INVALID_INPUT', 'modelId is required', 400);
    await admin.from('ai_models').update({ enabled, updated_at: new Date().toISOString() }).eq('id', modelId);
    await audit(admin, ctx, enabled ? 'ai.model_enabled' : 'ai.model_disabled', 'ai_model', modelId, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: enabled ? 'Model enabled.' : 'Model disabled.' }, 200, cors);
  }

  if (action === 'ai.set_provider') {
    const g = gate('ai.operate'); if (g) return g;
    const providerId = typeof body.providerId === 'string' ? body.providerId : '';
    const status = typeof body.status === 'string' ? body.status : 'disabled';
    if (!providerId) return error(requestId, 'INVALID_INPUT', 'providerId is required', 400);
    await admin.from('ai_providers').update({ status, updated_at: new Date().toISOString() }).eq('id', providerId);
    await audit(admin, ctx, `ai.provider_${status}`, 'ai_provider', providerId, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: `Provider ${status}.` }, 200, cors);
  }

  if (action === 'ai.set_routing') {
    const g = gate('ai.operate'); if (g) return g;
    const modelId = typeof body.modelId === 'string' ? body.modelId : '';
    const priority = Number(body.priority);
    if (!modelId || Number.isNaN(priority)) return error(requestId, 'INVALID_INPUT', 'modelId and numeric priority required', 400);
    await admin.from('ai_models').update({ routing_priority: priority, updated_at: new Date().toISOString() }).eq('id', modelId);
    await audit(admin, ctx, 'ai.routing_changed', 'ai_model', modelId, null, { priority });
    return json({ requestId, code: 'OK', message: 'Routing priority updated.' }, 200, cors);
  }

  if (action === 'ai.toggle_flag') {
    const g = gate('ai.operate'); if (g) return g;
    const flagKey = typeof body.flagKey === 'string' ? body.flagKey : '';
    const enabled = Boolean(body.enabled);
    if (!['ai_paused', 'local_only'].includes(flagKey)) return error(requestId, 'INVALID_INPUT', 'Unknown AI flag', 400);
    await admin.from('feature_flags').upsert({
      flag_key: flagKey, enabled, created_by: ctx.userId, updated_by: ctx.userId,
      configuration: {}, updated_at: new Date().toISOString(),
    }, { onConflict: 'flag_key' });
    await audit(admin, ctx, enabled ? 'ai.flag_enabled' : 'ai.flag_disabled', 'feature_flag', flagKey, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: 'AI flag updated.' }, 200, cors);
  }

  if (action === 'deployments.list') {
    const g = gate('deployments.operate'); if (g) return g;
    const { data } = await admin.from('deployments').select('*').order('created_at', { ascending: false }).limit(200);
    const { data: flags } = await admin.from('feature_flags').select('flag_key, enabled').in('flag_key', ['deploy_paused', 'publish_disabled']);
    return json({ requestId, code: 'OK', deployments: data ?? [], flags: flags ?? [] }, 200, cors);
  }

  if (action === 'deployments.toggle_flag') {
    const g = gate('deployments.operate'); if (g) return g;
    const flagKey = typeof body.flagKey === 'string' ? body.flagKey : '';
    const enabled = Boolean(body.enabled);
    if (!['deploy_paused', 'publish_disabled'].includes(flagKey)) return error(requestId, 'INVALID_INPUT', 'Unknown deployment flag', 400);
    await admin.from('feature_flags').upsert({
      flag_key: flagKey, enabled, created_by: ctx.userId, updated_by: ctx.userId,
      configuration: {}, updated_at: new Date().toISOString(),
    }, { onConflict: 'flag_key' });
    await audit(admin, ctx, enabled ? 'deploy.flag_enabled' : 'deploy.flag_disabled', 'feature_flag', flagKey, typeof body.reason === 'string' ? body.reason : null, null);
    return json({ requestId, code: 'OK', message: 'Deployment flag updated.' }, 200, cors);
  }

  if (action === 'deployments.retry' || action === 'deployments.cancel' || action === 'deployments.rollback') {
    const g = gate('deployments.operate'); if (g) return g;
    const deploymentId = typeof body.deploymentId === 'string' ? body.deploymentId : '';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!deploymentId) return error(requestId, 'INVALID_INPUT', 'deploymentId is required', 400);
    if (action === 'deployments.rollback' && !reason) return error(requestId, 'INVALID_INPUT', 'Reason required for rollback', 400);
    const op = action.split('.')[1];
    const newStatus = op === 'retry' ? 'queued' : op === 'cancel' ? 'cancelled' : 'queued';
    await admin.from('deployments').update({ status: newStatus }).eq('id', deploymentId);
    await audit(admin, ctx, `deploy.${op}`, 'deployment', deploymentId, reason, null);
    return json({ requestId, code: 'OK', message: `Deployment ${op} initiated.` }, 200, cors);
  }

  if (action === 'forms.stats') {
    const g = gate('forms.read'); if (g) return g;
    const [totalSubmissions, deliveryFailures, spamCount, fileScanBacklog] = await Promise.all([
      count('form_submissions'),
      (async () => { const { count: c } = await admin.from('form_delivery_events').select('*', { count: 'exact', head: true }).in('status', ['failed', 'error']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('form_submissions').select('*', { count: 'exact', head: true }).eq('is_spam', true); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('form_files').select('*', { count: 'exact', head: true }).eq('scan_status', 'pending'); return c ?? 0; })(),
    ]);
    const spamRate = totalSubmissions > 0 ? (spamCount / totalSubmissions) : 0;
    return json({ requestId, code: 'OK', stats: { totalSubmissions, deliveryFailures, spamCount, spamRate, fileScanBacklog } }, 200, cors);
  }

  if (action === 'templates.queue') {
    const g = gate('templates.moderate'); if (g) return g;
    const { data } = await admin.from('templates').select('*').in('moderation_status', ['submitted', 'changes_requested', 'approved', 'suspended']).order('updated_at', { ascending: false }).limit(100);
    return json({ requestId, code: 'OK', templates: data ?? [] }, 200, cors);
  }

  if (action === 'templates.moderate') {
    const g = gate('templates.moderate'); if (g) return g;
    const templateId = typeof body.templateId === 'string' ? body.templateId : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!templateId || !['approved', 'changes_requested', 'rejected', 'suspended', 'retired'].includes(status)) return error(requestId, 'INVALID_INPUT', 'templateId and valid status required', 400);
    if ((status === 'rejected' || status === 'suspended') && !reason) return error(requestId, 'INVALID_INPUT', 'Reason required for rejection/suspension', 400);
    await admin.from('templates').update({ moderation_status: status, updated_at: new Date().toISOString() }).eq('id', templateId);
    await admin.from('template_reviews').insert({ template_id: templateId, reviewer_id: ctx.userId, status, findings: reason ? { reason } : {}, created_at: new Date().toISOString(), completed_at: new Date().toISOString() });
    await audit(admin, ctx, `template.${status}`, 'template', templateId, reason, null);
    return json({ requestId, code: 'OK', message: `Template ${status}.` }, 200, cors);
  }

  if (action === 'flags.list') {
    const g = gate('dashboard.read'); if (g) return g;
    const { data } = await admin.from('feature_flags').select('*').order('updated_at', { ascending: false }).limit(200);
    return json({ requestId, code: 'OK', flags: data ?? [] }, 200, cors);
  }

  if (action === 'flags.set') {
    const g = gate('flags.manage'); if (g) return g;
    const flagKey = typeof body.flagKey === 'string' ? body.flagKey.trim() : '';
    const enabled = Boolean(body.enabled);
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!flagKey) return error(requestId, 'INVALID_INPUT', 'flagKey is required', 400);
    const configuration = (typeof body.configuration === 'object' && body.configuration) ? body.configuration : {};
    await admin.from('feature_flags').upsert({
      flag_key: flagKey, enabled, configuration, created_by: ctx.userId, updated_by: ctx.userId, updated_at: new Date().toISOString(),
    }, { onConflict: 'flag_key' });
    await audit(admin, ctx, 'flag.set', 'feature_flag', flagKey, reason, { enabled, configuration });
    return json({ requestId, code: 'OK', message: 'Feature flag updated.' }, 200, cors);
  }

  if (action === 'maintenance.get') {
    const g = gate('dashboard.read'); if (g) return g;
    const { data } = await admin.from('feature_flags').select('flag_key, enabled, configuration').like('flag_key', 'maintenance.%');
    return json({ requestId, code: 'OK', modes: data ?? [] }, 200, cors);
  }

  if (action === 'maintenance.set') {
    const g = gate('maintenance.manage'); if (g) return g;
    const scope = typeof body.scope === 'string' ? body.scope : '';
    const enabled = Boolean(body.enabled);
    const reason = typeof body.reason === 'string' ? body.reason : '';
    const validScopes = ['platform', 'ai', 'publishing', 'billing', 'forms', 'templates'];
    if (!validScopes.includes(scope)) return error(requestId, 'INVALID_INPUT', 'Invalid maintenance scope', 400);
    const flagKey = `maintenance.${scope}`;
    await admin.from('feature_flags').upsert({
      flag_key: flagKey, enabled, created_by: ctx.userId, updated_by: ctx.userId,
      configuration: { reason, started_at: enabled ? new Date().toISOString() : null, responsible: ctx.userId },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'flag_key' });
    await audit(admin, ctx, enabled ? 'maintenance.on' : 'maintenance.off', 'maintenance', scope, reason, null);
    return json({ requestId, code: 'OK', message: `Maintenance ${enabled ? 'enabled' : 'disabled'} for ${scope}.` }, 200, cors);
  }

  if (action === 'incidents.list') {
    const g = gate('incidents.manage'); if (g) return g;
    const { data } = await admin.from('platform_incidents').select('*').order('created_at', { ascending: false }).limit(100);
    return json({ requestId, code: 'OK', incidents: data ?? [] }, 200, cors);
  }

  if (action === 'incidents.create') {
    const g = gate('incidents.manage'); if (g) return g;
    const severity = typeof body.severity === 'string' ? body.severity : '';
    const title = typeof body.title === 'string' ? body.title : '';
    if (!title || !['critical', 'major', 'minor'].includes(severity)) return error(requestId, 'INVALID_INPUT', 'title and valid severity required', 400);
    const affected = Array.isArray(body.affectedServices) ? body.affectedServices : [];
    const { data } = await admin.from('platform_incidents').insert({
      severity, title, affected_services: affected, status: 'investigating', incident_lead: ctx.userId, started_at: new Date().toISOString(),
    }).select('id').single();
    await admin.from('incident_events').insert({ incident_id: data.id, actor_id: ctx.userId, event_type: 'created', message: 'Incident created' });
    await audit(admin, ctx, 'incident.created', 'incident', data.id, null, { severity, affectedServices: affected });
    return json({ requestId, code: 'OK', incident: data, message: 'Incident created.' }, 200, cors);
  }

  if (action === 'incidents.update') {
    const g = gate('incidents.manage'); if (g) return g;
    const incidentId = typeof body.incidentId === 'string' ? body.incidentId : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const message = typeof body.message === 'string' ? body.message : '';
    if (!incidentId || !['investigating', 'identified', 'monitoring', 'resolved', 'closed'].includes(status)) return error(requestId, 'INVALID_INPUT', 'incidentId and valid status required', 400);
    const patch: Record<string, unknown> = { status };
    if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
    await admin.from('platform_incidents').update(patch).eq('id', incidentId);
    await admin.from('incident_events').insert({ incident_id: incidentId, actor_id: ctx.userId, event_type: `status_${status}`, message: message || `Status changed to ${status}` });
    await audit(admin, ctx, 'incident.updated', 'incident', incidentId, message, { status });
    return json({ requestId, code: 'OK', message: 'Incident updated.' }, 200, cors);
  }

  if (action === 'data.export' || action === 'data.delete') {
    const g = gate(action === 'data.export' ? 'data.export' : 'data.delete'); if (g) return g;
    const targetUserId = typeof body.userId === 'string' ? body.userId : '';
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!targetUserId || !reason) return error(requestId, 'INVALID_INPUT', 'userId and reason are required', 400);
    if (action === 'data.delete' && !body.confirm) return error(requestId, 'CONFIRM_REQUIRED', 'Deletion requires explicit confirmation', 400);
    const isDelete = action === 'data.delete';
    const { data: workspaces } = await admin.from('workspaces').select('id').eq('owner_id', targetUserId);
    const wsIds = (workspaces ?? []).map((w: { id: string }) => w.id);
    const { count: projectCount } = wsIds.length ? await admin.from('projects').select('*', { count: 'exact', head: true }).in('workspace_id', wsIds) : { count: 0 };
    const { data: subs } = await admin.from('subscriptions').select('id').eq('user_id', targetUserId);
    const affected = { projects: projectCount ?? 0, subscriptions: (subs ?? []).length };
    await audit(admin, ctx, isDelete ? 'data.delete_queued' : 'data.export_queued', 'user', targetUserId, reason, { affected });
    return json({ requestId, code: 'OK', message: isDelete ? 'Deletion request queued.' : 'Export request queued.', affected }, 200, cors);
  }

  if (action === 'release.gate') {
    const g = gate('dashboard.read'); if (g) return g;
    const { count: adminCount } = await admin.from('platform_admins').select('*', { count: 'exact', head: true });
    const { count: openCritical } = await admin.from('platform_incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['investigating', 'identified', 'monitoring']);
    const stripeConfigured = Boolean(Deno.env.get('STRIPE_RESTRICTED_KEY'));

    const checklist = [
      { key: 'build_passes', label: 'Build passes', status: 'unverified', critical: true },
      { key: 'typecheck_passes', label: 'Typecheck passes', status: 'unverified', critical: true },
      { key: 'lint_passes', label: 'Lint passes', status: 'unverified', critical: false },
      { key: 'tests_pass', label: 'Automated tests pass', status: 'unverified', critical: true },
      { key: 'rls_verified', label: 'RLS verified', status: 'unverified', critical: true },
      { key: 'cross_tenant_verified', label: 'Cross-tenant isolation verified', status: 'unverified', critical: true },
      { key: 'webhook_signatures', label: 'Webhook signatures verified', status: 'unverified', critical: true },
      { key: 'backups_configured', label: 'Backups configured', status: 'unverified', critical: true },
      { key: 'restore_drill', label: 'Restore drill completed', status: 'unverified', critical: true },
      { key: 'rollback_tested', label: 'Rollback tested', status: 'unverified', critical: true },
      { key: 'monitoring_active', label: 'Monitoring active', status: 'unverified', critical: false },
      { key: 'alerts_tested', label: 'Alert delivery tested', status: 'unverified', critical: false },
      { key: 'secrets_configured', label: 'Production secrets configured', status: stripeConfigured ? 'verified' : 'unverified', critical: true },
      { key: 'support_assigned', label: 'Support ownership assigned', status: adminCount > 0 ? 'verified' : 'unverified', critical: false },
      { key: 'critical_incidents_closed', label: 'Critical incidents closed', status: (openCritical ?? 0) === 0 ? 'verified' : 'unverified', critical: true },
    ];

    const criticalUnverified = checklist.filter((c) => c.critical && c.status === 'unverified').length;
    const result = criticalUnverified > 0 ? 'NO-GO' : 'CONDITIONAL GO';
    return json({ requestId, code: 'OK', result, checklist, criticalUnverified }, 200, cors);
  }

  if (action === 'admins.list') {
    const g = gate('admins.manage'); if (g) return g;
    const { data } = await admin.from('platform_admins').select('*').order('created_at', { ascending: true });
    const admins = data ?? [];
    const userIds = [...new Set([...admins.map((a) => a.user_id as string), ...admins.map((a) => a.granted_by as string).filter(Boolean)])];

    const [profiles, auditRows] = await Promise.all([
      userIds.length ? admin.from('profiles').select('id, email, display_name').in('id', userIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      admins.length ? admin.from('admin_audit_events').select('admin_user_id, created_at').in('admin_user_id', admins.map((a) => a.user_id as string)).order('created_at', { ascending: false }).limit(1000) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of (profiles.data ?? [])) profileMap[p.id as string] = p;
    const lastActivity: Record<string, string> = {};
    for (const e of (auditRows.data ?? [])) {
      const uid = e.admin_user_id as string;
      if (!lastActivity[uid]) lastActivity[uid] = e.created_at as string;
    }

    const ownerCount = admins.filter((a) => a.role === 'super_admin' && a.active).length;

    const rows = admins.map((a) => ({
      user_id: a.user_id, role: a.role, permissions: a.permissions, active: a.active, created_at: a.created_at,
      email: profileMap[a.user_id]?.email ?? null, displayName: profileMap[a.user_id]?.display_name ?? null,
      grantedByEmail: profileMap[a.granted_by]?.email ?? null, lastActivity: lastActivity[a.user_id] ?? null,
    }));

    return json({ requestId, code: 'OK', admins: rows, ownerCount }, 200, cors);
  }

  if (action === 'admins.set') {
    const g = gate('admins.manage'); if (g) return g;
    const targetUserId = typeof body.userId === 'string' ? body.userId : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const active = Boolean(body.active);
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!targetUserId || !ROLES.includes(role as AdminRole)) return error(requestId, 'INVALID_INPUT', 'userId and valid role required', 400);
    if (!reason) return error(requestId, 'INVALID_INPUT', 'Reason required for admin changes', 400);
    if (role === 'super_admin' && ctx.role !== 'super_admin') return error(requestId, 'FORBIDDEN', 'Only an Owner can grant Owner access', 403);

    const { data: target } = await admin.from('platform_admins').select('role, active').eq('user_id', targetUserId).maybeSingle();
    const { data: all } = await admin.from('platform_admins').select('user_id, role, active');
    const activeOwnerCount = (all ?? []).filter((a) => a.role === 'super_admin' && a.active).length;
    const wasOwner = target?.role === 'super_admin';
    const stillOwner = role === 'super_admin' && active;
    if (wasOwner && !stillOwner && activeOwnerCount <= 1) {
      return error(requestId, 'LAST_OWNER', 'Cannot remove, demote, or deactivate the last active Owner', 400);
    }

    await admin.from('platform_admins').upsert({
      user_id: targetUserId, role, active, permissions: [], granted_by: ctx.userId, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    await audit(admin, ctx, 'admin.role_changed', 'platform_admin', targetUserId, reason, { role, active });
    return json({ requestId, code: 'OK', message: 'Admin record updated.' }, 200, cors);
  }

  if (action === 'audit.list') {
    const g = gate('audit.read'); if (g) return g;
    const query = typeof body.query === 'string' ? body.query.trim().replace(/[%_'"]/g, '') : '';
    const actionFilter = typeof body.actionFilter === 'string' && body.actionFilter ? body.actionFilter : null;
    const dateFrom = typeof body.dateFrom === 'string' && body.dateFrom ? body.dateFrom : null;
    const dateTo = typeof body.dateTo === 'string' && body.dateTo ? body.dateTo : null;
    const page = Math.max(Number(body.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 50, 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = admin.from('admin_audit_events').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (actionFilter) q = q.eq('action', actionFilter);
    if (query) q = q.or(`action.ilike.%${query}%,target_type.ilike.%${query}%`);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo);

    const { data: events, count: total } = await q.range(from, to);
    const rows = events ?? [];
    const adminIds = [...new Set(rows.map((e) => e.admin_user_id as string).filter(Boolean))];

    const [admins, profiles] = await Promise.all([
      adminIds.length ? admin.from('platform_admins').select('user_id, role').in('user_id', adminIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      adminIds.length ? admin.from('profiles').select('id, email, display_name').in('id', adminIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);
    const adminMap: Record<string, string> = {};
    for (const a of (admins.data ?? [])) adminMap[a.user_id as string] = a.role as string;
    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of (profiles.data ?? [])) profileMap[p.id as string] = p;

    const enriched = rows.map((e) => ({
      id: e.id, adminUserId: e.admin_user_id,
      adminEmail: profileMap[e.admin_user_id]?.email ?? null,
      adminName: profileMap[e.admin_user_id]?.display_name ?? null,
      adminRole: adminMap[e.admin_user_id] ?? null,
      action: e.action, targetType: e.target_type, targetId: e.target_id,
      reason: e.reason, safeMetadata: e.safe_metadata, createdAt: e.created_at,
    }));

    const { data: allActions } = await admin.from('admin_audit_events').select('action').order('created_at', { ascending: false }).limit(2000);
    const actions = [...new Set((allActions ?? []).map((a) => a.action as string))].sort();

    return json({ requestId, code: 'OK', events: enriched, total: total ?? 0, page, pageSize, actions }, 200, cors);
  }

  /* ── Owner command-centre (read-only aggregates; nothing fabricated) ── */

  if (action === 'owner.snapshot') {
    const g = gate('dashboard.read'); if (g) return g;
    const dayAgo = new Date(Date.now() - 86400000).toISOString();

    const [customers, activeSubs, pastDueSubs, trialingSubs, scheduledCancel, projects, buildsToday, aiJobsQueued, ledger24h, ledgerTotal, failedBuildsTotal] = await Promise.all([
      count('profiles'),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing', 'past_due']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'past_due'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing'); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('cancel_at_period_end', true); return c ?? 0; })(),
      count('projects'),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).gte('started_at', dayAgo); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'running']); return c ?? 0; })(),
      (async () => { const { count: c } = await admin.from('usage_ledger').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo); return c ?? 0; })(),
      count('usage_ledger'),
      (async () => { const { count: c } = await admin.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'failed'); return c ?? 0; })(),
    ]);

    const business = {
      customers,
      activeSubscriptions: activeSubs,
      pastDueSubscriptions: pastDueSubs,
      trialingSubscriptions: trialingSubs,
      scheduledCancellations: scheduledCancel,
      activeProjects: projects,
      buildsToday,
      aiJobsQueued,
      failedBuilds: failedBuildsTotal,
      mrr: { status: 'unavailable', value: null, reason: 'No price mapping available — Stripe is not connected' },
    };
    const usage = { aiLedger24h: ledger24h, aiLedgerTotal: ledgerTotal };
    return json({ requestId, code: 'OK', business, usage, checkedAt: new Date().toISOString() }, 200, cors);
  }

  if (action === 'owner.activity') {
    const g = gate('dashboard.read'); if (g) return g;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const canSeeEmails = hasPerm(ctx, 'users.manage');

    const [newProfiles, newSubs, cancelledSubs, newProjects, recentBuilds, recentDeployments, recentIncidents] = await Promise.all([
      admin.from('profiles').select('id, email, display_name, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20),
      admin.from('subscriptions').select('id, user_id, plan_key, status, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20),
      admin.from('subscriptions').select('id, user_id, plan_key, status, updated_at').eq('cancel_at_period_end', true).order('updated_at', { ascending: false }).limit(20),
      admin.from('projects').select('id, name, slug, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20),
      admin.from('builds').select('id, project_id, status, completed_at').order('completed_at', { ascending: false }).limit(20),
      admin.from('deployments').select('id, status, environment, created_at').order('created_at', { ascending: false }).limit(20),
      admin.from('platform_incidents').select('id, title, severity, status, created_at').order('created_at', { ascending: false }).limit(20),
    ]);

    type FeedItem = { id: string; type: string; title: string; detail: string; at: string | null };

    const customers: FeedItem[] = [
      ...(newProfiles.data ?? []).map((p: Record<string, unknown>) => ({ id: p.id as string, type: 'account_created', title: 'New account', detail: canSeeEmails ? ((p.email ?? p.display_name ?? '—') as string) : 'New customer', at: p.created_at as string | null })),
      ...(newSubs.data ?? []).map((s: Record<string, unknown>) => ({ id: s.id as string, type: 'subscription_created', title: `New subscription (${s.status ?? '—'})`, detail: (s.plan_key ?? '—') as string, at: s.created_at as string | null })),
      ...(cancelledSubs.data ?? []).map((s: Record<string, unknown>) => ({ id: s.id as string, type: 'subscription_cancelled', title: 'Scheduled cancellation', detail: (s.plan_key ?? '—') as string, at: s.updated_at as string | null })),
      ...(newProjects.data ?? []).map((p: Record<string, unknown>) => ({ id: p.id as string, type: 'project_created', title: 'Project created', detail: (p.name ?? p.slug ?? '—') as string, at: p.created_at as string | null })),
    ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 30);

    const platform: FeedItem[] = [
      ...(recentBuilds.data ?? []).map((b: Record<string, unknown>) => ({ id: b.id as string, type: b.status === 'failed' ? 'build_failed' : 'build_completed', title: `Build ${b.status ?? '—'}`, detail: b.project_id ? String(b.project_id).slice(0, 8) : '—', at: b.completed_at as string | null })),
      ...(recentDeployments.data ?? []).map((d: Record<string, unknown>) => ({ id: d.id as string, type: d.status === 'failed' ? 'deployment_failed' : 'deployment', title: `Deployment ${d.status ?? '—'}`, detail: (d.environment ?? '—') as string, at: d.created_at as string | null })),
      ...(recentIncidents.data ?? []).map((i: Record<string, unknown>) => ({ id: i.id as string, type: 'incident_opened', title: `Incident (${i.severity ?? '—'})`, detail: (i.title ?? '—') as string, at: i.created_at as string | null })),
    ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 30);

    return json({ requestId, code: 'OK', customers, platform, checkedAt: new Date().toISOString() }, 200, cors);
  }

  if (action === 'support.list') {
    const g = gate('support.mode'); if (g) return g;
    const { data } = await admin.from('support_access_sessions')
      .select('id, admin_user_id, project_id, reason, status, scope, expires_at, created_at')
      .order('created_at', { ascending: false }).limit(50);
    return json({ requestId, code: 'OK', sessions: data ?? [] }, 200, cors);
  }

  return error(requestId, 'INVALID_ACTION', `Unknown action "${action}"`, 400);
});
