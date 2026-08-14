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
import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import "./concept-sandbox.css";

type ElementItem = { name: string; icon: typeof Type };

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

export default function ForgeSandbox() {
  const [activeTool, setActiveTool] = useState("Add");
  const [selectedLayer, setSelectedLayer] = useState("Hero");
  const [rightTab, setRightTab] = useState<"ai" | "properties">("ai");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(100);
  const [bottomTab, setBottomTab] = useState("Activity");
  const [prompt, setPrompt] = useState("Turn this hero into two columns and add a booking button");
  const [proposal, setProposal] = useState<"ready" | "applied" | "rejected">("ready");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropped, setDropped] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const artboardWidth = useMemo(() => viewport === "mobile" ? "390px" : viewport === "tablet" ? "760px" : "900px", [viewport]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const startDrag = (event: DragEvent, name: string) => {
    event.dataTransfer.setData("text/forge-element", name);
    event.dataTransfer.effectAllowed = "copy";
    setDragging(name);
  };

  const dropElement = (event: DragEvent) => {
    event.preventDefault();
    const item = event.dataTransfer.getData("text/forge-element") || dragging;
    if (!item) return;
    setDropped((current) => [...current, item]);
    setDragging(null);
    setSelectedLayer(item);
    notify(`${item} added to the page`);
  };

  return (
    <main className="forge-app">
      <header className="topbar">
        <div className="brand-block"><Gem className="brand-mark" strokeWidth={3} /><span className="brand-name">FORGE</span></div>
        <button className="project-name">Portfolio Website <ChevronDown size={14} /></button>
        <div className="save-state"><Check size={17} /> Saved</div>
        <div className="history-actions">
          <button onClick={() => notify("Last change undone")}><Undo2 size={16} /> Undo</button>
          <button className="muted" onClick={() => notify("Change restored")}><Redo2 size={16} /> Redo</button>
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
        <button className="publish-button" onClick={() => notify("Project ready to publish")}><Upload size={16} /> Publish</button>
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
              {["Navigation", "Hero", "Features", "Footer", ...dropped].map((layer, index) => (
                <button key={`${layer}-${index}`} className={selectedLayer === layer ? "selected" : ""} onClick={() => setSelectedLayer(layer)}>
                  <span className="tree-line" />{layer === "Hero" ? <BoxSelect size={15} /> : <PanelTop size={15} />}<span>{layer}</span>{selectedLayer === layer && <i />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="canvas-shell">
          <div className="floating-tools">
            <button title="Move"><Move size={17} /></button><button title="Duplicate"><Copy size={17} /></button>
            <button title="Align left"><AlignLeft size={17} /></button><button title="Align centre"><AlignCenter size={17} /></button>
            <button title="Align right"><AlignRight size={17} /></button><button title="Distribute"><List size={17} /></button>
            <button className="danger" title="Delete"><Trash2 size={17} /></button>
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
                <section className={`site-hero ${proposal === "applied" ? "applied" : ""}`} onClick={() => setSelectedLayer("Hero")}>
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
                <section className="features-row" onClick={() => setSelectedLayer("Features")}>
                  <FeatureCard icon={<Zap />} title={["AI-Assisted", "Workflows"]} text="Let AI handle the heavy lifting while you stay in control of every detail." />
                  <FeatureCard icon={<Box />} title={["Drag. Drop.", "Deploy."]} text="Build visually, customise freely, and deploy anywhere with one click." />
                  <FeatureCard icon={<ShieldCheck />} title={["Secure by", "Design"]} text="Enterprise-grade security and performance built in." />
                </section>
              </article>
            </div>
          </div>
        </section>

        <aside className="right-panel">
          <div className="right-tabs"><button className={rightTab === "ai" ? "active" : ""} onClick={() => setRightTab("ai")}>AI Assistant</button><button className={rightTab === "properties" ? "active" : ""} onClick={() => setRightTab("properties")}>Properties</button></div>
          {rightTab === "ai" && (
            <>
              <div className="ai-prompt-box"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} /><button onClick={() => { setProposal("ready"); notify("AI proposal refreshed"); }}><Send size={17} /></button></div>
              <div className={`proposal-card ${proposal}`}>
                <h3><Sparkles size={18} /> {proposal === "applied" ? "Changes applied" : proposal === "rejected" ? "Changes rejected" : "Proposed changes"}</h3>
                {["Two-column hero", "Booking CTA", "Responsive spacing"].map((item) => <p key={item}><span><Check size={12} /></span>{item}</p>)}
                <div className="proposal-actions"><button onClick={() => notify("Change preview active")}>Preview changes</button><button className="apply" onClick={() => { setProposal("applied"); notify("AI changes applied"); }}>Apply</button><button onClick={() => { setProposal("rejected"); notify("Proposal rejected"); }}>Reject</button></div>
              </div>
            </>
          )}
          <PropertiesPanel selected={selectedLayer} condensed={rightTab === "ai"} onNotify={notify} />
        </aside>
      </section>

      <footer className="statusbar">
        <div className="status-tabs">
          {[{ n: "Activity", i: Activity }, { n: "Logs", i: Logs }, { n: "Problems", i: Circle }, { n: "Changes", i: RotateCcw }, { n: "Console", i: TerminalSquare }].map(({ n, i: Icon }) => (
            <button key={n} className={bottomTab === n ? "active" : ""} onClick={() => setBottomTab(n)}><Icon size={16} />{n}{n === "Problems" && <b>0</b>}{n === "Changes" && <b>3</b>}</button>
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

function PropertiesPanel({ selected, condensed, onNotify }: { selected: string; condensed: boolean; onNotify: (message: string) => void }) {
  const [open, setOpen] = useState("Layout");
  const sections = ["Width", "Padding", "Background", "Typography", "Responsive", "Animation"];
  return (
    <div className={`properties-card ${condensed ? "condensed" : "expanded"}`}>
      <div className="properties-heading"><h3>Properties</h3><span>#{selected.toLowerCase()}-1</span></div>
      <button className="property-section open" onClick={() => setOpen(open === "Layout" ? "" : "Layout")}><ChevronDown size={15} />Layout</button>
      {open === "Layout" && <div className="layout-controls"><ControlRow label="Display"><Grid2X2 size={14} /><Monitor size={14} /><Smartphone size={14} /><ArrowLeftRight size={14} /><Square size={14} /></ControlRow><ControlRow label="Direction"><button onClick={() => onNotify("Horizontal layout selected")}><ArrowLeftRight size={15} /></button><button onClick={() => onNotify("Vertical layout selected")}><ArrowDownUp size={15} /></button></ControlRow><ControlRow label="Align"><AlignLeft size={14} /><AlignCenter size={14} /><AlignRight size={14} /><PanelTop size={14} /><List size={14} /></ControlRow><div className="gap-control"><span>Gap</span><input value="32" readOnly /><em>px</em></div></div>}
      {sections.map((section) => <div key={section}><button className="property-section" onClick={() => setOpen(open === section ? "" : section)}><ChevronRight className={open === section ? "rotate" : ""} size={15} />{section}{section === "Width" && <span className="responsive-icons"><Monitor size={13} /><Tablet size={13} /><Smartphone size={13} /></span>}</button>{open === section && <div className="property-detail">Edit {section.toLowerCase()} settings for the selected {selected}.</div>}</div>)}
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="control-row"><span>{label}</span><div>{children}</div></div>;
}
