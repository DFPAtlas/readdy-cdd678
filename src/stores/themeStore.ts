import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '@/types';

interface ThemeState {
  theme: UserPreferences['theme'];
  effectiveTheme: 'dark' | 'light';
  setTheme: (theme: UserPreferences['theme']) => void;
  toggleTheme: () => void;
  updateEffectiveTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      effectiveTheme: 'dark',

      setTheme: (theme) => {
        set({ theme });
        get().updateEffectiveTheme();
      },

      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        get().updateEffectiveTheme();
      },

      updateEffectiveTheme: () => {
        const { theme } = get();
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          set({ effectiveTheme: prefersDark ? 'dark' : 'light' });
        } else {
          set({ effectiveTheme: theme });
        }
      },
    }),
    {
      name: 'forge-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

export function applyThemeToDocument(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}