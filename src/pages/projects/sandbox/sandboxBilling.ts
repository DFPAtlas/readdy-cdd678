import { getSandboxClient, resolveSandboxProject } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Billing, plans, entitlements, AI credits and usage limits.
   All authoritative values come from the server (forge-billing
   edge function + plan_entitlements). This file only types and
   transports them — it never computes entitlements or money.
   ────────────────────────────────────────────────────────────── */

export type PlanKey = 'free' | 'starter' | 'builder' | 'pro' | 'agency';

export const PLAN_KEYS: PlanKey[] = ['free', 'starter', 'builder', 'pro', 'agency'];

export type EntitlementKey =
  | 'max_active_projects'
  | 'max_pages_per_project'
  | 'max_team_members'
  | 'monthly_ai_credits'
  | 'asset_storage_mb'
  | 'monthly_form_submissions'
  | 'custom_domains'
  | 'published_sites'
  | 'version_history_retention_days'
  | 'collaboration_access'
  | 'export_access'
  | 'advanced_seo_access'
  | 'priority_ai_access';

export type SubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'canceled'
  | 'incomplete_expired';

export type PlanPrice = {
  amount: number;
  currency: string;
  interval: 'month' | 'year';
} | null;

export type PlanCatalogueEntry = {
  key: PlanKey;
  name: string;
  description: string;
  features: string[];
  sortOrder: number;
  price: PlanPrice;
  entitlements: Partial<Record<EntitlementKey, number | null>>;
};

export type PlanCatalogue = {
  pricingConfigured: boolean;
  plans: PlanCatalogueEntry[];
};

export type Meter = {
  key: string;
  label: string;
  unit: string;
  used: number;
  limit: number | null;
};

export type UsageSummary = {
  planKey: PlanKey;
  subscriptionStatus: SubscriptionStatus | null;
  billingInterval: 'month' | 'year' | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  billingEmail: string | null;
  pricingConfigured: boolean;
  isAdmin: boolean;
  meters: Meter[];
};

export type PageLimitResult = {
  allowed: boolean;
  current: number;
  limit: number | null;
  plan: PlanKey;
  nextPlan: PlanKey;
};

export type ProjectLimitResult = {
  allowed: boolean;
  current: number;
  limit: number | null;
  plan: PlanKey;
  nextPlan: PlanKey;
};

export type CreditEstimate = {
  taskClass: string;
  estimatedCredits: number;
  sufficient: boolean;
  remaining: number;
  limit: number | null;
};

/* Fallback catalogue — shown only when the server is unreachable or
   billing is genuinely not configured. No invented pricing. */
const FALLBACK_CATALOGUE: PlanCatalogue = {
  pricingConfigured: false,
  plans: [
    { key: 'free', name: 'Free', description: 'Try Forge before publishing.', features: ['150 trial AI credits', '3 pages per site', 'Preview only'], sortOrder: 0, price: null, entitlements: {} },
    { key: 'starter', name: 'Starter', description: 'For a first live website.', features: ['1,000 AI credits / month', '10 pages per site', '1 published site'], sortOrder: 1, price: null, entitlements: {} },
    { key: 'builder', name: 'Builder', description: 'For regular website building.', features: ['3,000 AI credits / month', '30 pages per site', '5 published sites'], sortOrder: 2, price: null, entitlements: {} },
    { key: 'pro', name: 'Pro', description: 'For professionals and client work.', features: ['6,500 AI credits / month', '100 pages per site', '20 published sites'], sortOrder: 3, price: null, entitlements: {} },
    { key: 'agency', name: 'Agency', description: 'For teams shipping at scale.', features: ['16,000 AI credits / month', '250 pages per site', '100 published sites'], sortOrder: 4, price: null, entitlements: {} },
  ],
};

