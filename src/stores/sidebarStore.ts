import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isExpanded: true,
      isMobileOpen: false,

      toggle: () => set((s) => ({ isExpanded: !s.isExpanded })),
      expand: () => set({ isExpanded: true }),
      collapse: () => set({ isExpanded: false }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
    }),
    {
      name: 'forge-sidebar',
      partialize: (state) => ({ isExpanded: state.isExpanded }),
    }
  )
);