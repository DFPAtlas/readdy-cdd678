import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Global profile data model, derived from real Supabase records.
// Only the fields that genuinely exist are exposed:
//   - identity (email, id, created_at) from Supabase Auth
//   - display_name / initials / avatar_url from the `profiles` row
//   - effective plan state from the authoritative `resolve_effective_plan`
//     RPC (never an arbitrary subscription row)
// Email is read-only: it is owned by the auth provider, not Forge.
// ------------------------------------------------------------

export interface ProfileData {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  initials: string | null;
  avatarUrl: string | null;
  accountCreatedAt: string | null;
  planKey: string | null;
  planStatus: string | null;
  paidAccess: boolean;
  billingConflict: boolean;
  planPeriodEnd: string | null;
  nextPlan: string | null;
  planVerified: boolean;
}

export function createEmptyProfileData(): ProfileData {
  return {
    authenticated: false,
    userId: null,
    email: null,
    displayName: null,
    initials: null,
    avatarUrl: null,
    accountCreatedAt: null,
    planKey: null,
    planStatus: null,
    paidAccess: false,
    billingConflict: false,
    planPeriodEnd: null,
    nextPlan: null,
    planVerified: false,
  };
}

function computeInitials(displayName: string | null, email: string | null): string {
  const source = displayName?.trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }
  const local = email?.split('@')[0];
  if (local) return local.slice(0, 2).toUpperCase();
  return '?';
}

export async function fetchProfile(): Promise<ProfileData> {
  const supabase = getSupabaseClient();
  if (!supabase) return createEmptyProfileData();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return createEmptyProfileData();
  const user = authData.user;

  const [profileResult, planResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, initials, avatar_url, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.rpc('resolve_effective_plan', { p_user_id: user.id }),
  ]);

  const profile = profileResult.data ?? null;

  // Authoritative effective plan. A lookup failure is NOT proof of a free
  // account — surface `planKey: null` so the UI can show "Unable to verify".
  const effectivePlan = planResult.error
    ? null
    : (planResult.data as Record<string, unknown> | null);

  const planVerified = !planResult.error && Boolean(planResult.data);

  const planKey = effectivePlan?.plan_key ? String(effectivePlan.plan_key) : null;
  const planStatus = effectivePlan?.subscription_status
    ? String(effectivePlan.subscription_status)
    : null;

  const displayName =
    (profile?.display_name ? String(profile.display_name) : null) ??
    (typeof user.user_metadata?.display_name === 'string'
      ? String(user.user_metadata.display_name)
      : null);

  return {
    authenticated: true,
    userId: user.id,
    email: user.email ?? null,
    displayName,
    initials:
      (profile?.initials ? String(profile.initials) : null) ??
      computeInitials(displayName, user.email ?? null),
    avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : null,
    accountCreatedAt:
      (profile?.created_at ? String(profile.created_at) : null) ??
      (user.created_at ? String(user.created_at) : null),
    planKey,
    planStatus,
    paidAccess: effectivePlan?.paid_access === true,
    billingConflict: effectivePlan?.billing_conflict === true,
    planPeriodEnd: effectivePlan?.period_end ? String(effectivePlan.period_end) : null,
    nextPlan: effectivePlan?.next_plan ? String(effectivePlan.next_plan) : null,
    planVerified,
  };
}

export async function updateDisplayName(
  name: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Unable to save profile.' };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: 'Sign in to update your profile.' };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: 'Display name is required.' };

  const initials = computeInitials(trimmed, authData.user.email ?? null);

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: trimmed,
      initials,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id);

  if (error) return { ok: false, message: 'Unable to save profile.' };
  return { ok: true, message: 'Profile saved' };
}