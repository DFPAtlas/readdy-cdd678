import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Billing — server-controlled plan catalogue, usage summary,
   credit estimates, limit checks, credit balance/packs/purchases,
   and audited admin mutations.
   The browser never computes entitlements, prices or usage truth.

   Authorization: platform-admin authority resolves from `platform_admins`
   (single trusted source), permission-scoped to billing.read / billing.operate.

   Effective-plan selection is DETERMINISTIC: prefer active → trialing →
   past_due, then most recently created. When more than one billable
   subscription exists for the same user, `billingConflict` is reported.

   AI credit top-ups: purchased credits (ai_credit_purchase) are tracked
   separately from monthly-included credits and consumed after them. The
   trusted balance is computed server-side via forge_credit_balance().
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PLAN_KEYS = ['free', 'starter', 'builder', 'pro', 'agency'] as const;

/* Trusted credit pack catalogue (display + trusted key). The browser never
   sends a price or credit quantity; checkout only ever sends the pack key. */
const CREDIT_PACKS = [
  { key: 'credits_500', credits: 500, pricePence: 700 },
  { key: 'credits_1500', credits: 1500, pricePence: 1800 },
  { key: 'credits_5000', credits: 5000, pricePence: 5000, bestValue: true },
  { key: 'credits_15000', credits: 15000, pricePence: 13500 },
];

const BILLABLE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];
const STATUS_PRIORITY: Record<string, number> = { active: 0, trialing: 1, past_due: 2, unpaid: 3, incomplete: 4 };

const PLAN_META: Record<string, { name: string; description: string; features: string[]; sortOrder: number }> = {
  free: { name: 'Free', description: 'Try Forge before publishing.', features: ['150 trial AI credits', '3 pages per site', 'Preview only'], sortOrder: 0 },
  starter: { name: 'Starter', description: 'For a first live website.', features: ['1,000 AI credits / month', '10 pages per site', '1 published site'], sortOrder: 1 },
  builder: { name: 'Builder', description: 'For regular website building.', features: ['3,000 AI credits / month', '30 pages per site', '5 published sites'], sortOrder: 2 },
  pro: { name: 'Pro', description: 'For professionals and client work.', features: ['6,500 AI credits / month', '100 pages per site', '20 published sites'], sortOrder: 3 },
  agency: { name: 'Agency', description: 'For teams shipping at scale.', features: ['16,000 AI credits / month', '250 pages per site', '100 published sites'], sortOrder: 4 },
};

const AI_CREDIT_COSTS: Record<string, number> = {
  fast_edit: 3,
  standard: 10,
  complex: 25,
  copywriting: 4,
  seo: 4,
  accessibility: 3,
  image_alt: 2,
  image_generation: 15,
  site_audit: 30,
  full_page: 35,
  code: 12,
  redesign: 40,
};

const ENTITLEMENT_KEYS = [
  'max_active_projects', 'max_pages_per_project', 'max_team_members',
  'monthly_ai_credits', 'asset_storage_mb', 'monthly_form_submissions',
  'custom_domains', 'published_sites', 'version_history_retention_days',
  'collaboration_access', 'export_access', 'advanced_seo_access', 'priority_ai_access',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  if (
    origin === 'https://theforges.org' ||
    origin === 'https://www.theforges.org'
  ) return true;

  if (/^https:\/\/[^/]*readdy\.ai$/.test(origin)) return true;

  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;

  return false;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin);

  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function error(requestId: string, errorCode: string, message: string, status = 400, cors: Record<string, string> = {}) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status, cors);
}

