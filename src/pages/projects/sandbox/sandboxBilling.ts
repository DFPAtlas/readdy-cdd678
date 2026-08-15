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
  | 'cancelled';

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

async function invokeCheckout(action: 'checkout' | 'portal', body: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
  const supabase = getSandboxClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('forge-create-checkout', { body: { action, ...body } });
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

function freshUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function startCheckout(planKey: PlanKey, billingInterval: 'month' | 'year' = 'month'): Promise<CheckoutResult> {
  const requestKey = freshUuid();
  const data = await invokeCheckout('checkout', { planKey, billingInterval, requestKey });
  if (!data) return { ok: false, errorCode: 'NOT_CONFIGURED', message: 'Billing is not configured.' };
  if (data.code === 'OK' && typeof data.url === 'string') return { ok: true, url: data.url };
  return { ok: false, errorCode: String(data.errorCode ?? 'UNKNOWN'), message: String(data.message ?? 'Checkout unavailable.') };
}

export async function openBillingPortal(): Promise<CheckoutResult> {
  const data = await invokeCheckout('portal');
  if (!data) return { ok: false, errorCode: 'NOT_CONFIGURED', message: 'Billing is not configured.' };
  if (data.code === 'OK' && typeof data.url === 'string') return { ok: true, url: data.url };
  return { ok: false, errorCode: String(data.errorCode ?? 'UNKNOWN'), message: String(data.message ?? 'Billing portal unavailable.') };
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
