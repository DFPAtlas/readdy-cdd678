import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  hasCompletedSetup: boolean;
  setAuthenticated: (v: boolean) => void;
  setSetupComplete: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: true,
      hasCompletedSetup: false,
      setAuthenticated: (v) => set({ isAuthenticated: v }),
      setSetupComplete: (v) => set({ hasCompletedSetup: v }),
    }),
    {
      name: 'forge-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        hasCompletedSetup: state.hasCompletedSetup,
      }),
    }
  )
);