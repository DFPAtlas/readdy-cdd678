import { create } from 'zustand';

interface SandboxStore {
  /* Panel layout */
  leftPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  bottomDrawerOpen: boolean;
  bottomDrawerHeight: number;
  promptPanelOpen: boolean;
  promptPanelHeight: number;

  /* Build */
  buildStatus: 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  buildProgress: number;
  buildNumber: number;
  buildElapsed: number;
  activeAgentTab: 'chat' | 'prompt' | 'tasks' | 'activity';
  activeBuildTab: 'activity' | 'logs' | 'problems' | 'changes' | 'console';
  activeLeftTab: 'pages' | 'sections' | 'components' | 'layers' | 'files' | 'assets';

  /* Preview */
  previewViewport: 'desktop' | 'tablet' | 'mobile' | 'custom';
  previewZoom: number;
  previewUrl: string;
  previewStatus: 'ready' | 'refreshing' | 'error' | 'not-started';
  inspectMode: boolean;
  selectedElementId: string | null;

  /* Prompt */
  promptText: string;
  promptVersion: number;
  promptSaved: boolean;

  /* Actions */
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomDrawer: () => void;
  togglePromptPanel: () => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  setBottomDrawerHeight: (h: number) => void;
  setPromptPanelHeight: (h: number) => void;
  setActiveAgentTab: (t: SandboxStore['activeAgentTab']) => void;
  setActiveBuildTab: (t: SandboxStore['activeBuildTab']) => void;
  setActiveLeftTab: (t: SandboxStore['activeLeftTab']) => void;
  setBuildStatus: (s: SandboxStore['buildStatus']) => void;
  setBuildProgress: (p: number) => void;
  setPreviewViewport: (v: SandboxStore['previewViewport']) => void;
  setPreviewZoom: (z: number) => void;
  setInspectMode: (on: boolean) => void;
  setSelectedElement: (id: string | null) => void;
  setPromptText: (t: string) => void;
  resetLayout: () => void;
}

const DEFAULT_LEFT = 220;
const DEFAULT_RIGHT = 380;
const DEFAULT_BOTTOM = 200;
const DEFAULT_PROMPT = 180;

export const useSandboxStore = create<SandboxStore>((set) => ({
  leftPanelOpen: true,
  leftPanelWidth: DEFAULT_LEFT,
  rightPanelOpen: true,
  rightPanelWidth: DEFAULT_RIGHT,
  bottomDrawerOpen: false,
  bottomDrawerHeight: DEFAULT_BOTTOM,
  promptPanelOpen: true,
  promptPanelHeight: DEFAULT_PROMPT,

  buildStatus: 'idle',
  buildProgress: 0,
  buildNumber: 23,
  buildElapsed: 0,
  activeAgentTab: 'chat',
  activeBuildTab: 'activity',
  activeLeftTab: 'pages',

  previewViewport: 'desktop',
  previewZoom: 100,
  previewUrl: 'http://localhost:5173',
  previewStatus: 'ready',
  inspectMode: false,
  selectedElementId: null,

  promptText:
    'Build a modern personal portfolio website for a software developer.\nThe design should be clean, dark, and professional with orange accents.\nInclude a hero section, about section, projects grid, skills, and contact form.\nUse smooth animations and responsive layouts.',
  promptVersion: 12,
  promptSaved: true,

  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomDrawer: () => set((s) => ({ bottomDrawerOpen: !s.bottomDrawerOpen })),
  togglePromptPanel: () => set((s) => ({ promptPanelOpen: !s.promptPanelOpen })),
  setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
  setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
  setBottomDrawerHeight: (h) => set({ bottomDrawerHeight: h }),
  setPromptPanelHeight: (h) => set({ promptPanelHeight: h }),
  setActiveAgentTab: (t) => set({ activeAgentTab: t }),
  setActiveBuildTab: (t) => set({ activeBuildTab: t }),
  setActiveLeftTab: (t) => set({ activeLeftTab: t }),
  setBuildStatus: (s) => set({ buildStatus: s }),
  setBuildProgress: (p) => set({ buildProgress: p }),
  setPreviewViewport: (v) => set({ previewViewport: v }),
  setPreviewZoom: (z) => set({ previewZoom: z }),
  setInspectMode: (on) => set({ inspectMode: on }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setPromptText: (t) => set({ promptText: t, promptSaved: false }),
  resetLayout: () => set({
    leftPanelOpen: true,
    leftPanelWidth: DEFAULT_LEFT,
    rightPanelOpen: true,
    rightPanelWidth: DEFAULT_RIGHT,
    bottomDrawerOpen: false,
    bottomDrawerHeight: DEFAULT_BOTTOM,
    promptPanelOpen: true,
    promptPanelHeight: DEFAULT_PROMPT,
  }),
}));