async function getUser(authHeader: string | null) {
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function hasBillingPermission(admin: ReturnType<typeof createClient>, userId: string, perm: 'billing.read' | 'billing.operate'): Promise<boolean> {
  const { data } = await admin.from('platform_admins').select('role, permissions, active').eq('user_id', userId).maybeSingle();
  if (!data?.active) return false;
  if (data.role === 'super_admin') return true;
  if (data.role === 'billing_admin') return true;
  const stored: string[] = Array.isArray(data.permissions) ? data.permissions.filter((p: unknown) => typeof p === 'string') : [];
  return stored.includes('*') || stored.includes(perm);
}

type EffectivePlan = {
  plan_key: string;
  access_level: string;
  paid_access: boolean;
  subscription_status: string | null;
  period_end: string | null;
  reset_date: string | null;
  next_plan: string;
  billing_conflict?: boolean;
};

async function effectivePlan(admin: ReturnType<typeof createClient>, userId: string): Promise<EffectivePlan> {
  const { data } = await admin.rpc('resolve_effective_plan', { p_user_id: userId });
  if (!data) {
    return { plan_key: 'free', access_level: 'free', paid_access: false, subscription_status: null, period_end: null, reset_date: null, next_plan: 'starter', billing_conflict: false };
  }
  return data as EffectivePlan;
}

async function currentPlan(admin: ReturnType<typeof createClient>, userId: string): Promise<string> {
  return (await effectivePlan(admin, userId)).plan_key;
}

async function readEntitlements(admin: ReturnType<typeof createClient>, planKey: string) {
  const { data } = await admin.from('plan_entitlements').select('entitlement_key, limit_value, configuration')
    .eq('plan_key', planKey).eq('active', true);
  const map: Record<string, number | null> = {};
  (data ?? []).forEach((row: { entitlement_key: string; limit_value: number | null }) => {
    map[row.entitlement_key] = row.limit_value;
  });
  return map;
}

function pickEffectiveSubscription(subs: Array<Record<string, unknown>>): Record<string, unknown> | null {
  if (!subs || subs.length === 0) return null;
  const sorted = [...subs].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status as string] ?? 99;
    const pb = STATUS_PRIORITY[b.status as string] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''));
  });
  return sorted[0];
}

