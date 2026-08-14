import {
  Activity, AlignCenter, AlignLeft, AlignRight, AppWindow, ArrowDownUp,
  ArrowLeftRight, Box, BoxSelect, Check, ChevronDown, ChevronRight, Circle,
  Columns3, Command, Copy, Database, Eye, FileText, FolderOpen, FormInput,
  Gem, Grid2X2, Heading1, Image as ImageIcon, Layers3, LayoutDashboard,
  List, Logs, Monitor, MousePointer2, Move, PanelTop, Plus, Redo2,
  RotateCcw, Search, Send, Settings, ShieldCheck, Smartphone, Sparkles,
  Square, Tablet, TerminalSquare, Trash2, Type, Undo2, Upload, UserRound,
  Video, X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import "./concept-sandbox.css";
import {
  loadSandboxDocument,
  saveSandboxDocument,
  type CanvasElement,
  type CanvasElementKind,
  type SandboxDocument,
} from "./sandboxPersistence";
import { analyseSandboxPrompt, type SandboxAiProposal, type SandboxAiOperation } from "./sandboxAi";

type ElementItem = { name: CanvasElementKind; icon: typeof Type };
type EditorHistory = { past: CanvasElement[][]; present: CanvasElement[]; future: CanvasElement[][] };

const elementItems: ElementItem[] = [
  { name: "Heading", icon: Heading1 }, { name: "Text", icon: Type },
  { name: "Button", icon: Square }, { name: "Image", icon: ImageIcon },
  { name: "Video", icon: Video }, { name: "Container", icon: BoxSelect },
  { name: "Columns", icon: Columns3 }, { name: "Form", icon: FormInput },
];

const railItems = [
  { name: "Add", icon: Plus }, { name: "Pages", icon: FileText },
  { name: "Layers", icon: Layers3 }, { name: "Assets", icon: FolderOpen },
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
};

const emptyHistory: EditorHistory = { past: [], present: [], future: [] };

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
  };
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
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [promptBrief, setPromptBrief] = useState({ goal: "generate more enquiries", audience: "small business owners", style: "modern and confident", section: "hero and trust section", action: "Book a consultation" });
  const [dragging, setDragging] = useState<string | null>(null);
  const [history, setHistory] = useState<EditorHistory>(emptyHistory);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"loading" | "dirty" | "saving" | "local" | "cloud" | "error">("loading");
  const [toast, setToast] = useState<string | null>(null);

  const artboardWidth = useMemo(() => viewport === "mobile" ? "390px" : viewport === "tablet" ? "760px" : "900px", [viewport]);
  const selectedElement = useMemo(() => history.present.find((element) => element.id === selectedElementId) ?? null, [history.present, selectedElementId]);

  useEffect(() => {
    let active = true;
    void loadSandboxDocument().then((document) => {
      if (!active) return;
      if (document) {
        setHistory({ past: [], present: document.elements, future: [] });
        setViewport(document.viewport);
      }
      setSaveStatus(document ? "local" : "dirty");
    });
    return () => { active = false; };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const commitElements = (next: CanvasElement[] | ((current: CanvasElement[]) => CanvasElement[])) => {
    setHistory((current) => ({
      past: [...current.past, current.present].slice(-50),
      present: typeof next === "function" ? next(current.present) : next,
      future: [],
    }));
    setSaveStatus("dirty");
  };

  const undo = () => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      setSaveStatus("dirty");
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  };

  const redo = () => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      setSaveStatus("dirty");
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
  };

  const saveProject = async () => {
    const document: SandboxDocument = {
      schemaVersion: 1,
      projectName: "Portfolio Website",
      viewport,
      elements: history.present,
      updatedAt: new Date().toISOString(),
    };
    setSaveStatus("saving");
    try {
      const result = await saveSandboxDocument(document);
      setSaveStatus(result.storage);
      notify(result.storage === "cloud" ? "Saved to Supabase" : "Saved locally — sign in for cloud sync");
    } catch {
      setSaveStatus("error");
      notify("Local save complete; cloud sync needs attention");
    }
  };

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
    commitElements((current) => current.filter((element) => element.id !== selectedElementId));
    setSelectedElementId(null);
    setSelectedLayer("Hero");
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

  const requestAiProposal = async () => {
    if (!prompt.trim()) return notify("Describe the change you want first");
    setAiBusy(true);
    setProposalStatus("ready");
    try {
      const nextProposal = await analyseSandboxPrompt(prompt, { elements: history.present, selectedElement, viewport });
      setAiProposal(nextProposal);
      notify(`${nextProposal.changes.length} change${nextProposal.changes.length === 1 ? "" : "s"} proposed`);
    } finally {
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

  const applyAiProposal = () => {
    if (!aiProposal) return;
    const result = applyAiOperations(aiProposal.operations, history.present);
    commitElements(result.next);
    const viewportChange = aiProposal.operations.find((operation) => operation.kind === "viewport");
    if (viewportChange?.kind === "viewport") setViewport(viewportChange.viewport);
    if (result.lastSelectedId) setSelectedElementId(result.lastSelectedId);
    setProposalStatus("applied");
    notify("AI changes applied to the canvas");
  };

  const buildPrompt = () => {
    setPrompt(`Improve this ${promptBrief.section} for ${promptBrief.audience}. The goal is to ${promptBrief.goal}. Use a ${promptBrief.style} visual style and make “${promptBrief.action}” the primary call to action. Keep the result responsive and accessible.`);
    setPromptBuilderOpen(false);
    notify("Prompt added — review it, then generate changes");
  };

  return (
    <main className="forge-app">
      <header className="topbar">
        <div className="brand-block"><Gem className="brand-mark" strokeWidth={3} /><span className="brand-name">FORGE</span></div>
        <button className="project-name">Portfolio Website <ChevronDown size={14} /></button>
        <button className={`save-state ${saveStatus}`} onClick={saveProject} disabled={saveStatus === "saving" || saveStatus === "loading"}>
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
        <button className="version-button">v12 <ChevronDown size={13} /></button>
        <div className="topbar-spacer short" />
        <button className="top-action" onClick={() => notify("Preview opened")}><Eye size={16} /> Preview</button>
        <button className="top-action" onClick={() => notify("Build queued")}><TerminalSquare size={16} /> Build</button>
        <button className="publish-button" onClick={() => { void saveProject(); notify("Project saved and ready for publishing"); }}><Upload size={16} /> Publish</button>
        <span className="online-dot" title="All services online" />
      </header>

      <section className="workspace">
        <aside className="left-shell">
          <nav className="tool-rail">
            {railItems.map(({ name, icon: Icon }) => (
              <button key={name} className={activeTool === name ? "active" : ""} onClick={() => setActiveTool(name)}><Icon size={21} /><span>{name}</span></button>
            ))}
          </nav>
          <div className="elements-panel">
            <div className="panel-title-row"><h2>{activeTool === "Add" ? "Add elements" : activeTool}</h2><button aria-label="Close panel"><X size={16} /></button></div>
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
              </>
            ) : (
              <div className="empty-tool-state"><AppWindow size={34} /><strong>{activeTool}</strong><span>Manage project {activeTool.toLowerCase()} here.</span></div>
            )}
            <div className="pages-heading"><span>Pages</span><button onClick={() => notify("New page created")}><Plus size={17} /></button></div>
            <button className="home-row"><ChevronDown size={14} /><LayoutDashboard size={15} />Home<span>•••</span></button>
            <div className="layer-tree">
              {["Navigation", "Hero", "Features", "Footer"].map((layer, index) => (
                <button key={`${layer}-${index}`} className={selectedLayer === layer && !selectedElementId ? "selected" : ""} onClick={() => { setSelectedLayer(layer); setSelectedElementId(null); }}>
                  <span className="tree-line" />{layer === "Hero" ? <BoxSelect size={15} /> : <PanelTop size={15} />}<span>{layer}</span>{selectedLayer === layer && <i />}
                </button>
              ))}
              {history.present.map((element) => (
                <button key={element.id} className={selectedElementId === element.id ? "selected" : ""} onClick={() => { setSelectedLayer(element.name); setSelectedElementId(element.id); }}>
                  <span className="tree-line" /><BoxSelect size={15} /><span>{element.name}</span>{selectedElementId === element.id && <i />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="canvas-shell">
          <div className="floating-tools">
            <button title="Move"><Move size={17} /></button><button title="Duplicate" onClick={duplicateSelected}><Copy size={17} /></button>
            <button title="Align left"><AlignLeft size={17} /></button><button title="Align centre"><AlignCenter size={17} /></button>
            <button title="Align right"><AlignRight size={17} /></button><button title="Distribute"><List size={17} /></button>
            <button className="danger" title="Delete" onClick={deleteSelected}><Trash2 size={17} /></button>
          </div>
          <div className="canvas-scroll">
            <div className={`artboard-frame ${viewport}`} style={{ width: artboardWidth, transform: `scale(${zoom / 100})` }} onDragOver={(event) => event.preventDefault()} onDrop={dropElement}>
              <div className="selection-label">{selectedLayer}</div>
              <span className="handle tl" /><span className="handle tr" /><span className="handle bl" /><span className="handle br" /><span className="handle tm" /><span className="handle bm" />
              <article className="site-artboard">
                <nav className="site-nav">
                  <div className="site-brand"><Gem size={22} fill="#f5a500" color="#101820" /><b>FORGE</b></div>
                  <div className="site-links"><span>Product</span><span>Solutions⌄</span><span>Resources</span><span>Pricing</span><span>About</span></div>
                  <div className="site-nav-actions"><button>Sign in</button><button>Start Building</button></div>
                </nav>
                <section className={`site-hero ${proposalStatus === "applied" ? "applied" : ""}`} onClick={() => { setSelectedLayer("Hero"); setSelectedElementId(null); }}>
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
                <div className={`drop-zone ${dragging ? "dragging" : ""}`}><span><Circle size={10} /> {dragging ? `Drop ${dragging} here` : "Drop section here"}</span></div>
                <section className="features-row" onClick={() => { setSelectedLayer("Features"); setSelectedElementId(null); }}>
                  <FeatureCard icon={<Zap />} title={["AI-Assisted", "Workflows"]} text="Let AI handle the heavy lifting while you stay in control of every detail." />
                  <FeatureCard icon={<Box />} title={["Drag. Drop.", "Deploy."]} text="Build visually, customise freely, and deploy anywhere with one click." />
                  <FeatureCard icon={<ShieldCheck />} title={["Secure by", "Design"]} text="Enterprise-grade security and performance built in." />
                </section>
                <div className="canvas-elements" aria-label="Dropped page elements">
                  {history.present.map((element) => (
                    <div
                      key={element.id}
                      draggable
                      className={`canvas-element type-${element.type.toLowerCase()} ${selectedElementId === element.id ? "selected" : ""}`}
                      style={{ left: element.x, top: element.y, width: element.width, minHeight: element.height, background: element.background, color: element.color }}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData("text/forge-instance", element.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedElementId(element.id);
                        setSelectedLayer(element.name);
                      }}
                    >
                      <CanvasElementPreview element={element} />
                      {selectedElementId === element.id && <span className="element-drag-label"><Move size={12} /> Drag to move</span>}
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="right-tabs"><button className={rightTab === "ai" ? "active" : ""} onClick={() => setRightTab("ai")}>AI Assistant</button><button className={rightTab === "properties" ? "active" : ""} onClick={() => setRightTab("properties")}>Properties</button></div>
          {rightTab === "ai" && (
            <>
              <div className="ai-prompt-box"><textarea aria-label="AI website instruction" value={prompt} onChange={(event) => setPrompt(event.target.value)} /><button disabled={aiBusy} onClick={() => void requestAiProposal()}>{aiBusy ? <RotateCcw className="spin" size={17} /> : <Send size={17} />}</button></div>
              <div className="ai-tools-row"><button onClick={() => setPromptBuilderOpen((open) => !open)}><Sparkles size={14} />Prompt Builder</button><span>{aiProposal?.source === "forge-ai" ? "Forge AI" : "Smart local mode"}</span></div>
              {promptBuilderOpen && (
                <div className="prompt-builder">
                  <div className="prompt-builder-heading"><strong>Build a better instruction</strong><button onClick={() => setPromptBuilderOpen(false)}><X size={14} /></button></div>
                  <label>Goal<input value={promptBrief.goal} onChange={(event) => setPromptBrief((brief) => ({ ...brief, goal: event.target.value }))} /></label>
                  <label>Audience<input value={promptBrief.audience} onChange={(event) => setPromptBrief((brief) => ({ ...brief, audience: event.target.value }))} /></label>
                  <label>Style<input value={promptBrief.style} onChange={(event) => setPromptBrief((brief) => ({ ...brief, style: event.target.value }))} /></label>
                  <label>Section<input value={promptBrief.section} onChange={(event) => setPromptBrief((brief) => ({ ...brief, section: event.target.value }))} /></label>
                  <label>Primary action<input value={promptBrief.action} onChange={(event) => setPromptBrief((brief) => ({ ...brief, action: event.target.value }))} /></label>
                  <button className="build-prompt-button" onClick={buildPrompt}>Use this prompt</button>
                </div>
              )}
              <div className={`proposal-card ${proposalStatus} ${aiProposal ? "has-proposal" : "empty"}`}>
                <h3><Sparkles size={18} /> {proposalStatus === "applied" ? "Changes applied" : proposalStatus === "rejected" ? "Changes rejected" : aiProposal ? aiProposal.title : "Ready for instructions"}</h3>
                {aiProposal ? aiProposal.changes.map((item) => <p key={item}><span><Check size={12} /></span>{item}</p>) : <small>Describe a change or use Prompt Builder. Forge will prepare a reviewable plan before touching the canvas.</small>}
                <div className="proposal-actions"><button disabled={!aiProposal} onClick={() => notify(aiProposal?.summary ?? "Create a proposal first")}>Preview changes</button><button disabled={!aiProposal || proposalStatus === "applied"} className="apply" onClick={applyAiProposal}>Apply</button><button disabled={!aiProposal} onClick={() => { setProposalStatus("rejected"); notify("Proposal rejected"); }}>Reject</button></div>
              </div>
            </>
          )}
          <PropertiesPanel selected={selectedLayer} element={selectedElement} condensed={rightTab === "ai"} onUpdate={updateSelected} onNotify={notify} />
        </aside>
      </section>

      <footer className="statusbar">
        <div className="status-tabs">
          {[{ n: "Activity", i: Activity }, { n: "Logs", i: Logs }, { n: "Problems", i: Circle }, { n: "Changes", i: RotateCcw }, { n: "Console", i: TerminalSquare }].map(({ n, i: Icon }) => (
            <button key={n} className={bottomTab === n ? "active" : ""} onClick={() => setBottomTab(n)}><Icon size={16} />{n}{n === "Problems" && <b>0</b>}{n === "Changes" && <b>{history.present.length}</b>}</button>
          ))}
        </div>
        <div className="preview-ready"><span />Preview ready</div>
        <div className="service-list">{services.map((service) => <button key={service}><span />{service}</button>)}</div>
        <button className="settings-button" onClick={() => notify("System settings opened")}><Settings size={20} /></button>
      </footer>
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
  if (element.type === "Image") return <div className="placeholder-content"><ImageIcon size={28} /><span>{element.content}</span></div>;
  if (element.type === "Video") return <div className="placeholder-content"><Video size={28} /><span>{element.content}</span></div>;
  if (element.type === "Columns") return <div className="column-preview"><span>Column one</span><span>Column two</span></div>;
  if (element.type === "Form") return <div className="form-preview"><b>{element.content}</b><span>Name</span><span>Email</span><button>Submit</button></div>;
  return <p>{element.content}</p>;
}

function PropertiesPanel({ selected, element, condensed, onUpdate, onNotify }: {
  selected: string;
  element: CanvasElement | null;
  condensed: boolean;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onNotify: (message: string) => void;
}) {
  const [open, setOpen] = useState("Layout");
  const sections = ["Width", "Padding", "Background", "Typography", "Responsive", "Animation"];
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
