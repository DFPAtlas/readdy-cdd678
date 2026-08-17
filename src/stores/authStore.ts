import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initialized: boolean;
  hasCompletedSetup: boolean;
  setUser: (user: AuthUser | null) => void;
  setInitialized: (initialized: boolean) => void;
  setSetupComplete: (hasCompletedSetup: boolean) => void;
}

/**
 * Session-backed auth store.
 *
 * `user` is the single source of truth for authentication and is only ever
 * written by the Supabase session bootstrap (AuthBootstrap) or, on explicit
 * sign-in/sign-up, from the session returned by Supabase Auth. It is never
 * persisted — on reload it is re-derived from the live Supabase session.
 *
 * `isAuthenticated` is a derived mirror of `user`, kept for the many existing
 * consumers that read it directly. It defaults to false and cannot be set to
 * true without a real session.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      initialized: false,
      hasCompletedSetup: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user), initialized: true }),
      setInitialized: (initialized) => set({ initialized }),
      setSetupComplete: (hasCompletedSetup) => set({ hasCompletedSetup }),
    }),
    {
      name: 'forge-auth-v2',
      partialize: (state) => ({ hasCompletedSetup: state.hasCompletedSetup }),
    }
  )
);