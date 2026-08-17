import { useEffect } from 'react';
import { getSupabaseClient } from '@/services/supabaseClient';
import { useAuthStore } from '@/stores/authStore';

/**
 * Initialises authentication state from the live Supabase session at app
 * start, and keeps it in sync with every subsequent auth event (sign-in,
 * sign-out, token refresh, session expiry).
 */
export default function AuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setInitialized(true);
      return undefined;
    }

    let active = true;

    // Resolve the current session once, so a hard refresh preserves auth.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null);
    });

    // Keep the store in sync with every auth change. The callback is kept
    // synchronous (no async/await) to avoid deadlocking Supabase's internal lock.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setUser, setInitialized]);

  return null;
}