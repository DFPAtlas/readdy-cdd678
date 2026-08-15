import { ArrowLeftRight, FileText, LayoutGrid, List, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { SandboxDocument, SandboxPage } from "./sandboxPersistence";
import { computeVersionDiff, type VersionEntry } from "./sandboxVersions";

type Tab = "summary" | "changes" | "visual";

function PageThumb({ page, viewport }: { page: SandboxPage; viewport: "desktop" | "tablet" | "mobile" }) {
  const width = viewport === "mobile" ? "72px" : viewport === "tablet" ? "132px" : "172px";
  return (
    <div className="version-page-thumb" style={{ width }}>
      <div className="version-page-thumb-name">{page.name}</div>
      <div className="version-page-thumb-body">
        {page.elements.filter((element) => !element.parentId).slice(0, 18).map((element) => (
          <div key={element.id} className="version-thumb-element" style={{ left: Math.max(2, element.x / 9), top: Math.max(18, element.y / 9), width: element.width / 9, height: element.height / 9, background: element.type === "Button" ? "#f5a400" : element.type === "Image" || element.type === "Video" ? "#ffe6b8" : "#eef1f4" }}>
            <span>{element.type === "Heading" || element.type === "Text" || element.type === "Button" ? element.content : ""}</span>
          </div>
        ))}
        {page.elements.length === 0 && <em>Empty page</em>}
      </div>
    </div>
  );
}

export default function VersionCompareView({ versionA, versionB, blueprintA, blueprintB, onClose }: {
  versionA: VersionEntry;
  versionB: VersionEntry;
  blueprintA: SandboxDocument | null;
  blueprintB: SandboxDocument | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [pageId, setPageId] = useState<string | null>(null);

  const diff = useMemo(() => {
    if (blueprintA && blueprintB) return computeVersionDiff(blueprintA, blueprintB);
    return null;
  }, [blueprintA, blueprintB]);

  const pageA = useMemo(() => {
    if (!blueprintA) return null;
    return pageId ? blueprintA.pages.find((page) => page.id === pageId) ?? blueprintA.pages[0] : blueprintA.pages[0];
  }, [blueprintA, pageId]);
  const pageB = useMemo(() => {
    if (!blueprintB) return null;
    return pageId ? blueprintB.pages.find((page) => page.id === pageId) ?? blueprintB.pages[0] : blueprintB.pages[0];
  }, [blueprintB, pageId]);

  const pageOptions = useMemo(() => {
    const names = new Map<string, string>();
    blueprintA?.pages.forEach((page) => names.set(page.id, page.name));
    blueprintB?.pages.forEach((page) => { if (!names.has(page.id)) names.set(page.id, page.name); });
    return Array.from(names.entries());
  }, [blueprintA, blueprintB]);

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="version-compare-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3><ArrowLeftRight size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--amber)" }} />Compare versions</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="version-compare-versions">
          <div className="version-compare-version"><b>Version A</b><span>v{versionA.versionNumber} {versionA.label ? `· ${versionA.label}` : ""}</span><em>{versionA.changeSummary ?? versionA.source}</em></div>
          <div className="version-compare-version right"><b>Version B</b><span>v{versionB.versionNumber} {versionB.label ? `· ${versionB.label}` : ""}</span><em>{versionB.changeSummary ?? versionB.source}</em></div>
        </div>
        <div className="version-compare-tabs">
          <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}><LayoutGrid size={13} />Summary</button>
          <button className={tab === "changes" ? "active" : ""} onClick={() => setTab("changes")}><List size={13} />Changes</button>
          <button className={tab === "visual" ? "active" : ""} onClick={() => setTab("visual")}><FileText size={13} />Visual</button>
        </div>

        {tab === "summary" && diff && (
          <div className="version-compare-body">
            <div className="version-diff-grid">
              <div className="version-diff-cell"><b>{diff.pageAdditions.length}</b><span>Pages added</span></div>
              <div className="version-diff-cell"><b>{diff.pageRemovals.length}</b><span>Pages removed</span></div>
              <div className="version-diff-cell"><b>{diff.elementAdditions}</b><span>Elements added</span></div>
              <div className="version-diff-cell"><b>{diff.elementRemovals}</b><span>Elements removed</span></div>
              <div className="version-diff-cell"><b>{diff.changedText}</b><span>Text changed</span></div>
              <div className="version-diff-cell"><b>{diff.changedAssets}</b><span>Assets changed</span></div>
            </div>
            {diff.summary.length > 0 && (
              <div className="version-diff-summary">
                {diff.summary.map((line) => <p key={line}>{line}</p>)}
              </div>
            )}
            {diff.summary.length === 0 && <p className="layers-empty">No detectable content changes between these two versions.</p>}
          </div>
        )}

        {tab === "changes" && diff && (
          <div className="version-compare-body">
            <div className="version-diff-list">
              {diff.pageAdditions.map((name) => <div key={`a-${name}`} className="version-diff-line"><span className="add">+</span> Added page “{name}”</div>)}
              {diff.pageRemovals.map((name) => <div key={`r-${name}`} className="version-diff-line"><span className="remove">−</span> Removed page “{name}”</div>)}
              {diff.elementAdditions > 0 && <div className="version-diff-line"><span className="add">+</span> Added {diff.elementAdditions} element{diff.elementAdditions > 1 ? "s" : ""}</div>}
              {diff.elementRemovals > 0 && <div className="version-diff-line"><span className="remove">−</span> Removed {diff.elementRemovals} element{diff.elementRemovals > 1 ? "s" : ""}</div>}
              {diff.changedText > 0 && <div className="version-diff-line"><span className="edit">~</span> Updated {diff.changedText} text block{diff.changedText > 1 ? "s" : ""}</div>}
              {diff.changedAssets > 0 && <div className="version-diff-line"><span className="edit">~</span> Replaced {diff.changedAssets} asset{diff.changedAssets > 1 ? "s" : ""}</div>}
              {diff.layoutChanges > 0 && <div className="version-diff-line"><span className="edit">~</span> Adjusted {diff.layoutChanges} layout{diff.layoutChanges > 1 ? "s" : ""}</div>}
              {diff.navigationChanges && <div className="version-diff-line"><span className="edit">~</span> Updated navigation</div>}
              {diff.seoChanges && <div className="version-diff-line"><span className="edit">~</span> Changed SEO settings</div>}
              {diff.componentDefinitionChanges > 0 && <div className="version-diff-line"><span className="edit">~</span> Changed {diff.componentDefinitionChanges} component definition{diff.componentDefinitionChanges > 1 ? "s" : ""}</div>}
              {diff.globalSectionChanges && <div className="version-diff-line"><span className="edit">~</span> Updated global sections</div>}
            </div>
          </div>
        )}

        {tab === "visual" && (
          <div className="version-compare-body visual">
            <div className="version-compare-controls">
              <div className="device-switcher">
                <button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
                <button className={viewport === "tablet" ? "active" : ""} onClick={() => setViewport("tablet")}>Tablet</button>
                <button className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")}>Mobile</button>
              </div>
              <select className="asset-sort" value={pageId ?? ""} onChange={(event) => setPageId(event.target.value || null)}>
                {pageOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            <div className="version-compare-visual">
              <div className="version-compare-col">
                <span className="version-compare-col-label">v{versionA.versionNumber}</span>
                {pageA ? <PageThumb page={pageA} viewport={viewport} /> : <p className="layers-empty">Version unavailable</p>}
              </div>
              <div className="version-compare-col">
                <span className="version-compare-col-label">v{versionB.versionNumber}</span>
                {pageB ? <PageThumb page={pageB} viewport={viewport} /> : <p className="layers-empty">Version unavailable</p>}
              </div>
            </div>
            <p className="page-dialog-hint" style={{ margin: "12px 0 0" }}>This is a read-only preview — your current project is not changed.</p>
          </div>
        )}
      </div>
    </div>
  );
}