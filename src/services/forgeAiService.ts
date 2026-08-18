import { getSupabaseClient } from '@/services/supabaseClient';
import { fetchModelRegistry, type AiProviderInfo, type AiModelInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';

// ------------------------------------------------------------
// Forge AI — managed AI service status for customers.
// Forge centrally manages the AI providers used by projects.
// Customers no longer supply provider API keys; their access is
// controlled by their subscription plan, entitlements and usage.
// This module only ever returns plan/usage/availability data —
// never provider secrets or masked key suffixes.
// ------------------------------------------------------------

export interface ForgeAiStatus {
  authenticated: boolean;
  planCode: string;
  planLabel: string;
  nextPlan: string;
  monthlyCreditLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  monthlyRequestLimit: number;
  allowedTaskClasses: string[];
  periodStart: string | null;
  periodEnd: string | null;
  activeProviders: AiProviderInfo[];
  availableModels: AiModelInfo[];
  localAvailable: boolean;
  hasEntitlement: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  builder: 'Builder',
  pro: 'Pro',
  agency: 'Agency',
};

const PLAN_NEXT: Record<string, string> = {
  free: 'starter',
  starter: 'builder',
  builder: 'pro',
  pro: 'agency',
  agency: 'agency',
};

export function createEmptyForgeAiStatus(): ForgeAiStatus {
  return {
    authenticated: false,
    planCode: 'free',
    planLabel: 'Free',
    nextPlan: 'starter',
    monthlyCreditLimit: 0,
    creditsUsed: 0,
    creditsRemaining: 0,
    monthlyRequestLimit: 0,
    allowedTaskClasses: [],
    periodStart: null,
    periodEnd: null,
    activeProviders: [],
    availableModels: [],
    localAvailable: false,
    hasEntitlement: false,
  };
}

export async function fetchForgeAiStatus(): Promise<ForgeAiStatus> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyForgeAiStatus();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return createEmptyForgeAiStatus();
  const userId = authData.user.id;

  const [entitlementRes, registry] = await Promise.all([
    supabase
      .from('ai_entitlements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchModelRegistry(),
  ]);

  const entitlement = entitlementRes.data ?? null;
  const planCode = (entitlement?.plan_code as string) ?? 'free';
  const monthlyCreditLimit = Number(entitlement?.monthly_credit_limit ?? 0);
  const monthlyRequestLimit = Number(entitlement?.monthly_request_limit ?? 0);
  const allowedTaskClasses = Array.isArray(entitlement?.allowed_task_classes)
    ? (entitlement.allowed_task_classes as string[])
    : [];
  const periodStart = (entitlement?.period_start as string) ?? null;
  const periodEnd = (entitlement?.period_end as string) ?? null;

  let creditsUsed = 0;
  if (periodStart) {
    const { data: ledger } = await supabase
      .from('usage_ledger')
      .select('quantity')
      .eq('user_id', userId)
      .eq('usage_type', 'ai_credit')
      .in('status', ['reserved', 'settled'])
      .gte('created_at', periodStart);
    creditsUsed = (ledger ?? []).reduce(
      (sum: number, row: { quantity: number }) => sum + (Number(row.quantity) || 0),
      0,
    );
  }

  const activeProviders = registry.providers.filter((p) => p.status === 'active');
  const availableModels = registry.models.filter(
    (m) => m.enabled && (m.allowed_plans.length === 0 || m.allowed_plans.includes(planCode)),
  );
  const localAvailable = activeProviders.some(
    (p) => p.data_classification === 'local' || p.data_classification === 'self_hosted',
  );

  return {
    authenticated: true,
    planCode,
    planLabel: PLAN_LABELS[planCode] ?? 'Free',
    nextPlan: PLAN_NEXT[planCode] ?? 'starter',
    monthlyCreditLimit,
    creditsUsed,
    creditsRemaining: Math.max(0, monthlyCreditLimit - creditsUsed),
    monthlyRequestLimit,
    allowedTaskClasses,
    periodStart,
    periodEnd,
    activeProviders,
    availableModels,
    localAvailable,
    hasEntitlement: entitlement !== null,
  };
}