async function invoke(action: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('forge-billing', { body: { action, ...body } });
    if (error || !data) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchPlanCatalogue(): Promise<PlanCatalogue> {
  const data = await invoke('catalogue');
  if (!data || data.code !== 'OK' || !data.catalogue) return FALLBACK_CATALOGUE;
  return data.catalogue as PlanCatalogue;
}

export async function fetchUsageSummary(): Promise<UsageSummary | null> {
  const data = await invoke('summary');
  if (!data || data.code !== 'OK' || !data.summary) return null;
  return data.summary as UsageSummary;
}

export async function estimateAiCredits(taskClass: string): Promise<CreditEstimate | null> {
  const data = await invoke('estimate', { taskClass });
  if (!data || data.code !== 'OK' || !data.estimate) return null;
  return data.estimate as CreditEstimate;
}

export async function checkPageLimit(projectId: string, extraPages: number): Promise<PageLimitResult | null> {
  const data = await invoke('check_page_limit', { projectId, extraPages });
  if (!data || data.code !== 'OK' || !data.result) return null;
  return data.result as PageLimitResult;
}

export async function checkProjectLimit(extraProjects: number): Promise<ProjectLimitResult | null> {
  const data = await invoke('check_project_limit', { extraProjects });
  if (!data || data.code !== 'OK' || !data.result) return null;
  return data.result as ProjectLimitResult;
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; errorCode: string; message: string };

export async function startCheckout(planKey: PlanKey, billingInterval: 'month' | 'year' = 'month'): Promise<CheckoutResult> {
  if (planKey === 'free') return { ok: false, errorCode: 'INVALID_PLAN', message: 'The Free plan does not require checkout.' };
  const query = new URLSearchParams({ plan: planKey, interval: billingInterval });
  return { ok: true, url: `/checkout?${query.toString()}` };
}

export type HostedCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; errorCode: string; message: string; diagnostic?: string };

export function checkoutErrorMessage(code: string | null | undefined, fallback?: string | null): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to continue.';
    case 'PRICE_NOT_CONFIGURED':
      return 'This plan\u2019s pricing isn\u2019t available yet. Please try again shortly.';
    case 'ACTIVE_SUBSCRIPTION':
      return 'You already have an active subscription.';
    case 'CHECKOUT_UNAVAILABLE':
      return 'We couldn\u2019t connect to the secure checkout service.';
    case 'CONFIGURATION_ERROR':
    case 'NOT_CONFIGURED':
      return 'Checkout isn\u2019t fully configured yet. Please try again shortly.';
    case 'INVALID_PLAN':
      return 'That plan isn\u2019t available.';
    case 'INVALID_INTERVAL':
      return 'That billing interval isn\u2019t available.';
    case 'INVALID_REQUEST_KEY':
      return 'We couldn\u2019t start checkout. Please try again.';
    case 'STRIPE_ERROR':
      return 'We couldn\u2019t reach the payment provider. Please try again.';
    default:
      return fallback && fallback.trim() ? fallback : 'We couldn\u2019t connect to the secure checkout service.';
  }
}

function parseCheckoutErrorContext(error: unknown): { errorCode: string | null; message: string | null } {
  try {
    if (!error || typeof error !== 'object') return { errorCode: null, message: null };
    const record = error as Record<string, unknown>;

    // supabase-js FunctionsHttpError carries the response body in `.context`
    // (parsed JSON in most versions, a JSON string in a few). Cover alternate
    // nesting shapes too so a categorized error always surfaces instead of
    // collapsing into a generic "couldn't connect" message.
    const candidates: unknown[] = [record.context, record.body, record.details].filter((c) => c != null);

    for (const candidate of candidates) {
      let parsed: unknown = candidate;
      if (typeof candidate === 'string') {
        try { parsed = JSON.parse(candidate); } catch { continue; }
      }
      if (parsed && typeof parsed === 'object') {
        const ctx = parsed as Record<string, unknown>;
        const errorCode = typeof ctx.errorCode === 'string' ? ctx.errorCode : null;
        const message = typeof ctx.message === 'string' ? ctx.message : null;
        if (errorCode || message) return { errorCode, message };
      }
    }

    const directCode = typeof record.errorCode === 'string' ? record.errorCode : null;
    const directMessage = typeof record.message === 'string' ? record.message : null;
    return { errorCode: directCode, message: directMessage };
  } catch {
    /* ignore malformed context */
  }
  return { errorCode: null, message: null };
}

/* The browser's real serving origin + base path, so Stripe redirects the
   customer back to the exact environment they started from (readdy preview or
   a custom domain) instead of a hardcoded production URL. */
function appReturnBase(): string {
  const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
  const pathPrefix = basePath ? `/${basePath}` : '';
  return `${window.location.origin}${pathPrefix}`;
}

