import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { ComponentDefinition, SandboxPage } from "./sandboxPersistence";
import type { VersionEntry } from "./sandboxVersions";

export type RestoreMode = "full" | "page" | "component" | "global";

export default function RestoreVersionDialog({ version, open, pages, components, hasUnsaved, onClose, onConfirm }: {
  version: VersionEntry | null;
  open: boolean;
  pages: SandboxPage[];
  components: ComponentDefinition[];
  hasUnsaved: boolean;
  onClose: () => void;
  onConfirm: (mode: RestoreMode, targetId?: string) => void;
}) {
  const [mode, setMode] = useState<RestoreMode>("full");
  const [targetId, setTargetId] = useState("");

  if (!open || !version) return null;

  const targetOptions = mode === "page" ? pages : mode === "component" ? components : [];

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog page-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3><RotateCcw size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--amber)" }} />Restore version</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="page-dialog-body">
          <p className="page-dialog-hint">
            Restoring <b>v{version.versionNumber}</b> {version.label ? `“${version.label}”` : ""} will create a new version — it never overwrites history.
          </p>
          {hasUnsaved && (
            <div className="asset-delete-warning" style={{ margin: 0 }}><AlertTriangle size={15} /> You have unsaved changes. A snapshot of your current work is taken first.</div>
          )}
          <div className="version-restore-modes">
            {([["full", "Entire project"], ["page", "Single page"], ["component", "Single component"], ["global", "Global sections"]] as [RestoreMode, string][]).map(([value, label]) => (
              <button key={value} className={mode === value ? "active" : ""} onClick={() => { setMode(value); setTargetId(""); }}>{label}</button>
            ))}
          </div>
          {mode !== "full" && (
            <label className="page-dialog-label">Choose {mode === "page" ? "a page" : mode === "component" ? "a component" : "scope"}
              <select className="asset-dialog-input" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <option value="">Select…</option>
                {targetOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <p className="page-dialog-hint warn">Restoring creates one undoable editor action. Page or component IDs are remapped safely to avoid broken references.</p>
        </div>
        <div className="asset-dialog-actions">
          <button className="primary" disabled={mode !== "full" && !targetId} onClick={() => onConfirm(mode, mode === "full" ? undefined : targetId)}>Restore</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}