/* Trusted credit balance via the SQL helper (monthly + purchased buckets). */
async function creditBalance(admin: ReturnType<typeof createClient>, userId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await admin.rpc('forge_credit_balance', { p_user_id: userId });
    return (data as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405, cors);

  const userId = await getUser(req.headers.get('authorization'));
  if (!userId) return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401, cors);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return error(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400, cors); }

  const action = typeof body.action === 'string' ? body.action : 'summary';
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } } });

  /* ── Plan catalogue (with Stripe prices when configured) ── */
  if (action === 'catalogue') {
    const pricingConfigured = Boolean(Deno.env.get('STRIPE_RESTRICTED_KEY'));
    const plans: unknown[] = [];
    for (const key of PLAN_KEYS) {
      const meta = PLAN_META[key];
      const entitlements = await readEntitlements(admin, key);
      plans.push({ key, name: meta.name, description: meta.description, features: meta.features, sortOrder: meta.sortOrder, price: null, entitlements });
    }
    return json({ requestId, code: 'OK', catalogue: { pricingConfigured, plans } }, 200, cors);
  }

  /* ── Credit packs (trusted one-time top-up catalogue) ── */
  if (action === 'credit_packs') {
    return json({ requestId, code: 'OK', packs: CREDIT_PACKS }, 200, cors);
  }

  /* ── Credit balance (monthly + purchased buckets) ── */
  if (action === 'credit_balance') {
    const balance = await creditBalance(admin, userId);
    if (!balance) return error(requestId, 'BALANCE_FAILED', 'Could not load credit balance.', 500, cors);
    return json({ requestId, code: 'OK', balance }, 200, cors);
  }

  /* ── Credit purchase history (safe metadata only) ── */
  if (action === 'credit_purchases') {
    const { data: purchases } = await admin.from('usage_ledger')
      .select('quantity, status, provider, safe_metadata, settled_at, created_at')
      .eq('user_id', userId)
      .eq('usage_type', 'ai_credit_purchase')
      .order('created_at', { ascending: false })
      .limit(50);
    return json({ requestId, code: 'OK', purchases: purchases ?? [] }, 200, cors);
  }

  /* ── Credit cost estimate (server-controlled) ── */
  if (action === 'estimate') {
    const taskClass = typeof body.taskClass === 'string' ? body.taskClass : 'fast_edit';
    const estimatedCredits = AI_CREDIT_COSTS[taskClass] ?? AI_CREDIT_COSTS.fast_edit;
    const planKey = await currentPlan(admin, userId);
    const entitlements = await readEntitlements(admin, planKey);
    const limit = entitlements['monthly_ai_credits'] ?? null;

    const periodStart = await (async () => {
      const { data } = await admin.from('subscriptions').select('current_period_start')
        .eq('user_id', userId).in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data?.current_period_start ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    })();

    const { data: usedRows } = await admin.from('usage_ledger').select('quantity')
      .eq('user_id', userId).eq('usage_type', 'ai_credit').in('status', ['reserved', 'settled'])
      .gte('created_at', periodStart);
    const used = (usedRows ?? []).reduce((sum: number, r: { quantity: number }) => sum + (r.quantity || 0), 0);
    const remaining = limit === null ? null : Math.max(0, limit - used);
    const sufficient = limit === null ? true : (used + estimatedCredits) <= limit;

    return json({ requestId, code: 'OK', estimate: { taskClass, estimatedCredits, sufficient, remaining, limit } }, 200, cors);
  }

  /* ── Page / project limit checks (delegate to guarded RPCs) ── */
  if (action === 'check_page_limit') {
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const extraPages = Number(body.extraPages) || 1;
    if (!projectId) return error(requestId, 'INVALID_REQUEST', 'projectId is required', 400, cors);
    const { data, error: rpcError } = await userClient.rpc('check_page_limit', { p_user_id: userId, p_project_id: projectId, p_extra_pages: extraPages });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify page limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_project_limit') {
    const extraProjects = Number(body.extraProjects) || 1;
    const { data, error: rpcError } = await userClient.rpc('check_project_limit', { p_user_id: userId, p_extra_projects: extraProjects });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify project limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_published_sites_limit') {
    const extra = Number(body.extra) || 1;
    const { data, error: rpcError } = await userClient.rpc('check_published_sites_limit', { p_user_id: userId, p_extra_sites: extra });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify publishing limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_custom_domains_limit') {
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const extra = Number(body.extra) || 1;
    const { data, error: rpcError } = await userClient.rpc('check_custom_domains_limit', { p_user_id: userId, p_project_id: projectId, p_extra_domains: extra });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify custom domain limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_team_members_limit') {
    const projectId = typeof body.projectId === 'string' ? body.projectId : null;
    const extra = Number(body.extra) || 1;
    const { data, error: rpcError } = await userClient.rpc('check_team_members_limit', { p_user_id: userId, p_project_id: projectId, p_extra_members: extra });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify team member limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_export_access') {
    const { data, error: rpcError } = await userClient.rpc('check_export_access', { p_user_id: userId });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify export access', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_advanced_seo_access') {
    const { data, error: rpcError } = await userClient.rpc('check_advanced_seo_access', { p_user_id: userId });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify advanced SEO access', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_priority_ai_access') {
    const { data, error: rpcError } = await userClient.rpc('check_priority_ai_access', { p_user_id: userId });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify priority AI access', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  if (action === 'check_asset_storage_limit') {
    const extraBytes = Number(body.extraBytes) || 0;
    const { data, error: rpcError } = await userClient.rpc('check_asset_storage_limit', { p_user_id: userId, p_extra_bytes: extraBytes });
    if (rpcError) return error(requestId, 'LIMIT_CHECK_FAILED', 'Could not verify asset storage limit', 500, cors);
    return json({ requestId, code: 'OK', result: data }, 200, cors);
  }

  /* ── Usage summary (real data only) ── */
  if (action === 'summary') {
    const ep = await effectivePlan(admin, userId);
    const planKey = ep.plan_key;
    const entitlements = await readEntitlements(admin, planKey);

    const { data: billableSubs } = await admin.from('subscriptions')
      .select('id, status, plan_key, current_period_start, current_period_end, billing_interval, cancel_at_period_end, trial_end, created_at')
      .eq('user_id', userId).in('status', BILLABLE_STATUSES)
      .order('created_at', { ascending: false });

    const billingConflict = (billableSubs ?? []).length > 1;
    const sub = pickEffectiveSubscription(billableSubs ?? []);

    const { data: billingCustomer } = await admin.from('billing_customers').select('billing_email')
      .eq('user_id', userId).maybeSingle();

    const { data: workspaces } = await admin.from('workspaces').select('id').eq('owner_id', userId);
    const workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id);
    const { data: projects } = workspaceIds.length
      ? await admin.from('projects').select('id, blueprint, status').in('workspace_id', workspaceIds)
      : { data: [] };
    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
    const activeProjects = (projects ?? []).filter((p: { status?: string }) => (p.status ?? 'draft') !== 'archived').length;

    let maxPages = 0;
    (projects ?? []).forEach((p: { blueprint?: { pages?: unknown[] } }) => {
      const count = Array.isArray(p.blueprint?.pages) ? p.blueprint.pages.length : 0;
      if (count > maxPages) maxPages = count;
    });

    const periodStart = (sub?.current_period_start as string) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: creditRows } = await admin.from('usage_ledger').select('quantity')
      .eq('user_id', userId).eq('usage_type', 'ai_credit').in('status', ['reserved', 'settled'])
      .gte('created_at', periodStart);
    const aiCreditsUsed = (creditRows ?? []).reduce((sum: number, r: { quantity: number }) => sum + (r.quantity || 0), 0);

    let teamMembers = 0;
    try {
      const { data: members } = projectIds.length
        ? await admin.from('project_members').select('user_id').in('project_id', projectIds).eq('status', 'active')
        : { data: [] };
      teamMembers = new Set((members ?? []).map((m: { user_id: string }) => m.user_id)).size;
    } catch { teamMembers = 0; }

    let publishedSites = 0;
    try {
      const { data: deploys } = projectIds.length
        ? await admin.from('deployments').select('project_id').in('project_id', projectIds).eq('environment', 'production').in('status', ['active', 'completed'])
        : { data: [] };
      publishedSites = new Set((deploys ?? []).map((d: { project_id: string }) => d.project_id)).size;
    } catch { publishedSites = 0; }

    let customDomains = 0;
    try {
      const { data: domains } = projectIds.length
        ? await admin.from('domains').select('id').in('project_id', projectIds)
        : { data: [] };
      customDomains = (domains ?? []).length;
    } catch { customDomains = 0; }

    const meters = [
      { key: 'ai_credits', label: 'AI credits', unit: 'credits', used: aiCreditsUsed, limit: entitlements['monthly_ai_credits'] ?? null },
      { key: 'projects', label: 'Projects', unit: 'projects', used: activeProjects, limit: entitlements['max_active_projects'] ?? null },
      { key: 'pages', label: 'Pages (largest project)', unit: 'pages', used: maxPages, limit: entitlements['max_pages_per_project'] ?? null },
      { key: 'team_members', label: 'Team members', unit: 'seats', used: teamMembers, limit: entitlements['max_team_members'] ?? null },
      { key: 'published_sites', label: 'Published websites', unit: 'sites', used: publishedSites, limit: entitlements['published_sites'] ?? null },
      { key: 'custom_domains', label: 'Custom domains', unit: 'domains', used: customDomains, limit: entitlements['custom_domains'] ?? null },
    ];

    const adminFlag = await hasBillingPermission(admin, userId, 'billing.read');

    // Credit buckets (monthly included + purchased), computed server-side.
    const balance = await creditBalance(admin, userId);

    return json({
      requestId, code: 'OK',
      summary: {
        planKey,
        accessLevel: ep.access_level,
        paidAccess: ep.paid_access,
        subscriptionStatus: ep.subscription_status ?? (sub?.status as string) ?? null,
        billingInterval: (sub?.billing_interval as 'month' | 'year' | null) ?? null,
        renewalDate: ep.period_end ?? (sub?.current_period_end as string) ?? null,
        cancelAtPeriodEnd: (sub?.cancel_at_period_end as boolean) ?? false,
        trialEnd: (sub?.trial_end as string | null) ?? null,
        billingEmail: (billingCustomer?.billing_email as string | null) ?? null,
        billingConflict,
        resetDate: ep.reset_date,
        nextPlan: ep.next_plan,
        pricingConfigured: Boolean(Deno.env.get('STRIPE_RESTRICTED_KEY')),
        isAdmin: adminFlag,
        meters,
        monthlyCreditsLimit: balance?.monthly_credit_limit ?? null,
        monthlyCreditsUsed: balance?.monthly_credits_used ?? null,
        monthlyCreditsRemaining: balance?.monthly_credits_remaining ?? null,
        purchasedCreditsTotal: balance?.purchased_credits_total ?? null,
        purchasedCreditsUsed: balance?.purchased_credits_used ?? null,
        purchasedCreditsRemaining: balance?.purchased_credits_remaining ?? null,
        totalCreditsRemaining: balance?.total_credits_remaining ?? null,
      },
    }, 200, cors);
  }

  /* ── Admin actions (server-authorised, permission-scoped + audited) ── */
  if (action === 'admin_update_entitlement') {
    if (!(await hasBillingPermission(admin, userId, 'billing.operate'))) return error(requestId, 'FORBIDDEN', 'Billing operate permission required', 403, cors);
    const planKey = typeof body.planKey === 'string' ? body.planKey : '';
    const entitlementKey = typeof body.entitlementKey === 'string' ? body.entitlementKey : '';
    const limitValue = body.limitValue === null ? null : Number(body.limitValue);
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
    if (!PLAN_KEYS.includes(planKey as typeof PLAN_KEYS[number]) || !ENTITLEMENT_KEYS.includes(entitlementKey)) {
      return error(requestId, 'INVALID_INPUT', 'Unknown plan or entitlement key', 400, cors);
    }
    await admin.from('plan_entitlements').upsert({
      plan_key: planKey, entitlement_key: entitlementKey, limit_value: limitValue, active: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'plan_key,entitlement_key' });
    await admin.from('collaboration_events').insert({
      project_id: null, actor_id: userId, event_type: 'billing.entitlement_updated',
      entity_type: 'plan_entitlement', entity_id: `${planKey}:${entitlementKey}`,
      safe_metadata: { plan_key: planKey, entitlement_key: entitlementKey, limit_value: limitValue, reason },
    });
    return json({ requestId, code: 'OK', message: 'Entitlement updated.' }, 200, cors);
  }

  if (action === 'admin_grant_credits') {
    if (!(await hasBillingPermission(admin, userId, 'billing.operate'))) return error(requestId, 'FORBIDDEN', 'Billing operate permission required', 403, cors);
    const targetUserId = typeof body.userId === 'string' ? body.userId : '';
    const credits = Number(body.credits) || 0;
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
    if (!targetUserId || credits <= 0) return error(requestId, 'INVALID_INPUT', 'Valid user and positive credits required', 400, cors);
    await admin.from('usage_ledger').insert({
      user_id: targetUserId, usage_type: 'ai_credit_grant', quantity: credits, status: 'settled',
      idempotency_key: `grant-${crypto.randomUUID()}`, safe_metadata: { reason, granted_by: userId }, settled_at: new Date().toISOString(),
    });
    await admin.from('collaboration_events').insert({
      project_id: null, actor_id: userId, event_type: 'billing.credits_granted',
      entity_type: 'usage_ledger', entity_id: targetUserId,
      safe_metadata: { credits, reason, target_user_id: targetUserId },
    });
    return json({ requestId, code: 'OK', message: 'Credits granted.' }, 200, cors);
  }

  if (action === 'admin_billing_events') {
    if (!(await hasBillingPermission(admin, userId, 'billing.read'))) return error(requestId, 'FORBIDDEN', 'Billing read permission required', 403, cors);
    const { data } = await admin.from('billing_events').select('*').order('received_at', { ascending: false }).limit(100);
    return json({ requestId, code: 'OK', events: data ?? [] }, 200, cors);
  }

  if (action === 'admin_usage') {
    if (!(await hasBillingPermission(admin, userId, 'billing.read'))) return error(requestId, 'FORBIDDEN', 'Billing read permission required', 403, cors);
    const { data } = await admin.from('usage_ledger').select('*').order('created_at', { ascending: false }).limit(200);
    return json({ requestId, code: 'OK', ledger: data ?? [] }, 200, cors);
  }

  return error(requestId, 'INVALID_ACTION', `Unknown action "${action}"`, 400, cors);
});