export async function createHostedCheckoutSession(
  planKey: Exclude<PlanKey, 'free'>,
  billingInterval: 'month' | 'year',
  requestKey: string,
): Promise<HostedCheckoutResult> {
  const supabase = getSandboxClient();
  if (!supabase) {
    return { ok: false, errorCode: 'CHECKOUT_UNAVAILABLE', message: checkoutErrorMessage('CHECKOUT_UNAVAILABLE') };
  }

  try {
    const { data, error } = await supabase.functions.invoke('forge-create-checkout', {
      body: { action: 'checkout', planKey, billingInterval, requestKey, returnBase: appReturnBase() },
    });

    if (error) {
      // Non-2xx response (e.g. 401 / 409 / 503). Surface the server's
      // errorCode when present without leaking raw Stripe internals.
      const { errorCode, message } = parseCheckoutErrorContext(error);
      const code = errorCode ?? 'CHECKOUT_UNAVAILABLE';
      const status = typeof (error as Record<string, unknown>)?.status === 'number'
        ? String((error as Record<string, unknown>).status) : 'n/a';
      const diagnostic = `invoke-error code=${code} status=${status} name=${(error as { name?: string })?.name ?? 'n/a'} msg=${message ?? (error as { message?: string })?.message ?? 'n/a'}`;
      return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message), diagnostic };
    }

    if (data && data.code === 'OK' && typeof data.url === 'string') {
      return { ok: true, url: data.url };
    }

    if (data && typeof data.errorCode === 'string') {
      const code = String(data.errorCode);
      const message = typeof data.message === 'string' ? data.message : null;
      const diagnostic = `server code=${code} msg=${message ?? 'n/a'}`;
      return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message), diagnostic };
    }

    return { ok: false, errorCode: 'CHECKOUT_UNAVAILABLE', message: checkoutErrorMessage('CHECKOUT_UNAVAILABLE'), diagnostic: `empty-response data=${JSON.stringify(data)?.slice(0, 200) ?? 'null'}` };
  } catch (err) {
    const { errorCode, message } = parseCheckoutErrorContext(err);
    const code = errorCode ?? 'CHECKOUT_UNAVAILABLE';
    const diagnostic = `throw code=${code} name=${(err as { name?: string })?.name ?? 'n/a'} msg=${(err as { message?: string })?.message ?? 'n/a'}`;
    return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message), diagnostic };
  }
}

export async function openBillingPortal(): Promise<CheckoutResult> {
  const supabase = getSandboxClient();
  if (!supabase) {
    return { ok: false, errorCode: 'CHECKOUT_UNAVAILABLE', message: checkoutErrorMessage('CHECKOUT_UNAVAILABLE') };
  }

  try {
    const { data, error } = await supabase.functions.invoke('forge-create-checkout', { body: { action: 'portal', returnBase: appReturnBase() } });
    if (error) {
      const { errorCode, message } = parseCheckoutErrorContext(error);
      const code = errorCode ?? 'CHECKOUT_UNAVAILABLE';
      return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message) };
    }
    if (data && data.code === 'OK' && typeof data.url === 'string') {
      return { ok: true, url: data.url };
    }
    if (data && typeof data.errorCode === 'string') {
      const code = String(data.errorCode);
      const message = typeof data.message === 'string' ? data.message : null;
      return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message) };
    }
    return { ok: false, errorCode: 'CHECKOUT_UNAVAILABLE', message: checkoutErrorMessage('CHECKOUT_UNAVAILABLE') };
  } catch (err) {
    const { errorCode, message } = parseCheckoutErrorContext(err);
    const code = errorCode ?? 'CHECKOUT_UNAVAILABLE';
    return { ok: false, errorCode: code, message: checkoutErrorMessage(code, message) };
  }
}

/* ── Admin (server-authorised) ── */

export type AdminEntitlementUpdate = {
  planKey: PlanKey;
  entitlementKey: EntitlementKey;
  limitValue: number | null;
  reason: string;
};

export async function adminUpdateEntitlement(input: AdminEntitlementUpdate): Promise<{ ok: boolean; message: string }> {
  const data = await invoke('admin_update_entitlement', { ...input });
  if (!data || data.code !== 'OK') return { ok: false, message: String(data?.message ?? 'Not authorised.') };
  return { ok: true, message: String(data.message ?? 'Updated.') };
}

export async function adminGrantCredits(userId: string, credits: number, reason: string): Promise<{ ok: boolean; message: string }> {
  const data = await invoke('admin_grant_credits', { userId, credits, reason });
  if (!data || data.code !== 'OK') return { ok: false, message: String(data?.message ?? 'Not authorised.') };
  return { ok: true, message: String(data.message ?? 'Granted.') };
}

export async function resolveCurrentUser(): Promise<{ userId: string } | null> {
  return resolveSandboxProject().then((resolved) => (resolved ? { userId: resolved.userId } : null)).catch(() => null);
}
