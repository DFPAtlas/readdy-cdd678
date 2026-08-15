import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Admin — platform administration backend.
   Source of truth for admin access is the platform_admins table
   (never user-editable metadata). Every mutation is audited.
   ────────────────────────────────────────────────────────────── */

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

  // Bootstrap: if no admins exist at all, the first server-flagged user
  // (profiles.role = 'forge_admin', set via Supabase Dashboard only) becomes
  // the initial Super Admin. One-time path, never user-editable.
  if (!data) {
    const { count } = await admin.from('platform_admins').select('*', { count: 'exact', head: true });
    if ((count ?? 0) === 0) {
      const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (profile?.role === 'forge_admin') {
        await admin.from('platform_admins').insert({
          user_id: userId, role: 'super_admin', permissions: ['*'], active: true, granted_by: userId,
        });
        return { userId, role: 'super_admin', permissions: ['*'] };
      }
    }
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

  /* ── whoami ── */
  if (action === 'whoami') {
    return json({ requestId, code: 'OK', admin: { role: ctx.role, permissions: ctx.permissions } }, 200, cors);
  }

  /* ── dashboard ── */
  if (action === 'dashboard') {
    const g = gate('dashboard.read'); if (g) return g;

    const [activeUsers, activeSubscriptions, projects, publishedSites, deploymentsToday, failedDeployments, aiJobs, queueDepth, templateQueue, openIncidents, formDeliveryFailures, storageBytes, webhookFailures, aiProviders] = await Promise.all([
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
      (async () => { const { data } = await admin.from('assets').select('size_bytes'); return (data ?? []).reduce((s: number, r: { size_bytes?: number }) => s + (r.size_bytes || 0), 0); })(),
      (async () => { const { count: c } = await admin.from('billing_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'failed'); return c ?? 0; })(),
      (async () => {
        const { data } = await admin.from('ai_providers').select('status');
        const list = data ?? [];
        return { total: list.length, healthy: list.filter((p: { status?: string }) => p.status === 'healthy').length, degraded: list.filter((p: { status?: string }) => p.status === 'degraded').length };
      })(),
    ]);

    const summary = {
      activeUsers, activeSubscriptions, projects, publishedSites, deploymentsToday, failedDeployments,
      aiJobs, aiProviderHealth: aiProviders, queueDepth, formDeliveryFailures, storageBytes,
      templateQueue, securityAlerts: webhookFailures, openIncidents,
    };
    await audit(admin, ctx, 'dashboard.viewed', null, null, null, null);
    return json({ requestId, code: 'OK', summary }, 200, cors);
  }

  /* ── health ── */
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

  /* ── security centre ── */
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

  /* ── users ── */
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

  /* ── projects ── */
  if (action === 'projects.list') {
    const g = gate('projects.inspect'); if (g) return g;
    const { data: projects } = await admin.from('projects').select('id, name, slug, status, workspace_id, blueprint, created_at').order('created_at', { ascending: false }).limit(200);
    const rows = [];
    for (const p of (projects ?? [])) {
      const { data: ws } = await admin.from('workspaces').select('owner_id, name').eq('id', p.workspace_id).maybeSingle();
      const { data: owner } = ws?.owner_id ? await admin.from('profiles').select('email').eq('id', ws.owner_id).maybeSingle() : { data: null };
      const pageCount = Array.isArray(p.blueprint?.pages) ? p.blueprint.pages.length : 0;
      rows.push({ id: p.id, name: p.name, slug: p.slug, status: p.status, ownerEmail: owner?.email ?? null, workspaceName: ws?.name ?? null, pageCount, createdAt: p.created_at });
    }
    return json({ requestId, code: 'OK', projects: rows }, 200, cors);
  }

  if (action === 'projects.get') {
    const g = gate('projects.inspect'); if (g) return g;
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!projectId) return error(requestId, 'INVALID_INPUT', 'projectId is required', 400);
    const { data: p } = await admin.from('projects').select('id, name, slug, status, workspace_id, blueprint, created_at').eq('id', projectId).maybeSingle();
    if (!p) return error(requestId, 'NOT_FOUND', 'Project not found', 404);
    const [members, builds, deployments, domains, forms, aiJobs] = await Promise.all([
      admin.from('project_members').select('user_id, role, status').eq('project_id', projectId),
      admin.from('builds').select('id, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
      admin.from('deployments').select('id, status, environment, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
      admin.from('domains').select('id, domain, status').eq('project_id', projectId),
      admin.from('forms').select('id, name, created_at').eq('project_id', projectId),
      admin.from('ai_jobs').select('id, task_type, status, created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(20),
    ]);
    const pageCount = Array.isArray(p.blueprint?.pages) ? p.blueprint.pages.length : 0;
    const meta = {
      id: p.id, name: p.name, slug: p.slug, status: p.status, pageCount,
      memberCount: (members.data ?? []).length,
      buildCount: (builds.data ?? []).length,
      deploymentCount: (deployments.data ?? []).length,
      domainCount: (domains.data ?? []).length,
      formCount: (forms.data ?? []).length,
      aiJobCount: (aiJobs.data ?? []).length,
      recentDeployments: (deployments.data ?? []).slice(0, 5),
    };
    return json({ requestId, code: 'OK', project: meta }, 200, cors);
  }

  /* ── support mode ── */
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

  /* ── billing ── */
  if (action === 'billing.list') {
    const g = gate('billing.read'); if (g) return g;
    const { data: subs } = await admin.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
    return json({ requestId, code: 'OK', subscriptions: subs ?? [] }, 200, cors);
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

  /* ── AI operations ── */
  if (action === 'ai.overview') {
    const g = gate('ai.operate'); if (g) return g;
    const [providers, models, flags] = await Promise.all([
      admin.from('ai_providers').select('*').order('created_at', { ascending: true }),
      admin.from('ai_models').select('*').order('routing_priority', { ascending: true }),
      admin.from('feature_flags').select('flag_key, enabled').in('flag_key', ['ai_paused', 'local_only']),
    ]);
    const { count: queueDepth } = await admin.from('ai_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'running']);
    return json({ requestId, code: 'OK', providers: providers.data ?? [], models: models.data ?? [], queueDepth: queueDepth ?? 0, flags: flags.data ?? [] }, 200, cors);
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

  /* ── deployments ── */
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

  /* ── forms ── */
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

  /* ── template moderation ── */
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

  /* ── feature flags ── */
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

  /* ── maintenance mode ── */
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

  /* ── incidents ── */
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

  /* ── data export / deletion ── */
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

  /* ── release gate ── */
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

  /* ── admin management (super_admin only) ── */
  if (action === 'admins.list') {
    const g = gate('admins.manage'); if (g) return g;
    const { data } = await admin.from('platform_admins').select('*').order('created_at', { ascending: true });
    return json({ requestId, code: 'OK', admins: data ?? [] }, 200, cors);
  }

  if (action === 'admins.set') {
    const g = gate('admins.manage'); if (g) return g;
    const targetUserId = typeof body.userId === 'string' ? body.userId : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const active = Boolean(body.active);
    const reason = typeof body.reason === 'string' ? body.reason : '';
    if (!targetUserId || !ROLES.includes(role as AdminRole)) return error(requestId, 'INVALID_INPUT', 'userId and valid role required', 400);
    if (!reason) return error(requestId, 'INVALID_INPUT', 'Reason required for admin changes', 400);
    await admin.from('platform_admins').upsert({
      user_id: targetUserId, role, active, granted_by: ctx.userId, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    await audit(admin, ctx, 'admin.role_changed', 'platform_admin', targetUserId, reason, { role, active });
    return json({ requestId, code: 'OK', message: 'Admin record updated.' }, 200, cors);
  }

  /* ── audit trail ── */
  if (action === 'audit.list') {
    const g = gate('audit.read'); if (g) return g;
    const { data } = await admin.from('admin_audit_events').select('*').order('created_at', { ascending: false }).limit(200);
    return json({ requestId, code: 'OK', events: data ?? [] }, 200, cors);
  }

  return error(requestId, 'INVALID_ACTION', `Unknown action "${action}"`, 400);
});