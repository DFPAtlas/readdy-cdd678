import { getSupabaseClient } from '@/services/supabaseClient';

// ------------------------------------------------------------
// Global profile data model, derived from real Supabase records.
// Only the fields that genuinely exist are exposed:
//   - identity (email, id, created_at) from Supabase Auth
//   - display_name / initials / avatar_url from the `profiles` row
//   - plan_key / status from the `subscriptions` row (may be empty)
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

  const [profileResult, subResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, initials, avatar_url, created_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan_key, status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const profile = profileResult.data ?? null;
  const subscription = subResult.data ?? null;

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
    planKey: subscription?.plan_key ? String(subscription.plan_key) : null,
    planStatus: subscription?.status ? String(subscription.status) : null,
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