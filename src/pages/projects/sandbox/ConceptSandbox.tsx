import {
  Activity, AlignCenter, AlignLeft, AlignRight, AppWindow, ArrowDownUp, ArrowLeft,
  ArrowLeftRight, ArrowRight, Box, Boxes, BoxSelect, Check, ChevronDown, ChevronRight, Circle,
  Columns3, Command, Copy, Database, Eye, ExternalLink, FileText, FolderOpen,
  FormInput, Gem, Grid2X2, Group, Heading1, Image as ImageIcon, Layers3, LayoutGrid,
  List, Logs, Monitor, MousePointer2, Move, PanelRightClose, PanelTop, Palette, Plus,
  Redo2, RotateCcw, Search, Send, Settings, ShieldCheck, Smartphone, Sparkles,
  Square, Tablet, TerminalSquare, Trash2, Type, Undo2, Ungroup, Upload, UserRound,
  Users, MessageSquare, Video, X, Zap, Flag, History, AlertTriangle, Save,
  Gauge,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import "./concept-sandbox.css";
import FloatingPanel from "./FloatingPanel";
import {
  loadSandboxDocument,
  saveSandboxDocument,
  getSandboxClient,
  resolveSandboxProject,
  COMPONENT_CATEGORIES,
  defaultFormDefinition,
  type CanvasAssetRef,
  type CanvasElement,
  type CanvasElementKind,
  type ComponentCategory,
  type ComponentDefinition,
  type ComponentKind,
  type ElementLink,
  type GlobalSections,
  type NavigationItem,
  type SandboxDocument,
  type SandboxPage,
} from "./sandboxPersistence";
import { analyseSandboxPrompt, type AiCreativity, type SandboxAiProposal, type SandboxAiOperation, type SandboxComponentOperation, type SandboxPageOperation } from "./sandboxAi";
import type { AiMode, AiTaskClass, AiUsage } from "./sandboxAiGateway";
import AiUsageMeter from "./AiUsageMeter";
import AiGenerationStatus from "./AiGenerationStatus";
import AiSignInPrompt from "./AiSignInPrompt";
import { useAssetStore, uploadSingleFile, type AssetRecord } from "./sandboxAssets";
import AssetManager from "./AssetManager";
import PagesPanel from "./PagesPanel";
import CreatePageDialog from "./CreatePageDialog";
import PageSettingsDialog from "./PageSettingsDialog";
import {
  buildTemplateElement, countIncomingLinks, duplicatePage, makeNewPage,
  navigationItemForPage, slugify, suggestSlug, validateLink, validateSlug, type PageType,
} from "./sandboxPages";
import ComponentsPanel from "./ComponentsPanel";
import CreateComponentDialog from "./CreateComponentDialog";
import ComponentInstanceProperties from "./ComponentInstanceProperties";
import ComponentMasterEditor from "./ComponentMasterEditor";
import {
  applyInstanceOverrides, componentBounds, componentUsagePages, createComponentFromSelection,
  resolveComponent, BUILT_IN_COMPONENTS,
} from "./sandboxComponents";
import {
  checksumDocument, clearLocalVersions, clearRecovery, getVersionBlueprint, loadRecovery,
  listVersionHistory, saveRecovery, snapshotVersion,
  type RecoveryRecord, type SnapshotOptions, type VersionEntry, type VersionSource,
} from "./sandboxVersions";
import VersionHistoryPanel from "./VersionHistoryPanel";
import CreateCheckpointDialog from "./CreateCheckpointDialog";
import VersionCompareView from "./VersionCompareView";
import RestoreVersionDialog, { type RestoreMode } from "./RestoreVersionDialog";
import SitePreview from "./SitePreview";
import ValidationPanel from "./ValidationPanel";
import BuildPanel from "./BuildPanel";
import PublishDialog from "./PublishDialog";
import FormBuilderPanel from "./FormBuilderPanel";
import FormsPanel from "./FormsPanel";
import DesignSystemPanel from "./DesignSystemPanel";
import TeamPanel from "./TeamPanel";
import CommentsPanel from "./CommentsPanel";
import UsagePanel from "./UsagePanel";
import AiActivityPanel from "./AiActivityPanel";
import TemplatesPanel from "./TemplatesPanel";
import { applyPlaceholderValues, remapTemplateDocument, type TemplateManifest, type InstallMode } from "./sandboxTemplates";
import PromptBuilder, { type PromptBuilderResult } from "./PromptBuilder";
import { checkPageLimit, type PageLimitResult } from "./sandboxBilling";
import {
  ensureOwnerMembership, subscribePresence, detectSaveConflict, fetchRemoteBlueprintUpdatedAt,
  listApprovals, decideApproval, listComments,
  can, type MemberRole, type PresenceState, type CommentRecord,
} from "./sandboxCollaboration";
import { defaultTheme, summarizeThemeChange, type ThemeDefinition } from "./sandboxTheme";
import { validateBlueprint, type ValidationIssue, type ValidationResult } from "./sandboxValidation";

type ElementItem = { name: CanvasElementKind; icon: typeof Type };
type EditorHistory = { past: CanvasElement[][]; present: CanvasElement[]; future: CanvasElement[][] };

type PanelId = 'elements' | 'assistant';
type PanelMode = 'docked' | 'floating' | 'closed';

type PanelLayout = {
  mode: PanelMode;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type PanelsState = { elements: PanelLayout; assistant: PanelLayout };

const PANELS_STORAGE_KEY = 'forge:sandbox:panels:v1';

const ELEMENTS_DEFAULTS = { width: 330, height: 620, minWidth: 280, minHeight: 360 };
const ASSISTANT_DEFAULTS = { width: 380, height: 640, minWidth: 320, minHeight: 400 };

const elementItems: ElementItem[] = [
  { name: "Heading", icon: Heading1 }, { name: "Text", icon: Type },
  { name: "Button", icon: Square }, { name: "Image", icon: ImageIcon },
  { name: "Video", icon: Video }, { name: "Container", icon: BoxSelect },
  { name: "Columns", icon: Columns3 }, { name: "Form", icon: FormInput },
];

const railItems = [
  { name: "Add", icon: Plus }, { name: "Pages", icon: FileText },
  { name: "Templates", icon: LayoutGrid },
  { name: "Layers", icon: Layers3 }, { name: "Assets", icon: FolderOpen },
  { name: "Components", icon: Boxes }, { name: "Forms", icon: FormInput },
  { name: "Design", icon: Palette }, { name: "Team", icon: Users },
  { name: "Comments", icon: MessageSquare },
  { name: "Usage", icon: Gauge }, { name: "AI Jobs", icon: Activity },
  { name: "Data", icon: Database }, { name: "Auth", icon: UserRound },
];

const services = ["Forge API", "Supabase", "n8n", "Ollama"];

const elementDefaults: Record<CanvasElementKind, Pick<CanvasElement, "content" | "width" | "height" | "background" | "color">> = {
  Heading: { content: "Your new heading", width: 300, height: 58, background: "transparent", color: "#111820" },
  Text: { content: "Add your text here. Double-click properties to edit it.", width: 300, height: 72, background: "transparent", color: "#424a52" },
  Button: { content: "Call to action", width: 150, height: 46, background: "#f5a400", color: "#101820" },
  Image: { content: "Image placeholder", width: 260, height: 160, background: "#ffe6b8", color: "#9a5b00" },
  Video: { content: "Video placeholder", width: 300, height: 170, background: "#151d26", color: "#ffffff" },
  Container: { content: "Container", width: 360, height: 170, background: "#f7f8fa", color: "#59626b" },
  Columns: { content: "Two columns", width: 420, height: 150, background: "#ffffff", color: "#59626b" },
  Form: { content: "Contact form", width: 320, height: 210, background: "#ffffff", color: "#111820" },
  Document: { content: "Document download", width: 280, height: 120, background: "#f7f8fa", color: "#59626b" },
};

const emptyHistory: EditorHistory = { past: [], present: [], future: [] };

function defaultAssetRef(asset: AssetRecord): CanvasAssetRef {
  const kind = asset.type === 'video' ? 'video' : asset.type === 'document' ? 'document' : 'image';
  return {
    assetId: asset.id,
    url: asset.url,
    name: asset.name,
    mimeType: asset.mimeType,
    kind,
    altText: asset.altText ?? '',
    objectFit: 'cover',
    focalX: 50,
    focalY: 50,
    lockAspectRatio: true,
    borderRadius: 0,
    opacity: 100,
    linkUrl: '',
    linkNewTab: false,
    lazyLoad: false,
    decorative: false,
    poster: '',
    controls: true,
    muted: false,
    loop: false,
    autoplay: false,
    accessibleTitle: '',
  };
}

function assetElementSize(asset: AssetRecord): { width: number; height: number } {
  if (asset.type === 'video') return { width: 320, height: 200 };
  if (asset.type === 'document') return { width: 280, height: 120 };
  return { width: 260, height: 160 };
}

function makeAssetElement(asset: AssetRecord, current: CanvasElement[], x?: number, y?: number): CanvasElement {
  const kind: CanvasElementKind = asset.type === 'video' ? 'Video' : asset.type === 'document' ? 'Document' : 'Image';
  const size = assetElementSize(asset);
  const offset = (current.filter((entry) => entry.type === kind).length % 5) * 22;
  return {
    id: `${kind.toLowerCase()}-${crypto.randomUUID()}`,
    type: kind,
    name: asset.name,
    x: Math.max(8, x ?? 220 + offset),
    y: Math.max(72, y ?? 220 + offset),
    width: size.width,
    height: size.height,
    background: 'transparent',
    color: '#111820',
    content: asset.name,
    asset: defaultAssetRef(asset),
  };
}

function makeCanvasElement(type: CanvasElementKind, current: CanvasElement[], content?: string, x?: number, y?: number): CanvasElement {
  const defaults = elementDefaults[type];
  return {
    id: `${type.toLowerCase()}-${crypto.randomUUID()}`,
    type,
    name: `${type} ${current.filter((entry) => entry.type === type).length + 1}`,
    x: Math.max(8, x ?? 260),
    y: Math.max(72, y ?? 260),
    ...defaults,
    content: content ?? defaults.content,
    ...(type === 'Form' ? { form: defaultFormDefinition(content ?? defaults.content) } : {}),
  };
}

function makeDefaultPanels(): PanelsState {
  return {
    elements: { mode: 'docked', minimized: false, x: 96, y: 80, width: ELEMENTS_DEFAULTS.width, height: ELEMENTS_DEFAULTS.height, z: 100 },
    assistant: { mode: 'docked', minimized: false, x: 152, y: 68, width: ASSISTANT_DEFAULTS.width, height: ASSISTANT_DEFAULTS.height, z: 101 },
  };
}

function loadPanels(): PanelsState {
  const defaults = makeDefaultPanels();
  try {
    const raw = window.sessionStorage.getItem(PANELS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PanelsState>;
    return {
      elements: { ...defaults.elements, ...(parsed.elements ?? {}) },
      assistant: { ...defaults.assistant, ...(parsed.assistant ?? {}) },
    };
  } catch {
    return defaults;
  }
}

const EMPTY_LINK: ElementLink = { type: 'none', pageId: '', sectionId: '', url: '', newTab: false };

function computeLayerDepth(elements: CanvasElement[]): Map<string, number> {
  const depth = new Map<string, number>();
  elements.forEach((element) => { if (!element.parentId) depth.set(element.id, 0); });
  let changed = true;
  while (changed) {
    changed = false;
    elements.forEach((element) => {
      if (element.parentId && depth.has(element.parentId) && !depth.has(element.id)) {
        depth.set(element.id, (depth.get(element.parentId) ?? 0) + 1);
        changed = true;
      }
    });
  }
  return depth;
}

export default function ForgeSandbox() {
  const [activeTool, setActiveTool] = useState("Add");
  const [selectedLayer, setSelectedLayer] = useState("Hero");
  const [rightTab, setRightTab] = useState<"ai" | "properties">("ai");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(100);
  const [bottomTab, setBottomTab] = useState("Activity");
  const [prompt, setPrompt] = useState("Turn this hero into two columns and add a booking button");
  const [proposalStatus, setProposalStatus] = useState<"ready" | "applied" | "rejected">("ready");
  const [aiProposal, setAiProposal] = useState<SandboxAiProposal | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("offline");
  const [aiUsage, setAiUsage] = useState<AiUsage>({ mode: "offline", inputTokens: 0, outputTokens: 0, estimatedCostMicros: 0, durationMs: 0 });
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTaskClass, setAiTaskClass] = useState<AiTaskClass>("fast_edit");
  const [aiCreativity, setAiCreativity] = useState<AiCreativity>("balanced");
  const [aiCurrentPageOnly, setAiCurrentPageOnly] = useState(true);
  const [aiPreserveCopy, setAiPreserveCopy] = useState(false);
  const [aiPreserveDesign, setAiPreserveDesign] = useState(true);
  const [aiAccessibilityFirst, setAiAccessibilityFirst] = useState(false);
  const [aiSeoFirst, setAiSeoFirst] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authCheck, setAuthCheck] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [history, setHistory] = useState<EditorHistory>(emptyHistory);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"loading" | "dirty" | "saving" | "local" | "cloud" | "error">("loading");
  const [toast, setToast] = useState<string | null>(null);

  /* ── Version history state ── */
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versionPanelDocked, setVersionPanelDocked] = useState(false);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [versionPanelPos, setVersionPanelPos] = useState({ x: 420, y: 90, width: 400, height: 620 });
  const [versionPanelMinimized, setVersionPanelMinimized] = useState(false);
  const [createCheckpointOpen, setCreateCheckpointOpen] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState<{ entry: VersionEntry } | null>(null);
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null);
  const [previewBlueprint, setPreviewBlueprint] = useState<SandboxDocument | null>(null);
  const [compareState, setCompareState] = useState<{ a: VersionEntry; b: VersionEntry; blueprintA: SandboxDocument | null; blueprintB: SandboxDocument | null } | null>(null);
  const [localVersionCount, setLocalVersionCount] = useState(0);
  const [recoveryData, setRecoveryData] = useState<RecoveryRecord | null>(null);
  const lastChecksumRef = useRef<string | null>(null);

  /* ── Preview, validation & build state ── */
  const [sitePreviewOpen, setSitePreviewOpen] = useState(false);
  const [sitePreviewDoc, setSitePreviewDoc] = useState<SandboxDocument | null>(null);
  const [sitePreviewPageId, setSitePreviewPageId] = useState("");
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [problemsMinimized, setProblemsMinimized] = useState(false);
  const [problemsPos, setProblemsPos] = useState({ x: 380, y: 90, width: 480, height: 640 });
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildMinimized, setBuildMinimized] = useState(false);
  const [buildPos, setBuildPos] = useState({ x: 380, y: 90, width: 460, height: 620 });
  const [buildDoc, setBuildDoc] = useState<SandboxDocument | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishMinimized, setPublishMinimized] = useState(false);
  const [publishPos, setPublishPos] = useState({ x: 340, y: 70, width: 560, height: 640 });

  /* ── Design system state ── */
  const [theme, setTheme] = useState<ThemeDefinition>(defaultTheme);
  const [designOpen, setDesignOpen] = useState(false);
  const [designMinimized, setDesignMinimized] = useState(false);
  const [designPos, setDesignPos] = useState({ x: 320, y: 60, width: 540, height: 660 });

  /* ── Team collaboration state ── */
  const [role, setRole] = useState<MemberRole | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamMinimized, setTeamMinimized] = useState(false);
  const [teamPos, setTeamPos] = useState({ x: 340, y: 70, width: 560, height: 660 });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMinimized, setCommentsMinimized] = useState(false);
  const [commentsPos, setCommentsPos] = useState({ x: 400, y: 90, width: 440, height: 620 });
  const [presence, setPresence] = useState<PresenceState[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewVersionNumber, setReviewVersionNumber] = useState<number | null>(null);
  const [conflictState, setConflictState] = useState<{ baseUpdatedAt: string; remoteUpdatedAt: string } | null>(null);
  const baseUpdatedAtRef = useRef<string | null>(null);
  const presenceSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);

  /* ── Billing & usage state ── */
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageMinimized, setUsageMinimized] = useState(false);
  const [usagePos, setUsagePos] = useState({ x: 360, y: 70, width: 600, height: 680 });
  const [pageLimitBlock, setPageLimitBlock] = useState<PageLimitResult | null>(null);

  /* ── AI orchestration state ── */
  const [aiScope, setAiScope] = useState("page");
  const [preferredModel, setPreferredModel] = useState("");
  const [localOnly, setLocalOnly] = useState(false);
  const [aiJobsOpen, setAiJobsOpen] = useState(false);
  const [aiJobsMinimized, setAiJobsMinimized] = useState(false);
  const [aiJobsPos, setAiJobsPos] = useState({ x: 380, y: 80, width: 520, height: 640 });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesMinimized, setTemplatesMinimized] = useState(false);
  const [templatesPos, setTemplatesPos] = useState({ x: 320, y: 60, width: 720, height: 720 });
  const [projectId, setProjectId] = useState("");

  /* ── Multi-page state ── */
  const [projectName, setProjectName] = useState("Portfolio Website");
  const [pages, setPages] = useState<SandboxPage[]>([]);
  const [activePageId, setActivePageId] = useState("");
  const [pageHistories, setPageHistories] = useState<Record<string, EditorHistory>>({});
  const [globalSections, setGlobalSections] = useState<GlobalSections>({ header: [], footer: [], navigation: [] });

  /* ── Dialogs ── */
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SandboxPage | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<{ page: SandboxPage; incoming: number } | null>(null);
  const [deleteReplacementId, setDeleteReplacementId] = useState("");

  /* ── Preview mode ── */
  const [previewMode, setPreviewMode] = useState(false);
  const [previewStack, setPreviewStack] = useState<string[]>([]);
  const [previewCursor, setPreviewCursor] = useState(-1);

  /* ── Components state ── */
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [createComponentOpen, setCreateComponentOpen] = useState(false);
  const [masterEditComponent, setMasterEditComponent] = useState<ComponentDefinition | null>(null);
  const [multiSelectIds, setMultiSelectIds] = useState<string[]>([]);
  const [deleteComponentPrompt, setDeleteComponentPrompt] = useState<{ component: ComponentDefinition; instances: number; pages: string[] } | null>(null);

  const [replacePrompt, setReplacePrompt] = useState<{ elementId: string; assetId: string; newRef: CanvasAssetRef } | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const pendingReplaceElementRef = useRef<string | null>(null);

  const [panels, setPanels] = useState<PanelsState>(loadPanels);
  const [focusedPanel, setFocusedPanel] = useState<PanelId | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const zRef = useRef(102);

  const artboardWidth = useMemo(() => viewport === "mobile" ? "390px" : viewport === "tablet" ? "760px" : "900px", [viewport]);
  const selectedElement = useMemo(() => history.present.find((element) => element.id === selectedElementId) ?? null, [history.present, selectedElementId]);
  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0] ?? null, [pages, activePageId]);
  const elementsTitle = activeTool === "Add" ? "Add elements" : activeTool;
  const hasUnconfiguredForms = useMemo(() => pages.some((page) => page.elements.some((element) => element.type === "Form")), [pages]);
  const readOnly = reviewMode || (role !== null && !can(role, "edit_canvas"));

  const previewPageId = previewCursor >= 0 ? previewStack[previewCursor] : activePageId;
  const previewPage = pages.find((page) => page.id === previewPageId);
  const displayElements = previewMode ? (previewPage?.elements ?? []) : history.present;
  const chromePage = previewMode ? previewPage : activePage;

  useEffect(() => {
    let active = true;
    void loadSandboxDocument().then((document) => {
      if (!active) return;
      if (document) {
        setProjectName(document.projectName);
        setPages(document.pages);
        setActivePageId(document.activePageId);
        setGlobalSections(document.globalSections);
        setComponents(document.components);
        setTheme(document.theme ?? defaultTheme());
        const initialPage = document.pages.find((page) => page.id === document.activePageId) ?? document.pages[0];
        setHistory({ past: [], present: initialPage?.elements ?? [], future: [] });
        setSelectedLayer(initialPage?.name ?? "Home");
        setViewport(document.viewport);
        lastChecksumRef.current = checksumDocument(document);
      }
      setSaveStatus(document ? "local" : "dirty");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const rec = loadRecovery();
    if (rec) setRecoveryData(rec);
  }, []);

  useEffect(() => {
    void resolveSandboxProject().then((resolved) => { if (resolved) setProjectId(resolved.projectId); });
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(panels)); } catch { /* storage unavailable */ }
  }, [panels]);

  useEffect(() => {
    const supabase = getSandboxClient();
    if (!supabase) { setAuthStatus("unauthenticated"); return; }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data.session?.user ?? null;
      setAuthStatus(user ? "authenticated" : "unauthenticated");
      setAuthEmail(user?.email ?? null);
    }).catch(() => {
      if (active) setAuthStatus("unauthenticated");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      setAuthStatus(user ? "authenticated" : "unauthenticated");
      setAuthEmail(user?.email ?? null);
      if (user) setAuthCheck(null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let active = true;
    void ensureOwnerMembership().then((r) => { if (active) setRole(r); });
    void listComments().then((rows) => { if (active) setComments(rows); });
    void resolveSandboxProject().then((resolved) => {
      if (!active || !resolved) return;
      void fetchRemoteBlueprintUpdatedAt().then((updatedAt) => {
        if (active && updatedAt) baseUpdatedAtRef.current = updatedAt;
      });
      const supabase = getSandboxClient();
      if (!supabase) return;
      void supabase.auth.getUser().then(({ data }) => {
        if (!active || !data.user) return;
        const email = data.user.email ?? "";
        const name = email.split("@")[0] ?? "Member";
        const initials = (email.slice(0, 2) || "U").toUpperCase();
        presenceSubRef.current = subscribePresence(
          resolved.projectId,
          { userId: data.user.id, name, initials, email },
          (presences) => { if (active) setPresence(presences.filter((p) => p.userId !== data.user.id)); },
        );
      });
    });
    return () => {
      active = false;
      presenceSubRef.current?.unsubscribe();
      presenceSubRef.current = null;
    };
  }, [authStatus]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !focusedPanel) return;
      setPanels((current) => {
        const panel = current[focusedPanel];
        if (panel.mode !== "floating" || panel.minimized) return current;
        return { ...current, [focusedPanel]: { ...panel, minimized: true } };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedPanel]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const guardPageCreation = async (extraPages: number): Promise<boolean> => {
    const resolved = await resolveSandboxProject().catch(() => null);
    if (!resolved) return true;
    const result = await checkPageLimit(resolved.projectId, extraPages);
    if (!result || result.allowed) return true;
    setPageLimitBlock(result);
    return false;
  };

  /* ─── Canvas element commits (active page) ─── */

  const syncActivePageElements = (elements: CanvasElement[]) => {
    setPages((current) => current.map((page) => page.id === activePageId ? { ...page, elements, updatedAt: new Date().toISOString() } : page));
  };

  const commitElements = (next: CanvasElement[] | ((current: CanvasElement[]) => CanvasElement[])) => {
    const currentElements = history.present;
    const resolved = typeof next === "function" ? next(currentElements) : next;
    setHistory({ past: [...history.past, currentElements].slice(-50), present: resolved, future: [] });
    syncActivePageElements(resolved);
    setSaveStatus("dirty");
  };

  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({ past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] });
    syncActivePageElements(previous);
    setSaveStatus("dirty");
  };

  const redo = () => {
    const next = history.future[0];
    if (!next) return;
    setHistory({ past: [...history.past, history.present], present: next, future: history.future.slice(1) });
    syncActivePageElements(next);
    setSaveStatus("dirty");
  };

  /* ─── Page operations ─── */

  const switchPage = (pageId: string) => {
    if (pageId === activePageId) return;
    setPageHistories((current) => ({ ...current, [activePageId]: history }));
    const target = pages.find((page) => page.id === pageId);
    if (!target) return;
    const saved = pageHistories[pageId];
    const nextHistory = saved ?? { past: [], present: target.elements, future: [] };
    setActivePageId(pageId);
    setHistory(nextHistory);
    if (selectedElementId && !target.elements.some((element) => element.id === selectedElementId)) {
      setSelectedElementId(null);
    }
    setSelectedLayer(target.name);
  };

  const createPage = async (input: { name: string; slug: string; type: PageType; addToNavigation: boolean }) => {
    const check = validateSlug(input.slug, pages.map((page) => page.slug));
    if (!check.ok) { notify(check.error ?? "Invalid slug"); return; }
    if (!(await guardPageCreation(1))) return;
    const newPage = makeNewPage(input.name, input.slug, input.type, projectName);
    setPageHistories((current) => ({ ...current, [activePageId]: history }));
    setPages((current) => [...current, newPage]);
    if (input.addToNavigation) {
      setGlobalSections((current) => ({ ...current, navigation: [...current.navigation, navigationItemForPage(newPage)] }));
    }
    setActivePageId(newPage.id);
    setHistory({ past: [], present: newPage.elements, future: [] });
    setSelectedElementId(null);
    setSelectedLayer(newPage.name);
    setCreatePageOpen(false);
    setSaveStatus("dirty");
    notify(`Page “${newPage.name}” created`);
    void recordVersion("page", { changeSummary: `Added ${newPage.name} page` });
  };

  const duplicatePageHandler = async (page: SandboxPage) => {
    if (!(await guardPageCreation(1))) return;
    const copy = duplicatePage(page);
    copy.slug = suggestSlug(copy.slug === "/" ? "/page" : copy.slug, pages.map((entry) => entry.slug));
    setPageHistories((current) => ({ ...current, [activePageId]: history }));
    setPages((current) => [...current, copy]);
    setActivePageId(copy.id);
    setHistory({ past: [], present: copy.elements, future: [] });
    setSelectedElementId(null);
    setSelectedLayer(copy.name);
    setSaveStatus("dirty");
    notify(`Page duplicated as “${copy.name}”`);
  };

  const renamePageHandler = (page: SandboxPage, name: string) => {
    setPages((current) => current.map((entry) => entry.id === page.id ? { ...entry, name, updatedAt: new Date().toISOString() } : entry));
    if (page.id === activePageId) setSelectedLayer(name);
    setSaveStatus("dirty");
    notify("Page renamed");
  };

  const setHomepageHandler = (page: SandboxPage) => {
    if (page.isHome) return;
    const prevHome = pages.find((entry) => entry.isHome);
    const otherSlugs = pages.filter((entry) => entry.id !== page.id && entry.id !== prevHome?.id).map((entry) => entry.slug);
    const prevHomeSlug = prevHome ? suggestSlug(slugify(prevHome.name) || "/home", otherSlugs) : "";
    setPages((current) => current.map((entry) => {
      if (entry.id === page.id) return { ...entry, isHome: true, slug: "/", updatedAt: new Date().toISOString() };
      if (entry.id === prevHome?.id) return { ...entry, isHome: false, slug: prevHomeSlug, updatedAt: new Date().toISOString() };
      return entry;
    }));
    setSaveStatus("dirty");
    notify(`${page.name} is now the homepage`);
  };

  const toggleNavigationHandler = (page: SandboxPage) => {
    if (page.showInNavigation) {
      setGlobalSections((current) => ({ ...current, navigation: current.navigation.filter((item) => !(item.type === "page" && item.pageId === page.id)) }));
    } else {
      setGlobalSections((current) => ({ ...current, navigation: [...current.navigation, navigationItemForPage(page)] }));
    }
    setPages((current) => current.map((entry) => entry.id === page.id ? { ...entry, showInNavigation: !entry.showInNavigation } : entry));
    setSaveStatus("dirty");
    notify(page.showInNavigation ? "Removed from navigation" : "Added to navigation");
  };

  const movePageHandler = (pageId: string, direction: -1 | 1) => {
    const index = pages.findIndex((entry) => entry.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= pages.length) return;
    const next = [...pages];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setPages(next);
    setSaveStatus("dirty");
  };

  const copyPageUrlHandler = async (page: SandboxPage) => {
    const url = `https://yoursite.com${page.slug === "/" ? "" : page.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Page URL copied");
    } catch {
      notify(url);
    }
  };

  const savePageSettingsHandler = (updates: Partial<SandboxPage>) => {
    if (!settingsPage) return;
    setPages((current) => current.map((entry) => entry.id === settingsPage.id ? { ...entry, ...updates, updatedAt: new Date().toISOString() } : entry));
    if (settingsPage.id === activePageId) setSelectedLayer(updates.name ?? settingsPage.name);
    setSaveStatus("dirty");
    notify("Page settings saved");
  };

  const onNavigationChange = (items: NavigationItem[]) => {
    setGlobalSections((current) => ({ ...current, navigation: items }));
    setSaveStatus("dirty");
  };

  const requestDeletePage = (page: SandboxPage) => {
    const incoming = countIncomingLinks(page.id, pages, globalSections.navigation);
    setDeleteReplacementId("");
    setDeletePrompt({ page, incoming });
  };

  const confirmDeletePage = (mode: "cancel" | "remove" | "redirect") => {
    const target = deletePrompt;
    setDeletePrompt(null);
    if (!target || mode === "cancel") return;
    const { page } = target;
    let nextPages = pages.filter((entry) => entry.id !== page.id);
    let nextNav = [...globalSections.navigation];

    if (mode === "remove") {
      nextNav = nextNav.filter((item) => !(item.type === "page" && item.pageId === page.id));
      nextPages = nextPages.map((entry) => ({ ...entry, elements: entry.elements.filter((element) => !(element.link?.type === "page" && element.link.pageId === page.id)) }));
    } else if (mode === "redirect" && deleteReplacementId) {
      nextNav = nextNav.map((item) => item.type === "page" && item.pageId === page.id ? { ...item, pageId: deleteReplacementId } : item);
      nextPages = nextPages.map((entry) => ({ ...entry, elements: entry.elements.map((element) => element.link?.type === "page" && element.link.pageId === page.id ? { ...element, link: { ...element.link, pageId: deleteReplacementId } } : element) }));
    }

    let nextActiveId = activePageId;
    if (activePageId === page.id) {
      nextActiveId = (nextPages.find((entry) => entry.isHome) ?? nextPages[0])?.id ?? "";
    }

    setPages(nextPages);
    setGlobalSections({ ...globalSections, navigation: nextNav });
    if (nextActiveId !== activePageId && nextActiveId) {
      const nextActive = nextPages.find((entry) => entry.id === nextActiveId);
      setActivePageId(nextActiveId);
      setHistory({ past: [], present: nextActive?.elements ?? [], future: [] });
      setSelectedElementId(null);
      setSelectedLayer(nextActive?.name ?? "");
    }
    setSaveStatus("dirty");
    notify(`Page “${page.name}” deleted`);
    void recordVersion("page", { changeSummary: `Deleted page ${page.name}` });
  };

  /* ─── AI page operations ─── */

  const applyPageOperations = (operations: SandboxPageOperation[]) => {
    let nextPages = pages;
    let nextNav = [...globalSections.navigation];
    let nextFooter = [...globalSections.footer];
    let switchTo: string | null = null;

    operations.forEach((operation) => {
      if (operation.kind === "createPage") {
        const slugs = nextPages.map((entry) => entry.slug);
        const slug = operation.slug ?? suggestSlug(slugify(operation.name), slugs);
        const page = makeNewPage(operation.name, slug, operation.pageType ?? "standard", projectName);
        nextPages = [...nextPages, page];
        nextNav = [...nextNav, navigationItemForPage(page)];
        switchTo = page.id;
      } else if (operation.kind === "duplicatePage") {
        const source = nextPages.find((entry) => entry.id === operation.pageId);
        if (source) {
          const copy = duplicatePage(source);
          copy.slug = suggestSlug(copy.slug === "/" ? "/page" : copy.slug, nextPages.map((entry) => entry.slug));
          nextPages = [...nextPages, copy];
          switchTo = copy.id;
        }
      } else if (operation.kind === "renamePage") {
        nextPages = nextPages.map((entry) => entry.id === operation.pageId ? { ...entry, name: operation.name } : entry);
      } else if (operation.kind === "setPageSlug") {
        const check = validateSlug(operation.slug, nextPages.filter((entry) => entry.id !== operation.pageId).map((entry) => entry.slug));
        if (check.ok) nextPages = nextPages.map((entry) => entry.id === operation.pageId ? { ...entry, slug: operation.slug } : entry);
      } else if (operation.kind === "setHomepage") {
        const prevHome = nextPages.find((entry) => entry.isHome);
        const others = nextPages.filter((entry) => entry.id !== operation.pageId && entry.id !== prevHome?.id).map((entry) => entry.slug);
        const prevSlug = prevHome ? suggestSlug(slugify(prevHome.name) || "/home", others) : "";
        nextPages = nextPages.map((entry) => entry.id === operation.pageId ? { ...entry, isHome: true, slug: "/" } : entry.id === prevHome?.id ? { ...entry, isHome: false, slug: prevSlug } : entry);
      } else if (operation.kind === "addToNavigation") {
        const page = nextPages.find((entry) => entry.id === operation.pageId);
        if (page && !nextNav.some((item) => item.type === "page" && item.pageId === page.id)) {
          nextNav = [...nextNav, navigationItemForPage(page)];
        }
        nextPages = nextPages.map((entry) => entry.id === operation.pageId ? { ...entry, showInNavigation: true } : entry);
      } else if (operation.kind === "removeFromNavigation") {
        nextNav = nextNav.filter((item) => !(item.type === "page" && item.pageId === operation.pageId));
        nextPages = nextPages.map((entry) => entry.id === operation.pageId ? { ...entry, showInNavigation: false } : entry);
      } else if (operation.kind === "addGlobalFooter") {
        nextFooter = [buildTemplateElement({ type: "Container", name: "Global footer", content: "Footer", x: 20, y: 540, width: 860, height: 120 })];
      } else if (operation.kind === "linkElementToPage") {
        nextPages = nextPages.map((entry) => ({ ...entry, elements: entry.elements.map((element) => element.id === operation.elementId ? { ...element, link: { type: "page", pageId: operation.pageId, sectionId: "", url: "", newTab: false } } : element) }));
      }
    });

    setPages(nextPages);
    setGlobalSections({ ...globalSections, navigation: nextNav, footer: nextFooter });
    setSaveStatus("dirty");

    if (switchTo) {
      setPageHistories((current) => ({ ...current, [activePageId]: history }));
      const target = nextPages.find((entry) => entry.id === switchTo);
      setActivePageId(switchTo);
      setHistory({ past: [], present: target?.elements ?? [], future: [] });
      setSelectedElementId(null);
      setSelectedLayer(target?.name ?? "");
    }
  };

  /* ─── Preview mode ─── */

  const enterPreview = () => {
    setPreviewStack([activePageId]);
    setPreviewCursor(0);
    setPreviewMode(true);
    notify("Preview mode — use navigation to move between pages");
  };

  const navigatePreview = (pageId: string) => {
    setPreviewStack((current) => {
      const next = [...current.slice(0, previewCursor + 1), pageId];
      setPreviewCursor(next.length - 1);
      return next;
    });
  };

  const previewBack = () => { if (previewCursor > 0) setPreviewCursor(previewCursor - 1); };
  const previewForward = () => { if (previewCursor < previewStack.length - 1) setPreviewCursor(previewCursor + 1); };
  const exitPreview = () => { setPreviewMode(false); setPreviewStack([]); setPreviewCursor(-1); };

  /* ─── Save & versions ─── */

  const buildDocument = (): SandboxDocument => {
    const latestPages = pages.map((page) => page.id === activePageId ? { ...page, elements: history.present } : page);
    return {
      schemaVersion: 4,
      projectName,
      activePageId,
      pages: latestPages,
      globalSections,
      components,
      componentOrder: components.map((component) => component.id),
      componentCategories: [...COMPONENT_CATEGORIES],
      theme,
      viewport,
      updatedAt: new Date().toISOString(),
    };
  };

  const recordVersion = async (source: VersionSource, opts: Omit<SnapshotOptions, "source"> = {}, force = false) => {
    const document = buildDocument();
    const checksum = checksumDocument(document);
    if (!force && lastChecksumRef.current === checksum) return { checksum, skipped: true };
    const result = await snapshotVersion(document, { ...opts, source });
    lastChecksumRef.current = checksum;
    if (result.versionNumber) setCurrentVersionNumber(result.versionNumber);
    return result;
  };

  const refreshVersions = async () => {
    setVersionLoading(true);
    const historyList = await listVersionHistory();
    setVersions(historyList);
    setLocalVersionCount(historyList.filter((entry) => entry.local).length);
    const cloudMax = historyList.filter((entry) => !entry.local).reduce((max, entry) => Math.max(max, entry.versionNumber), 0);
    if (cloudMax > 0) setCurrentVersionNumber(cloudMax);
    setVersionLoading(false);
  };

  const openVersionHistory = () => {
    setVersionHistoryOpen(true);
    setBottomTab("Changes");
    void refreshVersions();
  };

  const applyDocumentToState = (doc: SandboxDocument) => {
    setProjectName(doc.projectName);
    setPages(doc.pages);
    setActivePageId(doc.activePageId);
    setGlobalSections(doc.globalSections);
    setComponents(doc.components);
    setTheme(doc.theme ?? defaultTheme());
    const page = doc.pages.find((entry) => entry.id === doc.activePageId) ?? doc.pages[0];
    setPageHistories({});
    setHistory({ past: [], present: page?.elements ?? [], future: [] });
    setSelectedElementId(null);
    setSelectedLayer(page?.name ?? "");
    setViewport(doc.viewport);
    setSaveStatus("dirty");
  };

  const previewVersionHandler = async (entry: VersionEntry) => {
    setPreviewVersion(entry);
    setPreviewBlueprint(null);
    const bp = await getVersionBlueprint(entry);
    setPreviewBlueprint(bp);
  };

  const openCompare = async (a: VersionEntry, b: VersionEntry) => {
    const [bpA, bpB] = await Promise.all([getVersionBlueprint(a), getVersionBlueprint(b)]);
    setCompareState({ a, b, blueprintA: bpA, blueprintB: bpB });
  };

  const requestRestore = (entry: VersionEntry) => {
    setRestorePrompt({ entry });
  };

  const confirmRestore = async (mode: RestoreMode, targetId?: string) => {
    const prompt = restorePrompt;
    setRestorePrompt(null);
    if (!prompt) return;
    const bp = await getVersionBlueprint(prompt.entry);
    if (!bp) { notify("Could not load version blueprint"); return; }

    await recordVersion("restore", { changeSummary: `Before restoring v${prompt.entry.versionNumber}`, parentVersionId: prompt.entry.id }, true);

    if (mode === "full") {
      applyDocumentToState(bp);
      await recordVersion("restore", { restoredFromVersionId: prompt.entry.id, changeSummary: `Restored entire project from v${prompt.entry.versionNumber}` }, true);
      notify(`Restored v${prompt.entry.versionNumber}`);
      void refreshVersions();
      return;
    }

    if (mode === "page" && targetId) {
      const current = pages.find((page) => page.id === targetId);
      const source = bp.pages.find((page) => page.id === targetId)
        ?? bp.pages.find((page) => current && page.slug === current.slug)
        ?? bp.pages.find((page) => current && page.name === current.name);
      if (!current || !source) { notify("Could not map page for restore"); return; }
      const remapped = source.elements.map((element) => ({ ...element, id: crypto.randomUUID(), parentId: undefined }));
      setPages((cur) => cur.map((page) => page.id === targetId ? { ...page, elements: remapped, seo: source.seo, updatedAt: new Date().toISOString() } : page));
      if (activePageId === targetId) setHistory({ past: [], present: remapped, future: [] });
      setSaveStatus("dirty");
      await recordVersion("restore", { restoredFromVersionId: prompt.entry.id, changeSummary: `Restored page ${current.name} from v${prompt.entry.versionNumber}` }, true);
      notify(`Restored page ${current.name}`);
      return;
    }

    if (mode === "component" && targetId) {
      const source = bp.components.find((component) => component.id === targetId);
      if (!source) { notify("Component not found in version"); return; }
      const copy: ComponentDefinition = { ...source, id: crypto.randomUUID(), builtIn: false, elements: source.elements.map((element) => ({ ...element })), variants: source.variants.map((variant) => ({ ...variant })), exposedProperties: source.exposedProperties.map((prop) => ({ ...prop })) };
      setComponents((cur) => [...cur, copy]);
      setSaveStatus("dirty");
      await recordVersion("restore", { restoredFromVersionId: prompt.entry.id, changeSummary: `Restored component ${source.name} from v${prompt.entry.versionNumber}` }, true);
      notify(`Restored component ${source.name}`);
      return;
    }

    if (mode === "global") {
      setGlobalSections(bp.globalSections);
      setSaveStatus("dirty");
      await recordVersion("restore", { restoredFromVersionId: prompt.entry.id, changeSummary: `Restored global sections from v${prompt.entry.versionNumber}` }, true);
      notify("Restored global sections");
    }
  };

  const handleCheckpoint = (input: { name: string; description: string; tag: string; releaseCandidate: boolean }) => {
    void recordVersion("manual", { label: input.name, description: input.description, isCheckpoint: true, changeSummary: input.name, metadata: { tag: input.tag, releaseCandidate: input.releaseCandidate } }, true)
      .then(() => { notify("Checkpoint saved"); void refreshVersions(); });
  };

  const syncLocalHistory = async () => {
    const local = versions.filter((entry) => entry.local);
    if (!local.length) return notify("No local history to sync");
    const supabase = getSandboxClient();
    if (!supabase) return notify("Sign in to sync local history");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return notify("Sign in to sync local history");
    for (const entry of local) {
      if (entry.blueprint) {
        await snapshotVersion(entry.blueprint, { source: entry.source, label: entry.label, description: entry.description, isCheckpoint: entry.isCheckpoint, changeSummary: entry.changeSummary });
      }
    }
    await clearLocalVersions();
    await refreshVersions();
    notify(`Synced ${local.length} version${local.length === 1 ? "" : "s"}`);
  };

  const recoverFromCrash = () => {
    if (!recoveryData) return;
    applyDocumentToState(recoveryData.document);
    clearRecovery();
    setRecoveryData(null);
    notify("Recovered unsaved work");
  };

  const discardRecovery = () => {
    clearRecovery();
    setRecoveryData(null);
    notify("Recovery copy discarded");
  };

  const saveProject = async () => {
    const document = buildDocument();
    setSaveStatus("saving");
    try {
      const result = await saveSandboxDocument(document);
      setSaveStatus(result.storage);
      baseUpdatedAtRef.current = document.updatedAt;
      await recordVersion("manual", { changeSummary: "Manual save" });
      notify(result.storage === "cloud" ? "Saved to Supabase" : "Saved locally — sign in for cloud sync");
    } catch {
      setSaveStatus("error");
      notify("Local save complete; cloud sync needs attention");
    }
  };

  const saveProjectWithConflictCheck = async () => {
    if (!baseUpdatedAtRef.current) { void saveProject(); return; }
    const remoteUpdatedAt = await fetchRemoteBlueprintUpdatedAt();
    const conflict = detectSaveConflict(baseUpdatedAtRef.current, remoteUpdatedAt);
    if (conflict.hasConflict) {
      setConflictState({ baseUpdatedAt: conflict.baseUpdatedAt, remoteUpdatedAt: conflict.remoteUpdatedAt });
      return;
    }
    void saveProject();
  };

  const resolveConflictReload = async () => {
    setConflictState(null);
    const remote = await loadSandboxDocument();
    if (remote) {
      applyDocumentToState(remote);
      baseUpdatedAtRef.current = remote.updatedAt;
      notify("Reloaded the latest version — your local changes are preserved in history");
    } else {
      notify("Could not load the latest version");
    }
  };

  const resolveConflictOverwrite = async () => {
    setConflictState(null);
    baseUpdatedAtRef.current = new Date().toISOString();
    void saveProject();
  };

  const enterReview = (versionNumber: number) => {
    setReviewMode(true);
    setReviewVersionNumber(versionNumber);
    setTeamOpen(false);
    notify(`Review mode — viewing v${versionNumber} read-only`);
  };

  const exitReview = () => {
    setReviewMode(false);
    setReviewVersionNumber(null);
  };

  const decideReview = async (decision: "approved" | "changes_requested") => {
    if (reviewVersionNumber == null) return;
    const approvals = await listApprovals();
    const pending = approvals.find((a) => a.versionNumber === reviewVersionNumber && a.status === "awaiting_review");
    if (!pending) { notify("No pending approval request for this version"); return; }
    const result = await decideApproval(pending.id, decision);
    notify(result.message);
    exitReview();
  };

  const focusComment = (pageId: string | null, elementId: string | null) => {
    if (pageId && pageId !== activePageId) switchPage(pageId);
    if (elementId) {
      const page = pages.find((p) => p.elements.some((e) => e.id === elementId));
      const element = page?.elements.find((e) => e.id === elementId);
      setSelectedElementId(elementId);
      if (element) setSelectedLayer(element.name);
    }
    setCommentsOpen(true);
    setCommentsMinimized(false);
  };

  useEffect(() => {
    if (saveStatus === "loading") return;
    const timer = window.setTimeout(() => { saveRecovery(buildDocument()); }, 2000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, pages, globalSections, components]);

  useEffect(() => {
    if (saveStatus === "loading") return;
    const checksum = checksumDocument(buildDocument());
    if (checksum === lastChecksumRef.current) return;
    const timer = window.setTimeout(() => { void recordVersion("autosave"); }, 60000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, pages, globalSections, components]);

  /* ─── Preview, validation & build ─── */

  const computeValidation = (): ValidationResult => {
    const document = buildDocument();
    return validateBlueprint(document, useAssetStore.getState().assets);
  };

  const runValidation = () => {
    setValidationLoading(true);
    const result = computeValidation();
    setValidationResult(result);
    setValidationLoading(false);
  };

  const openProblems = () => {
    setProblemsOpen(true);
    setBottomTab("Problems");
    runValidation();
  };

  const openSitePreview = () => {
    setSitePreviewDoc(buildDocument());
    setSitePreviewPageId(activePageId);
    setSitePreviewOpen(true);
  };

  const openBuild = () => {
    const document = buildDocument();
    setBuildDoc(document);
    setValidationResult(validateBlueprint(document, useAssetStore.getState().assets));
    setBuildOpen(true);
  };

  const selectIssueElement = (elementId?: string) => {
    if (!elementId) return;
    const page = pages.find((entry) => entry.elements.some((element) => element.id === elementId));
    if (!page) { notify("Element not found"); return; }
    if (page.id !== activePageId) switchPage(page.id);
    setSelectedElementId(elementId);
    setSelectedLayer(page.elements.find((element) => element.id === elementId)?.name ?? page.name);
    setProblemsOpen(false);
  };

  const askAiToFix = (issueItem: ValidationIssue) => {
    setPrompt(`Fix this issue: ${issueItem.message} ${issueItem.fix}`);
    setProblemsOpen(false);
    setRightTab("ai");
    dockPanel("assistant");
    notify("Instruction added to the AI Assistant");
  };

  const createBuildCheckpoint = async () => {
    try {
      const result = await recordVersion("publish", { label: "Build checkpoint", isCheckpoint: true, changeSummary: "Before build" }, true);
      if (result.versionNumber) setCurrentVersionNumber(result.versionNumber);
      await refreshVersions();
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not create the build checkpoint" };
    }
  };

  const ensurePublishCheckpoint = async (): Promise<{ versionId: string | null; versionNumber: number | null }> => {
    const result = await recordVersion("publish", { label: "Before publish", isCheckpoint: true, changeSummary: "Publish checkpoint" }, true);
    if (result.versionNumber) setCurrentVersionNumber(result.versionNumber);
    await refreshVersions();
    return { versionId: result.id ?? null, versionNumber: result.versionNumber ?? null };
  };

  const openPublish = () => {
    setValidationResult(validateBlueprint(buildDocument(), useAssetStore.getState().assets));
    setPublishOpen(true);
  };

  const applyTheme = async (next: ThemeDefinition) => {
    const summary = summarizeThemeChange(theme, next);
    setTheme(next);
    setSaveStatus("dirty");
    await recordVersion("theme", { changeSummary: summary }, true);
  };

  const openDesign = () => {
    setDesignOpen(true);
    setDesignMinimized(false);
  };

  /* ─── Drag & drop ─── */

  const startDrag = (event: DragEvent, name: string) => {
    event.dataTransfer.setData("text/forge-element", name);
    event.dataTransfer.effectAllowed = "copy";
    setDragging(name);
  };

  const dropElement = (event: DragEvent) => {
    event.preventDefault();
    const frame = event.currentTarget.getBoundingClientRect();
    const scale = zoom / 100;
    const x = Math.max(8, Math.round((event.clientX - frame.left) / scale));
    const y = Math.max(72, Math.round((event.clientY - frame.top) / scale));
    const movingId = event.dataTransfer.getData("text/forge-instance");

    if (movingId) {
      commitElements((current) => current.map((element) => element.id === movingId
        ? { ...element, x: Math.max(8, x - element.width / 2), y: Math.max(72, y - element.height / 2) }
        : element));
      setSelectedElementId(movingId);
      notify("Element moved");
      return;
    }

    const assetId = event.dataTransfer.getData("text/forge-asset");
    if (assetId) {
      const asset = useAssetStore.getState().assets.find((entry) => entry.id === assetId);
      if (asset) {
        const size = assetElementSize(asset);
        const element = makeAssetElement(
          asset,
          history.present,
          Math.min(900 - size.width - 8, Math.max(8, x - size.width / 2)),
          Math.max(72, y - size.height / 2),
        );
        commitElements((current) => [...current, element]);
        setSelectedLayer(element.name);
        setSelectedElementId(element.id);
        notify(`${asset.name} added to the canvas`);
      }
      return;
    }

    const componentId = event.dataTransfer.getData("text/forge-component");
    if (componentId) {
      addComponentToCanvas(componentId, Math.max(8, x), Math.max(72, y));
      return;
    }

    const item = (event.dataTransfer.getData("text/forge-element") || dragging) as CanvasElementKind;
    if (!item || !elementDefaults[item]) return;
    const defaults = elementDefaults[item];
    const element = makeCanvasElement(
      item,
      history.present,
      defaults.content,
      Math.min(900 - defaults.width - 8, Math.max(8, x - defaults.width / 2)),
      Math.max(72, y - defaults.height / 2),
    );
    commitElements((current) => [...current, element]);
    setDragging(null);
    setSelectedLayer(element.name);
    setSelectedElementId(element.id);
    notify(`${item} added to the page`);
  };

  const updateSelected = (patch: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    commitElements((current) => current.map((element) => element.id === selectedElementId ? { ...element, ...patch } : element));
  };

  const deleteSelected = () => {
    if (!selectedElementId) return notify("Select a dropped element to delete it");
    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      history.present.forEach((element) => { if (element.parentId === id) collect(element.id); });
    };
    collect(selectedElementId);
    commitElements((current) => current.filter((element) => !toDelete.has(element.id)));
    setSelectedElementId(null);
    setSelectedLayer(activePage?.name ?? "Page");
    notify("Element deleted");
  };

  const duplicateSelected = () => {
    if (!selectedElement) return notify("Select a dropped element to duplicate it");
    const copy = { ...selectedElement, id: `${selectedElement.type.toLowerCase()}-${crypto.randomUUID()}`, name: `${selectedElement.name} copy`, x: selectedElement.x + 18, y: selectedElement.y + 18 };
    commitElements((current) => [...current, copy]);
    setSelectedElementId(copy.id);
    setSelectedLayer(copy.name);
    notify("Element duplicated");
  };

  const addAssetToCanvas = (asset: AssetRecord) => {
    const element = makeAssetElement(asset, history.present);
    commitElements((current) => [...current, element]);
    setSelectedLayer(element.name);
    setSelectedElementId(element.id);
    notify(`${asset.name} added to the canvas`);
  };

  const removeElementsByAsset = (assetId: string) => {
    commitElements((current) => current.filter((element) => element.asset?.assetId !== assetId));
  };

  const markMissingAsset = (assetId: string) => {
    commitElements((current) => current.map((element) => element.asset?.assetId === assetId ? { ...element, asset: { ...element.asset, url: "" } } : element));
  };

  const replaceAssetFileOnCanvas = (assetId: string, newUrl: string) => {
    commitElements((current) => current.map((element) => element.asset?.assetId === assetId ? { ...element, asset: { ...element.asset, url: newUrl } } : element));
  };

  const requestReplaceElement = (element: CanvasElement) => {
    pendingReplaceElementRef.current = element.id;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileSelected = async (file: File | undefined) => {
    const elementId = pendingReplaceElementRef.current;
    pendingReplaceElementRef.current = null;
    if (!elementId || !file) return;
    const element = history.present.find((entry) => entry.id === elementId);
    if (!element) return;
    const result = await uploadSingleFile(file);
    if (!result.asset) { notify(result.error ?? "Replace failed"); return; }
    const newRef = defaultAssetRef(result.asset);
    const reusedCount = history.present.filter((entry) => entry.asset?.assetId === element.asset?.assetId).length;
    if (reusedCount > 1 && element.asset) {
      setReplacePrompt({ elementId, assetId: element.asset.assetId, newRef });
    } else {
      commitElements((current) => current.map((entry) => entry.id === elementId ? { ...entry, asset: newRef } : entry));
      notify("Replaced");
    }
  };

  const confirmReplacePrompt = (mode: "everywhere" | "instance" | "cancel") => {
    const prompt = replacePrompt;
    setReplacePrompt(null);
    if (!prompt || mode === "cancel") return;
    if (mode === "everywhere") {
      commitElements((current) => current.map((entry) => entry.asset?.assetId === prompt.assetId ? { ...entry, asset: prompt.newRef } : entry));
    } else {
      commitElements((current) => current.map((entry) => entry.id === prompt.elementId ? { ...entry, asset: prompt.newRef } : entry));
    }
    notify(mode === "everywhere" ? "Replaced everywhere" : "Replaced this instance");
  };

  /* ─── Component operations ─── */

  const instanceCount = (componentId: string) => pages.reduce((sum, page) => sum + page.elements.filter((element) => element.component?.componentId === componentId).length, 0);

  const addComponentToCanvas = (componentId: string, x?: number, y?: number) => {
    const definition = resolveComponent(componentId, components);
    if (!definition) return notify("Component not found");
    const bounds = componentBounds(definition.elements);
    const variant = definition.variants.find((entry) => entry.isDefault) ?? definition.variants[0];
    const element: CanvasElement = {
      id: `component-${crypto.randomUUID()}`,
      type: "Container",
      name: definition.name,
      content: "",
      x: Math.max(8, x ?? 200),
      y: Math.max(72, y ?? 220),
      width: bounds.width,
      height: bounds.height,
      background: "transparent",
      color: "#111820",
      component: { instanceId: crypto.randomUUID(), componentId, variantId: variant?.id ?? "", overrides: {}, detached: false },
    };
    commitElements((current) => [...current, element]);
    setSelectedElementId(element.id);
    setSelectedLayer(element.name);
    notify(`${definition.name} added to the canvas`);
  };

  const createComponentFromSelectionHandler = (input: { name: string; description: string; category: ComponentCategory; type: ComponentKind }) => {
    const selectedIds = multiSelectIds.length ? multiSelectIds : (selectedElementId ? [selectedElementId] : []);
    const sourceElements = history.present.filter((element) => selectedIds.includes(element.id));
    if (!sourceElements.length) return notify("Select elements first");
    const definition = createComponentFromSelection(sourceElements, input);
    const bounds = componentBounds(definition.elements);
    const variant = definition.variants[0];
    const instanceId = `component-${crypto.randomUUID()}`;
    const originX = Math.min(...sourceElements.map((element) => element.x));
    const originY = Math.min(...sourceElements.map((element) => element.y));
    setComponents((current) => [...current, definition]);
    setMultiSelectIds([]);
    setCreateComponentOpen(false);
    commitElements((current) => {
      const next = current.filter((element) => !selectedIds.includes(element.id));
      next.push({
        id: instanceId, type: "Container", name: definition.name, content: "",
        x: originX, y: originY, width: bounds.width, height: bounds.height,
        background: "transparent", color: "#111820",
        component: { instanceId: crypto.randomUUID(), componentId: definition.id, variantId: variant.id, overrides: {}, detached: false },
      });
      return next;
    });
    setSelectedElementId(instanceId);
    setSelectedLayer(definition.name);
    notify(`Component “${definition.name}” created`);
  };

  const renameComponent = (componentId: string, name: string) => {
    setComponents((current) => current.map((component) => component.id === componentId ? { ...component, name, updatedAt: new Date().toISOString() } : component));
    setSaveStatus("dirty");
    notify("Component renamed");
  };

  const duplicateComponent = (componentId: string) => {
    const source = resolveComponent(componentId, components);
    if (!source) return;
    const copy: ComponentDefinition = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} Copy`,
      builtIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: source.elements.map((element) => ({ ...element })),
      variants: source.variants.map((variant) => ({ ...variant })),
      exposedProperties: source.exposedProperties.map((prop) => ({ ...prop })),
    };
    setComponents((current) => [...current, copy]);
    setSaveStatus("dirty");
    notify(`Component duplicated as “${copy.name}”`);
  };

  const createVariant = (componentId: string) => {
    const source = resolveComponent(componentId, components);
    if (!source || source.builtIn) { notify("Built-in components are read-only"); return; }
    const name = `Variant ${source.variants.length}`;
    setComponents((current) => current.map((component) => component.id === componentId ? { ...component, variants: [...component.variants, { id: crypto.randomUUID(), name, isDefault: false, overrides: {} }], updatedAt: new Date().toISOString() } : component));
    setSaveStatus("dirty");
    notify(`Variant “${name}” created`);
  };

  const requestDeleteComponent = (componentId: string) => {
    const definition = resolveComponent(componentId, components);
    if (!definition || definition.builtIn) return;
    setDeleteComponentPrompt({ component: definition, instances: instanceCount(componentId), pages: componentUsagePages(componentId, pages) });
  };

  const confirmDeleteComponent = (mode: "cancel" | "convert" | "deleteAll") => {
    const prompt = deleteComponentPrompt;
    setDeleteComponentPrompt(null);
    if (!prompt || mode === "cancel") return;
    const { component } = prompt;
    if (mode === "deleteAll") {
      setPages((current) => current.map((page) => ({ ...page, elements: page.elements.filter((element) => element.component?.componentId !== component.id) })));
    } else if (mode === "convert") {
      setPages((current) => current.map((page) => ({ ...page, elements: page.elements.flatMap((element) => {
        if (element.component?.componentId !== component.id) return [element];
        const resolved = applyInstanceOverrides(component, element.component);
        return resolved.map((child) => ({ ...child, id: `${child.type.toLowerCase()}-${crypto.randomUUID()}`, x: element.x + child.x, y: element.y + child.y, parentId: undefined, component: undefined }));
      }) })));
    }
    setComponents((current) => current.filter((component) => component.id !== prompt.component.id));
    setSaveStatus("dirty");
    notify(`Component “${component.name}” deleted`);
    void recordVersion("component", { changeSummary: `Deleted component ${component.name}` });
  };

  const exportComponent = (componentId: string) => {
    const definition = resolveComponent(componentId, components);
    if (!definition) return;
    const blob = new Blob([JSON.stringify(definition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Component definition exported");
  };

  const overrideInstance = (propertyId: string, value: string) => {
    if (!selectedElementId) return;
    commitElements((current) => current.map((element) => element.id === selectedElementId && element.component ? { ...element, component: { ...element.component, overrides: { ...element.component.overrides, [propertyId]: value } } } : element));
  };

  const resetOverrideInstance = (propertyId: string) => {
    if (!selectedElementId) return;
    commitElements((current) => current.map((element) => {
      if (element.id !== selectedElementId || !element.component) return element;
      const overrides = { ...element.component.overrides };
      delete overrides[propertyId];
      return { ...element, component: { ...element.component, overrides } };
    }));
  };

  const resetAllOverridesInstance = () => {
    if (!selectedElementId) return;
    commitElements((current) => current.map((element) => element.id === selectedElementId && element.component ? { ...element, component: { ...element.component, overrides: {} } } : element));
  };

  const switchVariantInstance = (variantId: string, elementId?: string) => {
    const targetId = elementId ?? selectedElementId;
    if (!targetId) return;
    commitElements((current) => current.map((element) => element.id === targetId && element.component ? { ...element, component: { ...element.component, variantId } } : element));
  };

  const detachInstance = (elementId?: string) => {
    const targetId = elementId ?? selectedElementId;
    if (!targetId) return;
    const element = history.present.find((entry) => entry.id === targetId);
    if (!element?.component) return;
    const definition = resolveComponent(element.component.componentId, components);
    if (!definition) return;
    const resolved = applyInstanceOverrides(definition, element.component);
    commitElements((current) => {
      const index = current.findIndex((entry) => entry.id === element.id);
      if (index < 0) return current;
      const detached = resolved.map((child) => ({ ...child, id: `${child.type.toLowerCase()}-${crypto.randomUUID()}`, x: element.x + child.x, y: element.y + child.y, parentId: undefined, component: undefined }));
      const next = [...current];
      next.splice(index, 1, ...detached);
      return next;
    });
    setSelectedElementId(null);
    notify("Detached from component");
  };

  const openMasterEditor = (componentId: string) => {
    const definition = resolveComponent(componentId, components);
    if (definition) setMasterEditComponent(definition);
  };

  const saveMasterEditor = (updates: { name: string; description: string; category: ComponentCategory; defaults: Record<string, string> }) => {
    const id = masterEditComponent?.id;
    if (!id) return;
    setComponents((current) => current.map((component) => component.id === id ? {
      ...component,
      name: updates.name,
      description: updates.description,
      category: updates.category,
      exposedProperties: component.exposedProperties.map((prop) => ({ ...prop, defaultValue: updates.defaults[prop.id] ?? prop.defaultValue })),
      updatedAt: new Date().toISOString(),
    } : component));
    setMasterEditComponent(null);
    setSaveStatus("dirty");
    notify(`Master updated — ${instanceCount(id)} instance${instanceCount(id) === 1 ? "" : "s"} refreshed`);
  };

  const groupSelection = () => {
    const ids = multiSelectIds.length ? multiSelectIds : (selectedElementId ? [selectedElementId] : []);
    if (ids.length < 2) return notify("Select at least two elements to group");
    const selected = history.present.filter((element) => ids.includes(element.id));
    const minX = Math.min(...selected.map((element) => element.x));
    const minY = Math.min(...selected.map((element) => element.y));
    const maxX = Math.max(...selected.map((element) => element.x + element.width));
    const maxY = Math.max(...selected.map((element) => element.y + element.height));
    const groupId = `container-${crypto.randomUUID()}`;
    commitElements((current) => [
      ...current.map((element) => ids.includes(element.id) ? { ...element, parentId: groupId } : element),
      { id: groupId, type: "Container", name: "Group", content: "", x: minX, y: minY, width: maxX - minX, height: maxY - minY, background: "transparent", color: "#59626b" },
    ]);
    setMultiSelectIds([]);
    setSelectedElementId(groupId);
    notify("Elements grouped");
  };

  const ungroupSelection = () => {
    if (!selectedElementId) return notify("Select a group to ungroup");
    const group = history.present.find((element) => element.id === selectedElementId);
    if (!group) return;
    commitElements((current) => current.filter((element) => element.id !== group.id).map((element) => element.parentId === group.id ? { ...element, parentId: undefined } : element));
    setSelectedElementId(null);
    notify("Group ungrouped");
  };

  const alignSelection = (axis: "left" | "centerX" | "right" | "top" | "middle" | "bottom") => {
    const ids = multiSelectIds.length ? multiSelectIds : (selectedElementId ? [selectedElementId] : []);
    if (!ids.length) return notify("Select elements to align");
    const selected = history.present.filter((element) => ids.includes(element.id));
    const minX = Math.min(...selected.map((element) => element.x));
    const maxX = Math.max(...selected.map((element) => element.x + element.width));
    const minY = Math.min(...selected.map((element) => element.y));
    const maxY = Math.max(...selected.map((element) => element.y + element.height));
    commitElements((current) => current.map((element) => {
      if (!ids.includes(element.id)) return element;
      if (axis === "left") return { ...element, x: minX };
      if (axis === "right") return { ...element, x: maxX - element.width };
      if (axis === "centerX") return { ...element, x: Math.round((minX + maxX) / 2 - element.width / 2) };
      if (axis === "top") return { ...element, y: minY };
      if (axis === "bottom") return { ...element, y: maxY - element.height };
      if (axis === "middle") return { ...element, y: Math.round((minY + maxY) / 2 - element.height / 2) };
      return element;
    }));
  };

  /* ─── AI ─── */

  const signInWithEmail = async (email: string) => {
    const supabase = getSandboxClient();
    if (!supabase) { setAuthError("Sign-in is unavailable right now"); return; }
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setAuthBusy(false);
    if (error) setAuthError(error.message);
    else setAuthCheck(email);
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    const supabase = getSandboxClient();
    if (!supabase) { setAuthError("Sign-in is unavailable right now"); return; }
    setAuthBusy(true);
    setAuthError(null);
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) { setAuthBusy(false); setAuthError(error.message); }
  };

  const signOut = async () => {
    const supabase = getSandboxClient();
    if (!supabase) return;
    setAuthCheck(null);
    await supabase.auth.signOut();
  };

  const stopAi = () => {
    aiAbortRef.current?.abort();
  };

  const requestAiProposal = async () => {
    if (!prompt.trim()) return notify("Describe the change you want first");
    if (aiBusy) return;
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    setAiBusy(true);
    setAiError(null);
    setAiProposal(null);
    setProposalStatus("ready");
    try {
      const result = await analyseSandboxPrompt(prompt, {
        elements: history.present,
        selectedElement,
        viewport,
        pages: pages.map((page) => ({ id: page.id, name: page.name, slug: page.slug, isHome: page.isHome })),
        activePageId,
        components,
      }, {
        taskClass: aiTaskClass,
        creativity: aiCreativity,
        currentPageOnly: aiCurrentPageOnly,
        preserveCopy: aiPreserveCopy,
        preserveDesign: aiPreserveDesign,
        accessibilityFirst: aiAccessibilityFirst,
        seoFirst: aiSeoFirst,
        scope: aiScope,
        preferredModel: preferredModel || undefined,
        localOnly,
        signal: controller.signal,
      });
      setAiProposal(result.proposal);
      setAiMode(result.mode);
      setAiUsage(result.usage);
      notify(`${result.proposal.changes.length} change${result.proposal.changes.length === 1 ? "" : "s"} proposed`);
    } catch (err) {
      if (controller.signal.aborted) {
        notify("Generation stopped");
      } else {
        setAiError("Live AI failed — using smart local mode");
      }
    } finally {
      if (aiAbortRef.current === controller) aiAbortRef.current = null;
      setAiBusy(false);
    }
  };

  const applyAiOperations = (operations: SandboxAiOperation[], current: CanvasElement[]) => {
    let next = [...current];
    let lastSelectedId: string | null = null;
    operations.forEach((operation, index) => {
      if (operation.kind === "add") {
        const element = makeCanvasElement(operation.elementType, next, operation.content, operation.x ?? 220 + index * 34, operation.y ?? 230 + index * 38);
        next.push(element);
        lastSelectedId = element.id;
      }
      if (operation.kind === "update") {
        next = next.map((element) => element.id === operation.elementId ? { ...element, ...operation.patch } : element);
        lastSelectedId = operation.elementId;
      }
      if (operation.kind === "delete") next = next.filter((element) => element.id !== operation.elementId);
      if (operation.kind === "duplicate") {
        const source = next.find((element) => element.id === operation.elementId);
        if (source) {
          const copy = { ...source, id: `${source.type.toLowerCase()}-${crypto.randomUUID()}`, name: `${source.name} copy`, x: source.x + 18, y: source.y + 18 };
          next.push(copy);
          lastSelectedId = copy.id;
        }
      }
    });
    return { next, lastSelectedId };
  };

  const applyComponentOperations = (operations: SandboxComponentOperation[]) => {
    operations.forEach((operation) => {
      if (operation.kind === "saveSelectionAsComponent") {
        const ids = selectedElementId ? [selectedElementId] : [];
        const source = history.present.filter((element) => ids.includes(element.id));
        if (source.length) {
          const definition = createComponentFromSelection(source, { name: operation.name ?? "My component", description: "", category: "Custom", type: "component" });
          setComponents((current) => [...current, definition]);
          notify(`Component “${definition.name}” saved`);
        }
      } else if (operation.kind === "addComponentToCanvas") {
        const match = BUILT_IN_COMPONENTS.find((component) => component.name.toLowerCase() === (operation.componentName ?? "").toLowerCase());
        if (match) addComponentToCanvas(match.id);
      } else if (operation.kind === "detachComponent") {
        detachInstance(operation.elementId);
      } else if (operation.kind === "useVariant") {
        const element = history.present.find((entry) => entry.id === operation.elementId);
        if (element?.component) {
          const definition = resolveComponent(element.component.componentId, components);
          const variant = definition?.variants.find((entry) => entry.name.toLowerCase() === operation.variantName.toLowerCase());
          if (variant) switchVariantInstance(variant.id, operation.elementId);
        }
      } else if (operation.kind === "updateAllInstances") {
        const updateElement = (element: CanvasElement): CanvasElement => {
          if (!element.component) return element;
          const definition = resolveComponent(element.component.componentId, components);
          const ctaProp = definition?.exposedProperties.find((prop) => /cta|button|action|label/i.test(prop.label));
          if (ctaProp) return { ...element, component: { ...element.component, overrides: { ...element.component.overrides, [ctaProp.id]: operation.value } } };
          return element;
        };
        commitElements((current) => current.map(updateElement));
        setPages((current) => current.map((page) => page.id === activePageId ? page : { ...page, elements: page.elements.map(updateElement) }));
        notify("Updated every CTA across instances");
      }
    });
  };

  const applyAiProposal = async () => {
    if (!aiProposal) return;
    await recordVersion("ai", { changeSummary: "Before AI change", metadata: { phase: "before", proposalId: aiProposal.id } }, true);
    const result = applyAiOperations(aiProposal.operations, history.present);
    commitElements(result.next);
    const viewportChange = aiProposal.operations.find((operation) => operation.kind === "viewport");
    if (viewportChange?.kind === "viewport") setViewport(viewportChange.viewport);
    if (result.lastSelectedId) setSelectedElementId(result.lastSelectedId);
    if (aiProposal.pageOperations.length) applyPageOperations(aiProposal.pageOperations);
    if (aiProposal.componentOperations.length) applyComponentOperations(aiProposal.componentOperations);
    setProposalStatus("applied");
    await recordVersion("ai", { changeSummary: `AI change: ${aiProposal.title}`, metadata: { phase: "after", proposalId: aiProposal.id, operationCount: aiProposal.operations.length + aiProposal.pageOperations.length + aiProposal.componentOperations.length } }, true);
    notify("AI changes applied");
  };

  const applyPromptBuilderResult = (result: PromptBuilderResult) => {
    setPrompt(result.prompt);
    setAiScope(result.scope);
    setPreferredModel(result.preferredModel);
    setLocalOnly(result.localOnly);
    setPromptBuilderOpen(false);
    notify("Prompt added — review it, then generate changes");
  };

  /* ── Template installation ── */

  const installTemplate = async (manifest: TemplateManifest, mode: InstallMode, placeholders: Record<string, string>): Promise<{ ok: boolean; message: string }> => {
    try {
      // Always checkpoint before replacing or merging anything.
      await recordVersion("template", { changeSummary: `Before installing template ${manifest.name}` }, true);

      const remapped = remapTemplateDocument(manifest.document);
      const substituted = applyPlaceholderValues(remapped, placeholders);

      if (mode === "replace_draft") {
        applyDocumentToState({ ...substituted, projectName });
        await recordVersion("template", { changeSummary: `Installed template ${manifest.name} (replaced draft)` }, true);
      } else if (mode === "add_pages" || mode === "new_page") {
        const slugs = pages.map((page) => page.slug);
        const newPages = substituted.pages.map((page) => {
          const slug = slugs.includes(page.slug) || page.slug === "/" ? suggestSlug(slugify(page.name) || "/page", slugs) : page.slug;
          slugs.push(slug);
          return { ...page, slug };
        });
        setPages((current) => [...current, ...newPages]);
        setSaveStatus("dirty");
        await recordVersion("template", { changeSummary: `Added ${newPages.length} page${newPages.length === 1 ? "" : "s"} from template ${manifest.name}` }, true);
      } else if (mode === "design_system") {
        setTheme(substituted.theme ?? defaultTheme());
        setSaveStatus("dirty");
        await recordVersion("template", { changeSummary: `Imported design system from ${manifest.name}` }, true);
      } else if (mode === "replace_page") {
        const templatePage = substituted.pages[0];
        if (templatePage) {
          setPages((current) => current.map((page) => page.id === activePageId ? { ...page, elements: templatePage.elements, seo: templatePage.seo, updatedAt: new Date().toISOString() } : page));
          setHistory({ past: [], present: templatePage.elements, future: [] });
          setSaveStatus("dirty");
          await recordVersion("template", { changeSummary: `Replaced page with template ${manifest.name}` }, true);
        }
      } else if (mode === "insert_sections" || mode === "insert_component") {
        const source = substituted.pages[0]?.elements ?? [];
        const inserted = source.map((element) => ({ ...element, id: `${element.type.toLowerCase()}-${crypto.randomUUID()}`, parentId: undefined }));
        commitElements((current) => [...current, ...inserted]);
        await recordVersion("template", { changeSummary: `Inserted sections from template ${manifest.name}` }, true);
      }

      return { ok: true, message: `Installed ${manifest.name}.` };
    } catch {
      return { ok: false, message: "Installation failed — your project was not modified." };
    }
  };

  /* ─── Panel layout handlers ─── */

  const bringToFront = (id: PanelId) => {
    zRef.current += 1;
    setPanels((current) => ({ ...current, [id]: { ...current[id], z: zRef.current } }));
    setFocusedPanel(id);
  };

  const popOut = (id: PanelId) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], mode: 'floating', minimized: false } }));
    bringToFront(id);
  };

  const dockPanel = (id: PanelId) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], mode: 'docked', minimized: false } }));
    if (focusedPanel === id) setFocusedPanel(null);
  };

  const minimizePanel = (id: PanelId) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], minimized: true } }));
  };

  const restorePanel = (id: PanelId) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], minimized: false } }));
    bringToFront(id);
  };

  const closePanel = (id: PanelId) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], mode: 'closed', minimized: false } }));
    if (focusedPanel === id) setFocusedPanel(null);
  };

  const movePanel = (id: PanelId, x: number, y: number) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], x, y } }));
  };

  const resizePanel = (id: PanelId, width: number, height: number, x: number, y: number) => {
    setPanels((current) => ({ ...current, [id]: { ...current[id], width, height, x, y } }));
  };

  const onRailClick = (name: string) => {
    if (name === "Design") { openDesign(); return; }
    if (name === "Team") { setTeamOpen(true); setTeamMinimized(false); return; }
    if (name === "Comments") { setCommentsOpen(true); setCommentsMinimized(false); return; }
    if (name === "Usage") { setUsageOpen(true); setUsageMinimized(false); return; }
    if (name === "AI Jobs") { setAiJobsOpen(true); setAiJobsMinimized(false); return; }
    if (name === "Templates") { setTemplatesOpen(true); setTemplatesMinimized(false); return; }
    setActiveTool(name);
    if (panels.elements.mode === "closed") dockPanel("elements");
    else if (panels.elements.minimized) restorePanel("elements");
  };

  /* ─── Panel bodies ─── */

  const layersBody = (
    <div className="layer-tree">
      <button onClick={() => { setSelectedLayer("Global header"); setSelectedElementId(null); }}>
        <PanelTop size={15} /><span>Global header</span>{globalSections.header.length > 0 && <i />}
      </button>
      <button onClick={() => { setSelectedLayer("Global footer"); setSelectedElementId(null); }}>
        <PanelTop size={15} /><span>Global footer</span>{globalSections.footer.length > 0 && <i />}
      </button>
      {history.present.map((element) => {
        const depth = computeLayerDepth(history.present).get(element.id) ?? 0;
        return (
          <button key={element.id} className={selectedElementId === element.id ? "selected" : ""} style={{ paddingLeft: 29 + depth * 14 }} onClick={() => { setSelectedLayer(element.name); setSelectedElementId(element.id); }}>
            <span className="tree-line" /><BoxSelect size={15} /><span>{element.name}</span>
            {element.component && <b className="layer-component-badge">C</b>}
            {selectedElementId === element.id && <i />}
          </button>
        );
      })}
      {history.present.length === 0 && <p className="layers-empty">No elements on this page yet.</p>}
    </div>
  );

  const elementsBody = (
    <>
      {activeTool === "Add" ? (
        <>
          <label className="search-field"><Search size={15} /><input placeholder="Search elements..." /><span><Command size={11} />K</span></label>
          <div className="element-grid">
            {elementItems.map(({ name, icon: Icon }) => (
              <button draggable key={name} className="element-card" onDragStart={(event) => startDrag(event, name)} onDragEnd={() => setDragging(null)} onClick={() => notify(`Drag ${name} onto the canvas`)}>
                <Icon size={28} strokeWidth={1.6} /><span>{name}</span>
              </button>
            ))}
          </div>
          {layersBody}
        </>
      ) : activeTool === "Pages" ? (
        <PagesPanel
          pages={pages}
          activePageId={activePageId}
          isDirty={saveStatus === "dirty"}
          navigation={globalSections.navigation}
          onSelectPage={switchPage}
          onCreatePage={() => setCreatePageOpen(true)}
          onOpenSettings={(page) => setSettingsPage(page)}
          onDuplicate={duplicatePageHandler}
          onSetHome={setHomepageHandler}
          onToggleNavigation={toggleNavigationHandler}
          onDelete={requestDeletePage}
          onMovePage={movePageHandler}
          onRename={renamePageHandler}
          onCopyUrl={copyPageUrlHandler}
          onNavigationChange={onNavigationChange}
          onNotify={notify}
        />
      ) : activeTool === "Assets" ? (
        <AssetManager
          elements={history.present}
          onAddToCanvas={addAssetToCanvas}
          onRemoveElementsByAsset={removeElementsByAsset}
          onMarkMissing={markMissingAsset}
          onReplaceAssetFile={replaceAssetFileOnCanvas}
          notify={notify}
        />
      ) : activeTool === "Components" ? (
        <ComponentsPanel
          components={components}
          pages={pages}
          onAddToCanvas={addComponentToCanvas}
          onEditMaster={openMasterEditor}
          onRename={renameComponent}
          onDuplicate={duplicateComponent}
          onCreateVariant={createVariant}
          onDelete={requestDeleteComponent}
          onExport={exportComponent}
          onCreateComponent={() => setCreateComponentOpen(true)}
          onNotify={notify}
        />
      ) : activeTool === "Layers" ? (
        layersBody
      ) : activeTool === "Forms" ? (
        <FormsPanel document={buildDocument()} onNotify={notify} />
      ) : (
        <>
          <div className="empty-tool-state"><AppWindow size={34} /><strong>{activeTool}</strong><span>Manage project {activeTool.toLowerCase()} here.</span></div>
        </>
      )}
    </>
  );

  const aiBody = (
    <>
      {authStatus === "unauthenticated" && (
        <AiSignInPrompt
          busy={authBusy}
          error={authError}
          sentTo={authCheck}
          onEmailSignIn={(email) => void signInWithEmail(email)}
          onProviderSignIn={(provider) => void signInWithProvider(provider)}
        />
      )}
      {authStatus === "authenticated" && (
        <div className="ai-live-ready">
          <Zap size={12} />
          <span>Live AI ready — signed in as {authEmail ?? "you"}</span>
          <button onClick={() => void signOut()}>Sign out</button>
        </div>
      )}
      <div className="ai-prompt-box"><textarea aria-label="AI website instruction" value={prompt} onChange={(event) => setPrompt(event.target.value)} /><button disabled={aiBusy} onClick={() => void requestAiProposal()}>{aiBusy ? <RotateCcw className="spin" size={17} /> : <Send size={17} />}</button></div>
      <div className="ai-tools-row"><button onClick={() => setPromptBuilderOpen((open) => !open)}><Sparkles size={14} />Prompt Builder</button><span className="ai-context-summary">{selectedElement ? "1 selected element · " : ""}current page</span></div>
      <AiGenerationStatus mode={aiMode} taskClass={aiTaskClass} usage={aiUsage} busy={aiBusy} errorMessage={aiError} onStop={stopAi} onRetry={() => void requestAiProposal()} />
      <AiUsageMeter usage={aiUsage} />
      {promptBuilderOpen && (
        <>
          <PromptBuilder
            pages={pages.map((page) => ({ id: page.id, name: page.name, slug: page.slug }))}
            activePageId={activePageId}
            taskClass={aiTaskClass}
            onApply={applyPromptBuilderResult}
            onNotify={notify}
            onClose={() => setPromptBuilderOpen(false)}
          />
          <div className="prompt-builder pb-options">
            <label>Task type<select className="ai-select" value={aiTaskClass} onChange={(event) => setAiTaskClass(event.target.value as AiTaskClass)}><option value="fast_edit">Fast edit</option><option value="standard">Website generation</option><option value="complex">Multi-page planning</option><option value="copywriting">Copywriting</option><option value="seo">SEO assistance</option><option value="accessibility">Accessibility review</option><option value="image_alt">Image alt text</option></select></label>
            <label>Creativity<select className="ai-select" value={aiCreativity} onChange={(event) => setAiCreativity(event.target.value as AiCreativity)}><option value="precise">Precise</option><option value="balanced">Balanced</option><option value="creative">Creative</option></select></label>
            <label className="ai-check"><input type="checkbox" checked={aiCurrentPageOnly} onChange={(event) => setAiCurrentPageOnly(event.target.checked)} /> Current page only</label>
            <label className="ai-check"><input type="checkbox" checked={aiPreserveCopy} onChange={(event) => setAiPreserveCopy(event.target.checked)} /> Preserve existing copy</label>
            <label className="ai-check"><input type="checkbox" checked={aiPreserveDesign} onChange={(event) => setAiPreserveDesign(event.target.checked)} /> Preserve design system</label>
            <label className="ai-check"><input type="checkbox" checked={aiAccessibilityFirst} onChange={(event) => setAiAccessibilityFirst(event.target.checked)} /> Accessibility-first</label>
            <label className="ai-check"><input type="checkbox" checked={aiSeoFirst} onChange={(event) => setAiSeoFirst(event.target.checked)} /> SEO-first</label>
          </div>
        </>
      )}
      <div className={`proposal-card ${proposalStatus} ${aiProposal ? "has-proposal" : "empty"}`}>
        <h3><Sparkles size={18} /> {proposalStatus === "applied" ? "Changes applied" : proposalStatus === "rejected" ? "Changes rejected" : aiProposal ? aiProposal.title : "Ready for instructions"}</h3>
        {aiProposal ? aiProposal.changes.map((item) => <p key={item}><span><Check size={12} /></span>{item}</p>) : <small>Describe a change or use Prompt Builder. Forge will prepare a reviewable plan before touching the canvas.</small>}
        {aiProposal && aiProposal.warnings && aiProposal.warnings.length > 0 && (
          <div className="proposal-warnings">{aiProposal.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
        )}
        <div className="proposal-actions"><button disabled={!aiProposal} onClick={() => notify(aiProposal?.summary ?? "Create a proposal first")}>Preview changes</button><button disabled={!aiProposal || proposalStatus === "applied"} className="apply" onClick={applyAiProposal}>Apply</button><button disabled={!aiProposal} onClick={() => { setProposalStatus("rejected"); notify("Proposal rejected"); }}>Reject</button></div>
      </div>
    </>
  );

  const renderElements = (parentId?: string, px = 0, py = 0) => {
    const children = displayElements.filter((element) => (element.parentId ?? undefined) === (parentId ?? undefined) && !element.hidden);
    return children.map((element) => {
      const left = parentId ? element.x - px : element.x;
      const top = parentId ? element.y - py : element.y;
      const isSelected = !previewMode && selectedElementId === element.id;
      const isMulti = multiSelectIds.includes(element.id);
      const elementCommentCount = comments.filter((c) => c.elementId === element.id).length;
      return (
        <div
          key={element.id}
          draggable={!previewMode && !readOnly}
          className={`canvas-element type-${element.type.toLowerCase()} ${isSelected ? "selected" : ""} ${isMulti ? "multi" : ""} ${element.component ? "is-component" : ""}`}
          style={{ left, top, width: element.width, minHeight: element.height, background: element.component ? "transparent" : element.background, color: element.color }}
          onDragStart={(event) => {
            if (previewMode) return;
            event.stopPropagation();
            event.dataTransfer.setData("text/forge-instance", element.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onClick={(event) => {
            if (previewMode) return;
            event.stopPropagation();
            if (event.shiftKey) {
              setMultiSelectIds((current) => current.includes(element.id) ? current.filter((id) => id !== element.id) : [...current, element.id]);
            } else {
              setSelectedElementId(element.id);
              setSelectedLayer(element.name);
              setMultiSelectIds([]);
            }
          }}
        >
          {element.component ? <ComponentInstanceView element={element} components={components} /> : <CanvasElementPreview element={element} />}
          {elementCommentCount > 0 && (
            <span className="comment-pin" title={`${elementCommentCount} comment${elementCommentCount === 1 ? "" : "s"}`}>
              <MessageSquare size={11} />{elementCommentCount}
            </span>
          )}
          {isSelected && <span className="element-drag-label"><Move size={12} /> Drag to move</span>}
          {renderElements(element.id, element.x, element.y)}
        </div>
      );
    });
  };

  return (
    <main className="forge-app">
      <header className="topbar">
        <div className="brand-block"><Gem className="brand-mark" strokeWidth={3} /><span className="brand-name">FORGE</span></div>
        <button className="project-name">{projectName} <ChevronDown size={14} /></button>
        <button className={`save-state ${saveStatus}`} onClick={() => void saveProjectWithConflictCheck()} disabled={saveStatus === "saving" || saveStatus === "loading"}>
          <Check size={17} /> {saveStatus === "loading" ? "Loading" : saveStatus === "saving" ? "Saving" : saveStatus === "dirty" ? "Save changes" : saveStatus === "cloud" ? "Cloud saved" : saveStatus === "error" ? "Save retry" : "Saved locally"}
        </button>
        <div className="history-actions">
          <button className={history.past.length ? "" : "muted"} disabled={!history.past.length} onClick={undo}><Undo2 size={16} /> Undo</button>
          <button className={history.future.length ? "" : "muted"} disabled={!history.future.length} onClick={redo}><Redo2 size={16} /> Redo</button>
        </div>
        <div className="topbar-spacer" />
        <div className="device-switcher" aria-label="Viewport selector">
          <button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")} aria-label="Desktop"><Monitor size={17} /></button>
          <button className={viewport === "tablet" ? "active" : ""} onClick={() => setViewport("tablet")} aria-label="Tablet"><Tablet size={16} /></button>
          <button className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")} aria-label="Mobile"><Smartphone size={16} /></button>
        </div>
        <button className="zoom-button" onClick={() => setZoom((value) => value === 100 ? 85 : 100)}>{zoom}% <ChevronDown size={13} /></button>
        <div className="version-control">
          <button className="version-button" onClick={() => setVersionMenuOpen((value) => !value)}>{currentVersionNumber ? `v${currentVersionNumber}` : "v1"} <ChevronDown size={13} /></button>
          {versionMenuOpen && (
            <div className="version-menu">
              <button onClick={() => { setVersionMenuOpen(false); openVersionHistory(); }}><History size={14} /> Open history</button>
              <button onClick={() => { setVersionMenuOpen(false); setCreateCheckpointOpen(true); }}><Flag size={14} /> Create checkpoint</button>
              <button onClick={() => { setVersionMenuOpen(false); void saveProject(); }}><Save size={14} /> Save now</button>
            </div>
          )}
        </div>
        <div className="topbar-spacer short" />
        <button className="top-action" onClick={openSitePreview}>Preview <Eye size={16} /></button>
        <button className="top-action" onClick={openBuild}><TerminalSquare size={16} /> Build</button>
        <button className="publish-button" onClick={openPublish}><Upload size={16} /> Publish</button>
        <span className="online-dot" title="All services online" />
        {presence.length > 0 && (
          <div className="presence-cluster" title={`${presence.length} collaborator${presence.length === 1 ? "" : "s"} online`}>
            {presence.slice(0, 4).map((p) => (
              <span key={p.userId} className="presence-avatar" title={`${p.name}${p.editing ? " — editing" : ""}`}>
                {p.initials}
                {p.editing && <i />}
              </span>
            ))}
            {presence.length > 4 && <span className="presence-more">+{presence.length - 4}</span>}
          </div>
        )}
      </header>

      <section className={`workspace ${panels.elements.mode === "docked" ? "" : "elements-collapsed"} ${panels.assistant.mode === "docked" ? "" : "assistant-collapsed"}`}>
        <aside className={`left-shell ${panels.elements.mode === "docked" ? "" : "collapsed"}`}>
          <nav className="tool-rail">
            {railItems.map(({ name, icon: Icon }) => (
              <button key={name} className={(activeTool === name || (name === "Design" && designOpen) || (name === "Usage" && usageOpen) || (name === "Templates" && templatesOpen)) ? "active" : ""} onClick={() => onRailClick(name)}><Icon size={21} /><span>{name}</span></button>
            ))}
          </nav>
          {panels.elements.mode === "docked" && (
            <div className="elements-panel">
              <div className="panel-title-row">
                <h2>{elementsTitle}</h2>
                <div className="panel-title-actions">
                  <button aria-label="Pop out panel" title="Pop out panel" onClick={() => popOut("elements")}><ExternalLink size={15} /></button>
                  <button aria-label="Close panel" title="Close panel" onClick={() => closePanel("elements")}><X size={16} /></button>
                </div>
              </div>
              {elementsBody}
            </div>
          )}
        </aside>

        <section className="canvas-shell" ref={workspaceRef}>
          {masterEditComponent && (
            <div className="master-edit-banner">
              <Boxes size={15} />
              <span>Editing master component: <b>{masterEditComponent.name}</b></span>
              <em>{instanceCount(masterEditComponent.id)} instance{instanceCount(masterEditComponent.id) === 1 ? "" : "s"} affected</em>
              <button onClick={() => setMasterEditComponent(null)}>Exit <X size={13} /></button>
            </div>
          )}
          {previewMode && (
            <div className="preview-bar">
              <button onClick={previewBack} disabled={previewCursor <= 0} aria-label="Back"><ArrowLeft size={15} /></button>
              <button onClick={previewForward} disabled={previewCursor >= previewStack.length - 1} aria-label="Forward"><ArrowRight size={15} /></button>
              <span className="preview-path">{previewPage?.slug ?? "/"}</span>
              <button className="preview-exit" onClick={exitPreview}>Exit preview <X size={13} /></button>
            </div>
          )}
          {reviewMode && (
            <div className="review-bar">
              <span className="review-badge"><Eye size={13} /> Review mode</span>
              <span className="review-version">Viewing v{reviewVersionNumber ?? "—"} · read-only</span>
              <span className="review-note">Comment pins are active — editing controls are hidden</span>
              <div className="review-bar-actions">
                <button className="review-approve" onClick={() => void decideReview("approved")}><Check size={14} /> Approve</button>
                <button className="review-changes" onClick={() => void decideReview("changes_requested")}>Request changes</button>
                <button className="review-exit" onClick={exitReview}>Exit review <X size={13} /></button>
              </div>
            </div>
          )}
          {!previewMode && !readOnly && (
            <div className="floating-tools">
              <button title="Create component" onClick={() => setCreateComponentOpen(true)}><Boxes size={17} /></button>
              <button title="Group" onClick={groupSelection}><Group size={17} /></button>
              <button title="Ungroup" onClick={ungroupSelection}><Ungroup size={17} /></button>
              <button title="Duplicate" onClick={duplicateSelected}><Copy size={17} /></button>
              <button title="Align left" onClick={() => alignSelection("left")}><AlignLeft size={17} /></button>
              <button title="Align centre" onClick={() => alignSelection("centerX")}><AlignCenter size={17} /></button>
              <button title="Align right" onClick={() => alignSelection("right")}><AlignRight size={17} /></button>
              <button title="Align top" onClick={() => alignSelection("top")}><PanelTop size={17} /></button>
              <button title="Align middle" onClick={() => alignSelection("middle")}><List size={17} /></button>
              <button title="Align bottom" onClick={() => alignSelection("bottom")}><ArrowDownUp size={17} /></button>
              <button className="danger" title="Delete" onClick={deleteSelected}><Trash2 size={17} /></button>
            </div>
          )}
          <div className="canvas-scroll">
            <div className={`artboard-frame ${viewport}`} style={{ width: artboardWidth, transform: `scale(${zoom / 100})` }} onDragOver={(event) => event.preventDefault()} onDrop={dropElement}>
              <div className="selection-label">{previewMode ? (previewPage?.name ?? "Preview") : selectedElement ? selectedElement.name : selectedLayer}</div>
              {!previewMode && !readOnly && (<><span className="handle tl" /><span className="handle tr" /><span className="handle bl" /><span className="handle br" /><span className="handle tm" /><span className="handle bm" /></>)}
              <article className="site-artboard">
                {!chromePage?.advanced.hideGlobalHeader && (<nav className="site-nav">
                  <div className="site-brand"><Gem size={22} fill="#f5a500" color="#101820" /><b>FORGE</b></div>
                  <div className="site-links">
                    {globalSections.navigation.map((item) => {
                      const target = item.type === "page" ? pages.find((page) => page.id === item.pageId) : null;
                      const broken = item.type === "page" && !target;
                      const href = item.type === "page" ? (target?.slug ?? "#") : item.type === "external" ? item.url : item.anchor;
                      return (
                        <a
                          key={item.id}
                          className={`${item.isButton ? "nav-cta" : ""} ${broken ? "broken" : ""}`}
                          href={href}
                          target={item.newTab ? "_blank" : undefined}
                          rel={item.newTab ? "nofollow noopener" : undefined}
                          title={broken ? "Broken link — destination page missing" : undefined}
                          onClick={(event) => {
                            if (item.type !== "page" || !target) return;
                            event.preventDefault();
                            if (previewMode) navigatePreview(target.id);
                            else switchPage(target.id);
                          }}
                        >
                          {item.label}
                        </a>
                      );
                    })}
                    {globalSections.navigation.length === 0 && (<><span>Product</span><span>Solutions</span><span>Pricing</span><span>About</span></>)}
                  </div>
                  <div className="site-nav-actions"><button>Sign in</button><button>Start Building</button></div>
                </nav>)}
                <section className="site-hero" onClick={() => { setSelectedLayer("Hero"); setSelectedElementId(null); }}>
                  <div className="hero-copy">
                    <span className="eyebrow">AI-POWERED WEBSITE BUILDER</span>
                    <h1>Build smarter.<br />Ship faster.</h1>
                    <p>FORGE helps you go from idea to production with an AI-assisted, drag-and-drop builder designed for speed, flexibility, and scale.</p>
                    <div className="hero-actions"><button>Start Building <ChevronRight size={14} /></button><button>Book a Demo <AppWindow size={13} /></button></div>
                  </div>
                  <div className="hero-art" role="img" aria-label="Abstract amber wave artwork">
                    <div className="sun" /><div className="wave-lines" />
                    <div className="drag-button"><span>Book a Demo</span><AppWindow size={14} /><MousePointer2 size={26} /></div>
                  </div>
                </section>
                {!previewMode && !readOnly && (<div className={`drop-zone ${dragging ? "dragging" : ""}`}><span><Circle size={10} /> {dragging ? `Drop ${dragging} here` : "Drop section here"}</span></div>)}
                <section className="features-row" onClick={() => { setSelectedLayer("Features"); setSelectedElementId(null); }}>
                  <FeatureCard icon={<Zap />} title={["AI-Assisted", "Workflows"]} text="Let AI handle the heavy lifting while you stay in control of every detail." />
                  <FeatureCard icon={<Box />} title={["Drag. Drop.", "Deploy."]} text="Build visually, customise freely, and deploy anywhere with one click." />
                  <FeatureCard icon={<ShieldCheck />} title={["Secure by", "Design"]} text="Enterprise-grade security and performance built in." />
                </section>
                {globalSections.footer.length > 0 && !chromePage?.advanced.hideGlobalFooter && (
                  <section className="global-footer">
                    <span className="global-badge">Global</span>
                    <div className="global-footer-content">
                      {globalSections.footer.map((element) => (
                        <span key={element.id} className="global-footer-item">{element.content}</span>
                      ))}
                    </div>
                  </section>
                )}
                <div className="canvas-elements" aria-label="Dropped page elements">
                  {renderElements()}
                </div>
              </article>
            </div>
          </div>

          {panels.elements.mode === "floating" && (
            <FloatingPanel
              title={elementsTitle}
              minimized={panels.elements.minimized}
              x={panels.elements.x}
              y={panels.elements.y}
              width={panels.elements.width}
              height={panels.elements.height}
              minWidth={ELEMENTS_DEFAULTS.minWidth}
              minHeight={ELEMENTS_DEFAULTS.minHeight}
              z={panels.elements.z}
              active={focusedPanel === "elements"}
              boundsRef={workspaceRef}
              onMove={(x, y) => movePanel("elements", x, y)}
              onResize={(w, h, x, y) => resizePanel("elements", w, h, x, y)}
              onFocus={() => bringToFront("elements")}
              onDock={() => dockPanel("elements")}
              onMinimize={() => minimizePanel("elements")}
              onRestore={() => restorePanel("elements")}
              onClose={() => closePanel("elements")}
            >
              {elementsBody}
            </FloatingPanel>
          )}

          {panels.assistant.mode === "floating" && (
            <FloatingPanel
              title="AI Assistant"
              minimized={panels.assistant.minimized}
              x={panels.assistant.x}
              y={panels.assistant.y}
              width={panels.assistant.width}
              height={panels.assistant.height}
              minWidth={ASSISTANT_DEFAULTS.minWidth}
              minHeight={ASSISTANT_DEFAULTS.minHeight}
              z={panels.assistant.z}
              active={focusedPanel === "assistant"}
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => movePanel("assistant", x, y)}
              onResize={(w, h, x, y) => resizePanel("assistant", w, h, x, y)}
              onFocus={() => bringToFront("assistant")}
              onDock={() => dockPanel("assistant")}
              onMinimize={() => minimizePanel("assistant")}
              onRestore={() => restorePanel("assistant")}
              onClose={() => closePanel("assistant")}
            >
              {aiBody}
            </FloatingPanel>
          )}

          {versionHistoryOpen && !versionPanelDocked && (
            <FloatingPanel
              title="Version history"
              minimized={versionPanelMinimized}
              x={versionPanelPos.x}
              y={versionPanelPos.y}
              width={versionPanelPos.width}
              height={versionPanelPos.height}
              minWidth={320}
              minHeight={420}
              z={250}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setVersionPanelPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setVersionPanelPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setVersionPanelDocked(true)}
              onMinimize={() => setVersionPanelMinimized(true)}
              onRestore={() => setVersionPanelMinimized(false)}
              onClose={() => setVersionHistoryOpen(false)}
            >
              <VersionHistoryPanel
                versions={versions}
                currentVersionNumber={currentVersionNumber}
                loading={versionLoading}
                localCount={localVersionCount}
                onPreview={(entry) => void previewVersionHandler(entry)}
                onRestore={requestRestore}
                onCompare={(a, b) => void openCompare(a, b)}
                onCreateCheckpoint={() => setCreateCheckpointOpen(true)}
                onSyncLocal={() => void syncLocalHistory()}
                onClearLocal={() => { void clearLocalVersions(); void refreshVersions(); }}
              />
            </FloatingPanel>
          )}

          {problemsOpen && (
            <FloatingPanel
              title="Problems"
              minimized={problemsMinimized}
              x={problemsPos.x}
              y={problemsPos.y}
              width={problemsPos.width}
              height={problemsPos.height}
              minWidth={360}
              minHeight={420}
              z={240}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setProblemsPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setProblemsPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setProblemsOpen(false)}
              onMinimize={() => setProblemsMinimized(true)}
              onRestore={() => setProblemsMinimized(false)}
              onClose={() => setProblemsOpen(false)}
            >
              <ValidationPanel
                result={validationResult}
                loading={validationLoading}
                onRunValidation={runValidation}
                onSelectElement={selectIssueElement}
                onAskAiToFix={askAiToFix}
              />
            </FloatingPanel>
          )}

          {buildOpen && buildDoc && (
            <FloatingPanel
              title="Build"
              minimized={buildMinimized}
              x={buildPos.x}
              y={buildPos.y}
              width={buildPos.width}
              height={buildPos.height}
              minWidth={380}
              minHeight={480}
              z={241}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setBuildPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setBuildPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setBuildOpen(false)}
              onMinimize={() => setBuildMinimized(true)}
              onRestore={() => setBuildMinimized(false)}
              onClose={() => setBuildOpen(false)}
            >
              <BuildPanel
                document={buildDoc}
                validation={validationResult ?? { issues: [], blockers: 0, errors: 0, warnings: 0, recommendations: 0, passed: 0 }}
                sourceVersionNumber={currentVersionNumber}
                onClose={() => setBuildOpen(false)}
                onNotify={notify}
                onCreateCheckpoint={createBuildCheckpoint}
              />
            </FloatingPanel>
          )}

          {publishOpen && (
            <FloatingPanel
              title="Publish"
              minimized={publishMinimized}
              x={publishPos.x}
              y={publishPos.y}
              width={publishPos.width}
              height={publishPos.height}
              minWidth={480}
              minHeight={520}
              z={242}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setPublishPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setPublishPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setPublishOpen(false)}
              onMinimize={() => setPublishMinimized(true)}
              onRestore={() => setPublishMinimized(false)}
              onClose={() => setPublishOpen(false)}
            >
              <PublishDialog
                projectName={projectName}
                sourceVersionNumber={currentVersionNumber}
                validation={validationResult ?? { issues: [], blockers: 0, errors: 0, warnings: 0, recommendations: 0, passed: 0 }}
                hasUnconfiguredForms={hasUnconfiguredForms}
                onClose={() => setPublishOpen(false)}
                onNotify={notify}
                onEnsureCheckpoint={ensurePublishCheckpoint}
              />
            </FloatingPanel>
          )}

          {designOpen && (
            <FloatingPanel
              title="Design system"
              minimized={designMinimized}
              x={designPos.x}
              y={designPos.y}
              width={designPos.width}
              height={designPos.height}
              minWidth={440}
              minHeight={520}
              z={243}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setDesignPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setDesignPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setDesignOpen(false)}
              onMinimize={() => setDesignMinimized(true)}
              onRestore={() => setDesignMinimized(false)}
              onClose={() => setDesignOpen(false)}
            >
              <DesignSystemPanel
                theme={theme}
                assets={useAssetStore.getState().assets}
                onApply={(next) => void applyTheme(next)}
                onNotify={notify}
              />
            </FloatingPanel>
          )}

          {teamOpen && (
            <FloatingPanel
              title="Team"
              minimized={teamMinimized}
              x={teamPos.x}
              y={teamPos.y}
              width={teamPos.width}
              height={teamPos.height}
              minWidth={440}
              minHeight={520}
              z={244}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setTeamPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setTeamPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setTeamOpen(false)}
              onMinimize={() => setTeamMinimized(true)}
              onRestore={() => setTeamMinimized(false)}
              onClose={() => setTeamOpen(false)}
            >
              <TeamPanel
                role={role}
                versions={versions}
                onNotify={notify}
                onOpenReview={(versionNumber) => enterReview(versionNumber)}
              />
            </FloatingPanel>
          )}

          {commentsOpen && (
            <FloatingPanel
              title="Comments"
              minimized={commentsMinimized}
              x={commentsPos.x}
              y={commentsPos.y}
              width={commentsPos.width}
              height={commentsPos.height}
              minWidth={380}
              minHeight={460}
              z={245}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setCommentsPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setCommentsPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setCommentsOpen(false)}
              onMinimize={() => setCommentsMinimized(true)}
              onRestore={() => setCommentsMinimized(false)}
              onClose={() => setCommentsOpen(false)}
            >
              <CommentsPanel
                pageId={activePageId}
                pageName={activePage?.name ?? "Page"}
                onFocusComment={focusComment}
                onNotify={notify}
              />
            </FloatingPanel>
          )}

          {usageOpen && (
            <FloatingPanel
              title="Usage & billing"
              minimized={usageMinimized}
              x={usagePos.x}
              y={usagePos.y}
              width={usagePos.width}
              height={usagePos.height}
              minWidth={440}
              minHeight={520}
              z={246}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setUsagePos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setUsagePos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setUsageOpen(false)}
              onMinimize={() => setUsageMinimized(true)}
              onRestore={() => setUsageMinimized(false)}
              onClose={() => setUsageOpen(false)}
            >
              <UsagePanel onNotify={notify} />
            </FloatingPanel>
          )}

          {aiJobsOpen && (
            <FloatingPanel
              title="AI jobs"
              minimized={aiJobsMinimized}
              x={aiJobsPos.x}
              y={aiJobsPos.y}
              width={aiJobsPos.width}
              height={aiJobsPos.height}
              minWidth={400}
              minHeight={460}
              z={247}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setAiJobsPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setAiJobsPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setAiJobsOpen(false)}
              onMinimize={() => setAiJobsMinimized(true)}
              onRestore={() => setAiJobsMinimized(false)}
              onClose={() => setAiJobsOpen(false)}
            >
              <AiActivityPanel projectId={projectId} onNotify={notify} />
            </FloatingPanel>
          )}

          {templatesOpen && (
            <FloatingPanel
              title="Templates"
              minimized={templatesMinimized}
              x={templatesPos.x}
              y={templatesPos.y}
              width={templatesPos.width}
              height={templatesPos.height}
              minWidth={560}
              minHeight={520}
              z={248}
              active
              dockIcon={<PanelRightClose size={14} />}
              boundsRef={workspaceRef}
              onMove={(x, y) => setTemplatesPos((pos) => ({ ...pos, x, y }))}
              onResize={(w, h, x, y) => setTemplatesPos({ width: w, height: h, x, y })}
              onFocus={() => {}}
              onDock={() => setTemplatesOpen(false)}
              onMinimize={() => setTemplatesMinimized(true)}
              onRestore={() => setTemplatesMinimized(false)}
              onClose={() => setTemplatesOpen(false)}
            >
              <TemplatesPanel
                document={buildDocument()}
                currentPageCount={pages.length}
                onNotify={notify}
                onInstall={installTemplate}
              />
            </FloatingPanel>
          )}
        </section>

        {panels.assistant.mode === "docked" && (
          <aside className="right-panel">
            <div className="right-tabs">
              <div className="right-tab-buttons">
                <button className={rightTab === "ai" ? "active" : ""} onClick={() => setRightTab("ai")}>AI Assistant</button>
                <button className={rightTab === "properties" ? "active" : ""} onClick={() => setRightTab("properties")}>Properties</button>
              </div>
              <button className="tab-popout" aria-label="Pop out AI Assistant panel" title="Pop out AI Assistant" onClick={() => popOut("assistant")}><ExternalLink size={15} /></button>
              <button className="tab-popout" aria-label="Close panel" title="Close panel" onClick={() => closePanel("assistant")}><X size={16} /></button>
            </div>
            {rightTab === "ai" && aiBody}
            <PropertiesPanel selected={selectedLayer} element={selectedElement} pages={pages} condensed={rightTab === "ai"} onUpdate={updateSelected} onNotify={notify} onReplaceElement={requestReplaceElement} />
            {selectedElement?.component && resolveComponent(selectedElement.component.componentId, components) && (
              <ComponentInstanceProperties
                element={selectedElement}
                definition={resolveComponent(selectedElement.component.componentId, components)!}
                instanceCount={instanceCount(selectedElement.component.componentId)}
                onOverride={overrideInstance}
                onResetOverride={resetOverrideInstance}
                onResetAllOverrides={resetAllOverridesInstance}
                onSwitchVariant={(variantId) => switchVariantInstance(variantId)}
                onEditMaster={() => openMasterEditor(selectedElement.component!.componentId)}
                onDetach={() => detachInstance()}
              />
            )}
          </aside>
        )}

        <footer className="statusbar">
          <div className="status-tabs">
            {[{ n: "Activity", i: Activity }, { n: "Logs", i: Logs }, { n: "Problems", i: Circle }, { n: "Changes", i: RotateCcw }, { n: "Console", i: TerminalSquare }].map(({ n, i: Icon }) => (
              <button key={n} className={bottomTab === n ? "active" : ""} onClick={() => { if (n === "Changes") openVersionHistory(); else if (n === "Problems") openProblems(); else setBottomTab(n); }}><Icon size={16} />{n}{n === "Problems" && <b>{validationResult?.issues.length ?? 0}</b>}{n === "Changes" && <b>{currentVersionNumber ?? 0}</b>}</button>
            ))}
          </div>
          <div className="preview-ready"><span />{pages.length} page{pages.length === 1 ? "" : "s"}</div>
          <div className="service-list">{services.map((service) => <button key={service}><span />{service}</button>)}</div>
          <button className="settings-button" onClick={() => notify("System settings opened")}><Settings size={20} /></button>
        </footer>
      </section>

      {panels.assistant.mode !== "docked" && (
        <button className="assistant-reopen" onClick={() => dockPanel("assistant")} title="Reopen AI Assistant" aria-label="Reopen AI Assistant">
          <Sparkles size={17} />AI
        </button>
      )}

      <CreatePageDialog
        open={createPageOpen}
        existingSlugs={pages.map((page) => page.slug)}
        onClose={() => setCreatePageOpen(false)}
        onCreate={createPage}
      />

      <PageSettingsDialog
        open={settingsPage !== null}
        page={settingsPage}
        existingSlugs={pages.map((page) => page.slug)}
        onClose={() => setSettingsPage(null)}
        onSave={savePageSettingsHandler}
      />

      <CreateComponentDialog
        open={createComponentOpen}
        selectionCount={multiSelectIds.length || (selectedElementId ? 1 : 0)}
        onClose={() => setCreateComponentOpen(false)}
        onCreate={createComponentFromSelectionHandler}
      />

      <ComponentMasterEditor
        component={masterEditComponent}
        instanceCount={masterEditComponent ? instanceCount(masterEditComponent.id) : 0}
        usagePages={masterEditComponent ? componentUsagePages(masterEditComponent.id, pages) : []}
        onSave={saveMasterEditor}
        onCancel={() => setMasterEditComponent(null)}
      />

      {deleteComponentPrompt && (
        <div className="asset-dialog-overlay" onClick={() => confirmDeleteComponent("cancel")}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Delete “{deleteComponentPrompt.component.name}”</h3><button onClick={() => confirmDeleteComponent("cancel")} aria-label="Close"><X size={15} /></button></div>
            {deleteComponentPrompt.instances > 0 ? (
              <div className="asset-delete-warning"><Trash2 size={15} /> Used by {deleteComponentPrompt.instances} instance{deleteComponentPrompt.instances === 1 ? "" : "s"} on {deleteComponentPrompt.pages.length} page{deleteComponentPrompt.pages.length === 1 ? "" : "s"}.</div>
            ) : (
              <p className="asset-dialog-copy">This component is not used anywhere.</p>
            )}
            <div className="asset-dialog-actions column">
              {deleteComponentPrompt.instances > 0 ? (
                <>
                  <button className="danger" onClick={() => confirmDeleteComponent("deleteAll")}>Delete definition and all instances</button>
                  <button onClick={() => confirmDeleteComponent("convert")}>Convert instances to elements, then delete</button>
                </>
              ) : (
                <button className="danger" onClick={() => confirmDeleteComponent("deleteAll")}>Delete</button>
              )}
              <button onClick={() => confirmDeleteComponent("cancel")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        className="asset-file-input"
        accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.pdf,.txt,image/*,video/*,application/pdf,text/plain"
        onChange={(event) => void handleReplaceFileSelected(event.target.files?.[0])}
      />
      {replacePrompt && (
        <div className="asset-dialog-overlay" onClick={() => confirmReplacePrompt("cancel")}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Replace reused asset</h3><button onClick={() => confirmReplacePrompt("cancel")} aria-label="Close"><X size={15} /></button></div>
            <p className="asset-dialog-copy">This asset is used by multiple canvas elements. Replace it everywhere, or only on this instance?</p>
            <div className="asset-dialog-actions column">
              <button className="primary" onClick={() => confirmReplacePrompt("everywhere")}>Replace everywhere</button>
              <button onClick={() => confirmReplacePrompt("instance")}>Only this instance</button>
              <button onClick={() => confirmReplacePrompt("cancel")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deletePrompt && (
        <div className="asset-dialog-overlay" onClick={() => confirmDeletePage("cancel")}>
          <div className="asset-dialog delete-page-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Delete “{deletePrompt.page.name}”</h3><button onClick={() => confirmDeletePage("cancel")} aria-label="Close"><X size={15} /></button></div>
            {deletePrompt.incoming > 0 ? (
              <div className="asset-delete-warning"><Trash2 size={15} /> This page is referenced by {deletePrompt.incoming} link{deletePrompt.incoming === 1 ? "" : "s"}.</div>
            ) : (
              <p className="asset-dialog-copy">This page is not referenced anywhere.</p>
            )}
            <p className="asset-dialog-copy">Choose how to handle any incoming links before deleting this page.</p>
            <div className="delete-page-body">
              <label className="page-dialog-label">Redirect incoming links to
                <select className="asset-dialog-input" value={deleteReplacementId} onChange={(event) => setDeleteReplacementId(event.target.value)}>
                  <option value="">Choose a page…</option>
                  {pages.filter((page) => page.id !== deletePrompt.page.id).map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
                </select>
              </label>
            </div>
            <div className="asset-dialog-actions column">
              <button className="primary" disabled={!deleteReplacementId} onClick={() => confirmDeletePage("redirect")}>Delete and redirect links</button>
              <button className="danger" onClick={() => confirmDeletePage("remove")}>Delete and remove incoming links</button>
              <button onClick={() => confirmDeletePage("cancel")}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {versionHistoryOpen && versionPanelDocked && (
        <aside className="version-panel-docked">
          <div className="version-panel-docked-header">
            <h2>Version history</h2>
            <button onClick={() => setVersionPanelDocked(false)} aria-label="Undock"><ExternalLink size={15} /></button>
            <button onClick={() => setVersionHistoryOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          <VersionHistoryPanel
            versions={versions}
            currentVersionNumber={currentVersionNumber}
            loading={versionLoading}
            localCount={localVersionCount}
            onPreview={(entry) => void previewVersionHandler(entry)}
            onRestore={requestRestore}
            onCompare={(a, b) => void openCompare(a, b)}
            onCreateCheckpoint={() => setCreateCheckpointOpen(true)}
            onSyncLocal={() => void syncLocalHistory()}
            onClearLocal={() => { void clearLocalVersions(); void refreshVersions(); }}
          />
        </aside>
      )}

      <CreateCheckpointDialog open={createCheckpointOpen} onClose={() => setCreateCheckpointOpen(false)} onCreate={handleCheckpoint} />

      <RestoreVersionDialog
        version={restorePrompt?.entry ?? null}
        open={restorePrompt !== null}
        pages={pages}
        components={components}
        hasUnsaved={saveStatus === "dirty"}
        onClose={() => setRestorePrompt(null)}
        onConfirm={(mode, targetId) => void confirmRestore(mode, targetId)}
      />

      {compareState && (
        <VersionCompareView
          versionA={compareState.a}
          versionB={compareState.b}
          blueprintA={compareState.blueprintA}
          blueprintB={compareState.blueprintB}
          onClose={() => setCompareState(null)}
        />
      )}

      {previewVersion && (
        <div className="asset-dialog-overlay" onClick={() => { setPreviewVersion(null); setPreviewBlueprint(null); }}>
          <div className="asset-dialog version-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header">
              <h3><History size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--amber)" }} />Viewing version v{previewVersion.versionNumber}</h3>
              <button onClick={() => { setPreviewVersion(null); setPreviewBlueprint(null); }} aria-label="Close"><X size={15} /></button>
            </div>
            <div className="version-preview-banner">Viewing version v{previewVersion.versionNumber} — your current project has not changed</div>
            <div className="version-preview-body">
              {previewBlueprint ? (
                <>
                  <p className="page-dialog-hint">Pages in this version:</p>
                  {previewBlueprint.pages.map((page) => (
                    <div key={page.id} className="version-preview-page">
                      <span>{page.name} <em>{page.slug}</em></span>
                      <b>{page.elements.length} element{page.elements.length === 1 ? "" : "s"}</b>
                    </div>
                  ))}
                </>
              ) : (
                <p className="layers-empty">Loading version preview…</p>
              )}
            </div>
            <div className="asset-dialog-actions">
              <button className="primary" onClick={() => { setPreviewVersion(null); setPreviewBlueprint(null); requestRestore(previewVersion); }}>Restore this version</button>
              <button onClick={() => { setPreviewVersion(null); setPreviewBlueprint(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {recoveryData && (
        <div className="recovery-banner">
          <AlertTriangle size={16} />
          <span>Unsaved work was found from a previous session.</span>
          <button className="primary" onClick={recoverFromCrash}>Recover</button>
          <button onClick={discardRecovery}>Discard</button>
        </div>
      )}

      {sitePreviewOpen && sitePreviewDoc && (
        <SitePreview document={sitePreviewDoc} initialPageId={sitePreviewPageId} onClose={() => setSitePreviewOpen(false)} onNotify={notify} />
      )}

      {conflictState && (
        <div className="asset-dialog-overlay" onClick={() => setConflictState(null)}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Concurrent edit detected</h3><button onClick={() => setConflictState(null)} aria-label="Close"><X size={15} /></button></div>
            <div className="asset-delete-warning"><AlertTriangle size={15} /> Another collaborator saved a newer version while you were editing.</div>
            <p className="asset-dialog-copy">Your local changes are still intact. Choose how to proceed — nothing has been overwritten.</p>
            <div className="asset-dialog-actions column">
              <button className="primary" onClick={() => void resolveConflictReload()}>Reload latest version</button>
              <button className="danger" onClick={() => void resolveConflictOverwrite()}>Overwrite with my changes</button>
              <button onClick={() => setConflictState(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pageLimitBlock && (
        <div className="asset-dialog-overlay" onClick={() => setPageLimitBlock(null)}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Page limit reached</h3><button onClick={() => setPageLimitBlock(null)} aria-label="Close"><X size={15} /></button></div>
            <div className="asset-delete-warning"><AlertTriangle size={15} /> You've reached the {pageLimitBlock.plan} plan's limit of {pageLimitBlock.limit} pages per project.</div>
            <p className="asset-dialog-copy">You currently have {pageLimitBlock.current} page{pageLimitBlock.current === 1 ? "" : "s"}. Existing pages are preserved — nothing is deleted. Upgrade to {pageLimitBlock.nextPlan} to add more, or delete an unused page first.</p>
            <div className="asset-dialog-actions column">
              <button className="primary" onClick={() => { setPageLimitBlock(null); setUsageOpen(true); setUsageMinimized(false); }}>View plans & upgrade</button>
              <button onClick={() => setPageLimitBlock(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="forge-toast"><Check size={15} />{toast}</div>}
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string[]; text: string }) {
  return <article className="feature-card"><div className="feature-heading"><span>{icon}</span><h2>{title.map((line) => <span key={line}>{line}</span>)}</h2></div><p>{text}</p><a href="#">Learn more <ChevronRight size={13} /></a></article>;
}

function CanvasElementPreview({ element }: { element: CanvasElement }) {
  if (element.type === "Heading") return <h2>{element.content}</h2>;
  if (element.type === "Button") return <button>{element.content}</button>;
  if (element.type === "Image") {
    if (element.asset?.url) {
      return (
        <img
          src={element.asset.url}
          alt={element.asset.decorative ? "" : element.asset.altText}
          className="canvas-asset-media"
          style={{ width: "100%", height: element.height, objectFit: element.asset.objectFit, objectPosition: `${element.asset.focalX}% ${element.asset.focalY}%`, borderRadius: element.asset.borderRadius, opacity: element.asset.opacity / 100 }}
          loading={element.asset.lazyLoad ? "lazy" : undefined}
          aria-hidden={element.asset.decorative || undefined}
        />
      );
    }
    return <div className="placeholder-content"><ImageIcon size={28} /><span>{element.content}</span></div>;
  }
  if (element.type === "Video") {
    if (element.asset?.url) {
      return (
        <video
          src={element.asset.url}
          poster={element.asset.poster || undefined}
          controls={element.asset.controls}
          muted={element.asset.muted || element.asset.autoplay}
          loop={element.asset.loop}
          autoPlay={element.asset.autoplay}
          className="canvas-asset-media"
          style={{ width: "100%", height: element.height, objectFit: "cover", borderRadius: element.asset.borderRadius }}
          title={element.asset.accessibleTitle}
        />
      );
    }
    return <div className="placeholder-content"><Video size={28} /><span>{element.content}</span></div>;
  }
  if (element.type === "Document") {
    return (
      <div className="canvas-doc-card">
        <FileText size={18} />
        <span className="canvas-doc-name">{element.content}</span>
        <a href={element.asset?.url || undefined} target="_blank" rel="nofollow" download={element.asset?.name}>Download</a>
      </div>
    );
  }
  if (element.type === "Columns") return <div className="column-preview"><span>Column one</span><span>Column two</span></div>;
  if (element.type === "Form") {
    const formDef = element.form;
    const fields = formDef?.fields ?? [];
    const submitLabel = formDef?.fields.find((field) => field.type === "submit")?.label || formDef?.submitLabel || "Submit";
    return (
      <div className="form-preview">
        <b>{formDef?.name || element.content}</b>
        {fields.filter((field) => field.type !== "submit").map((field) => <span key={field.id}>{field.label || field.key}{field.required ? " *" : ""}</span>)}
        <button>{submitLabel}</button>
      </div>
    );
  }
  return <p>{element.content}</p>;
}

function ComponentInstanceView({ element, components }: { element: CanvasElement; components: ComponentDefinition[] }) {
  const instance = element.component;
  if (!instance) return null;
  const definition = resolveComponent(instance.componentId, components);
  if (!definition) return <div className="placeholder-content"><Boxes size={28} /><span>Missing component</span></div>;
  const resolved = applyInstanceOverrides(definition, instance);
  return (
    <div className="component-instance-view">
      <span className="component-badge">{definition.name}</span>
      <div className="component-instance-frame">
        {resolved.map((child) => (
          <div key={child.id} className="component-child" style={{ left: child.x, top: child.y, width: child.width, height: child.height }}>
            <CanvasElementPreview element={child} />
          </div>
        ))}
      </div>
    </div>
  );
}

const LINKABLE_TYPES = new Set(["Button", "Text", "Image", "Video", "Document", "Heading"]);

function PageLinkPicker({ pages, value, onChange }: { pages: SandboxPage[]; value: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = pages.find((page) => page.id === value);
  const filtered = pages.filter((page) => page.name.toLowerCase().includes(search.toLowerCase()) || page.slug.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="page-link-picker">
      <button onClick={() => setOpen((current) => !current)}>{selected ? `${selected.name} ${selected.slug === "/" ? "(/)" : selected.slug}` : "Choose a page…"}</button>
      {open && (
        <div className="page-link-dropdown">
          <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages…" />
          {filtered.map((page) => (
            <button key={page.id} onClick={() => { onChange(page.id); setOpen(false); }}>{page.name}<em>{page.slug}</em></button>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertiesPanel({ selected, element, pages, condensed, onUpdate, onNotify, onReplaceElement }: {
  selected: string;
  element: CanvasElement | null;
  pages: SandboxPage[];
  condensed: boolean;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onNotify: (message: string) => void;
  onReplaceElement: (element: CanvasElement) => void;
}) {
  const [open, setOpen] = useState("Layout");
  const sections = ["Width", "Padding", "Background", "Typography", "Responsive", "Animation"];
  const asset = element?.asset;
  const updateAsset = (patch: Partial<CanvasAssetRef>) => {
    if (asset) onUpdate({ asset: { ...asset, ...patch } });
  };

  const linkable = element && LINKABLE_TYPES.has(element.type);
  const link = element?.link ?? EMPTY_LINK;
  const updateLink = (patch: Partial<ElementLink>) => {
    if (linkable) onUpdate({ link: { ...link, ...patch } });
  };
  const linkCheck = linkable ? validateLink(link, pages) : { ok: true as boolean, error: undefined as string | undefined };

  return (
    <div className={`properties-card ${condensed ? "condensed" : "expanded"}`}>
      <div className="properties-heading"><h3>Properties</h3><span>#{element?.id.split("-")[0] ?? selected.toLowerCase()}-1</span></div>
      {element && (
        <div className="live-properties">
          <label>Name<input value={element.name} onChange={(event) => onUpdate({ name: event.target.value })} /></label>
          <label>Content<textarea value={element.content} onChange={(event) => onUpdate({ content: event.target.value })} /></label>
          <div className="property-number-grid">
            <label>X<input type="number" value={Math.round(element.x)} onChange={(event) => onUpdate({ x: Number(event.target.value) })} /></label>
            <label>Y<input type="number" value={Math.round(element.y)} onChange={(event) => onUpdate({ y: Number(event.target.value) })} /></label>
            <label>Width<input type="number" min="40" value={element.width} onChange={(event) => onUpdate({ width: Math.max(40, Number(event.target.value)) })} /></label>
            <label>Height<input type="number" min="24" value={element.height} onChange={(event) => onUpdate({ height: Math.max(24, Number(event.target.value)) })} /></label>
          </div>
          <div className="property-colour-grid">
            <label>Background<input type="color" value={element.background === "transparent" ? "#ffffff" : element.background} onChange={(event) => onUpdate({ background: event.target.value })} /></label>
            <label>Text<input type="color" value={element.color} onChange={(event) => onUpdate({ color: event.target.value })} /></label>
          </div>
          {(element.type === "Image" || element.type === "Video" || element.type === "Document") && asset && (
            <div className="asset-properties">
              <button className="asset-replace-button" onClick={() => onReplaceElement(element)}><Upload size={13} /> Replace {element.type === "Image" ? "image" : element.type === "Video" ? "video" : "document"}</button>

              {element.type === "Image" && (
                <>
                  <label>Alt text<input value={asset.altText} onChange={(event) => updateAsset({ altText: event.target.value })} placeholder={asset.decorative ? "Decorative image — alt text intentionally empty" : "Describe the image"} disabled={asset.decorative} /></label>
                  <div className="asset-prop-row">
                    <label>Object fit<select value={asset.objectFit} onChange={(event) => updateAsset({ objectFit: event.target.value as CanvasAssetRef["objectFit"] })}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></label>
                    <label>Border radius<input type="number" min="0" value={asset.borderRadius} onChange={(event) => updateAsset({ borderRadius: Math.max(0, Number(event.target.value)) })} /></label>
                  </div>
                  <label>Opacity <b>{asset.opacity}%</b><input type="range" min="0" max="100" value={asset.opacity} onChange={(event) => updateAsset({ opacity: Number(event.target.value) })} /></label>
                  <label>Focal point</label>
                  <div className="focal-grid">
                    {[0, 25, 50, 75, 100].map((fy) => [0, 25, 50, 75, 100].map((fx) => (
                      <button key={`${fx}-${fy}`} className={asset.focalX === fx && asset.focalY === fy ? "active" : ""} onClick={() => updateAsset({ focalX: fx, focalY: fy })} aria-label={`Focal point ${fx}% ${fy}%`} />
                    )))}
                  </div>
                  <label>Link URL<input value={asset.linkUrl} onChange={(event) => updateAsset({ linkUrl: event.target.value })} placeholder="https://…" /></label>
                  <label className="asset-check"><input type="checkbox" checked={asset.linkNewTab} onChange={(event) => updateAsset({ linkNewTab: event.target.checked })} /> Open link in new tab</label>
                  <label className="asset-check"><input type="checkbox" checked={asset.lazyLoad} onChange={(event) => updateAsset({ lazyLoad: event.target.checked })} /> Lazy loading</label>
                  <label className="asset-check"><input type="checkbox" checked={asset.decorative} onChange={(event) => updateAsset({ decorative: event.target.checked })} /> Decorative image</label>
                  {asset.decorative && <p className="asset-hint">Decorative images keep an intentionally empty alt text so screen readers skip them.</p>}
                </>
              )}

              {element.type === "Video" && (
                <>
                  <label>Poster image URL<input value={asset.poster} onChange={(event) => updateAsset({ poster: event.target.value })} placeholder="https://…" /></label>
                  <label>Accessible title<input value={asset.accessibleTitle} onChange={(event) => updateAsset({ accessibleTitle: event.target.value })} placeholder="Video title" /></label>
                  <label className="asset-check"><input type="checkbox" checked={asset.controls} onChange={(event) => updateAsset({ controls: event.target.checked })} /> Controls</label>
                  <label className="asset-check"><input type="checkbox" checked={asset.muted} onChange={(event) => updateAsset({ muted: event.target.checked })} /> Muted</label>
                  <label className="asset-check"><input type="checkbox" checked={asset.loop} onChange={(event) => updateAsset({ loop: event.target.checked })} /> Loop</label>
                  <label className="asset-check"><input type="checkbox" checked={asset.autoplay} onChange={(event) => updateAsset({ autoplay: event.target.checked, muted: event.target.checked ? true : asset.muted })} /> Autoplay</label>
                  {asset.autoplay && <p className="asset-hint">Autoplay requires muted mode, which is enabled automatically.</p>}
                </>
              )}
            </div>
          )}

          {linkable && (
            <div className="asset-properties link-properties">
              <div className="asset-prop-row">
                <label>Link type
                  <select value={link.type} onChange={(event) => updateLink({ type: event.target.value as ElementLink["type"] })}>
                    <option value="none">None</option>
                    <option value="page">Website page</option>
                    <option value="section">Page section</option>
                    <option value="external">External URL</option>
                    <option value="email">Email</option>
                    <option value="tel">Telephone</option>
                    <option value="file">File download</option>
                  </select>
                </label>
                <label className="asset-check link-newtab-check">
                  <input type="checkbox" checked={link.newTab} onChange={(event) => updateLink({ newTab: event.target.checked })} />
                  Open in new tab
                </label>
              </div>
              {link.type === "page" && <label>Destination page<PageLinkPicker pages={pages} value={link.pageId} onChange={(pageId) => updateLink({ pageId })} /></label>}
              {link.type === "section" && <label>Section ID<input value={link.sectionId} onChange={(event) => updateLink({ sectionId: event.target.value })} placeholder="#section-name" /></label>}
              {link.type === "external" && <label>External URL<input value={link.url} onChange={(event) => updateLink({ url: event.target.value })} placeholder="https://…" /></label>}
              {link.type === "email" && <label>Email address<input value={link.url} onChange={(event) => updateLink({ url: event.target.value })} placeholder="hello@example.com" /></label>}
              {link.type === "tel" && <label>Phone number<input value={link.url} onChange={(event) => updateLink({ url: event.target.value })} placeholder="+1 555 000 0000" /></label>}
              {link.type === "file" && <label>File URL<input value={link.url} onChange={(event) => updateLink({ url: event.target.value })} placeholder="https://…/file.pdf" /></label>}
              {!linkCheck.ok && <p className="asset-hint link-error">{linkCheck.error}</p>}
            </div>
          )}
        </div>
      )}
      {element?.type === "Form" && (
        <div className="form-builder-wrap">
          <FormBuilderPanel
            form={element.form ?? defaultFormDefinition(element.content)}
            onChange={(form) => onUpdate({ form })}
            onNotify={onNotify}
          />
        </div>
      )}
      <button className="property-section open" onClick={() => setOpen(open === "Layout" ? "" : "Layout")}><ChevronDown size={15} />Layout</button>
      {open === "Layout" && <div className="layout-controls"><ControlRow label="Display"><Grid2X2 size={14} /><Monitor size={14} /><Smartphone size={14} /><ArrowLeftRight size={14} /><Square size={14} /></ControlRow><ControlRow label="Direction"><button onClick={() => onNotify("Horizontal layout selected")}><ArrowLeftRight size={15} /></button><button onClick={() => onNotify("Vertical layout selected")}><ArrowDownUp size={15} /></button></ControlRow><ControlRow label="Align"><AlignLeft size={14} /><AlignCenter size={14} /><AlignRight size={14} /><PanelTop size={14} /><List size={14} /></ControlRow><div className="gap-control"><span>Gap</span><input value="32" readOnly /><em>px</em></div></div>}
      {sections.map((section) => <div key={section}><button className="property-section" onClick={() => setOpen(open === section ? "" : section)}><ChevronRight className={open === section ? "rotate" : ""} size={15} />{section}{section === "Width" && <span className="responsive-icons"><Monitor size={13} /><Tablet size={13} /><Smartphone size={13} /></span>}</button>{open === section && <div className="property-detail">Edit {section.toLowerCase()} settings for the selected {selected}.</div>}</div>)}
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="control-row"><span>{label}</span><div>{children}</div></div>;
}