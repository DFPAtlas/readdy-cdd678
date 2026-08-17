import { create } from 'zustand';
import type { Workspace, Project, Notification, SystemService, ServiceHealth, User } from '@/types';
import { demoWorkspace, demoUser, demoNotifications } from '@/services/mock/demoData';

interface WorkspaceState {
  workspace: Workspace | null;
  setWorkspace: (ws: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: demoWorkspace,
  setWorkspace: (workspace) => set({ workspace }),
}));

interface ProjectState {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProject: null,
  setActiveProject: (activeProject) => set({ activeProject }),
}));

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: demoUser,
  setUser: (user) => set({ user }),
}));

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: demoNotifications,
  unreadCount: demoNotifications.filter((n) => !n.isRead).length,

  addNotification: (n) =>
    set((s) => ({
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),

  markAsRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
    }),

  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: s.notifications.filter((n) => n.id !== id && !n.isRead).length,
    })),
}));

interface SystemState {
  services: SystemService[];
  health: ServiceHealth | null;
  updateService: (id: string, updates: Partial<SystemService>) => void;
  setHealth: (health: ServiceHealth) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  services: [],
  health: null,

  updateService: (id, updates) =>
    set((s) => ({
      services: s.services.map((svc) =>
        svc.id === id ? { ...svc, ...updates } : svc
      ),
    })),

  setHealth: (health) => set({ health }),
}));

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (q: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: '',
  open: () => set({ isOpen: true, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, query: '' })),
  setQuery: (query) => set({ query }),
}));

interface SandboxLayoutState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomDrawerOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomDrawer: () => void;
  setLeftPanel: (open: boolean) => void;
  setRightPanel: (open: boolean) => void;
  setBottomDrawer: (open: boolean) => void;
}

export const useSandboxLayoutStore = create<SandboxLayoutState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: false,
  bottomDrawerOpen: false,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomDrawer: () => set((s) => ({ bottomDrawerOpen: !s.bottomDrawerOpen })),
  setLeftPanel: (open) => set({ leftPanelOpen: open }),
  setRightPanel: (open) => set({ rightPanelOpen: open }),
  setBottomDrawer: (open) => set({ bottomDrawerOpen: open }),
}));

export * from './themeStore';
export * from './sandboxStore';