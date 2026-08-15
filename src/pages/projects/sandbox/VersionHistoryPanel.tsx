import { ArrowLeftRight, Check, ChevronRight, Clock, Eye, Flag, History, RotateCcw, Search, Sparkles, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { VERSION_SOURCE_LABELS, type VersionEntry, type VersionSource } from "./sandboxVersions";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VersionHistoryPanel({ versions, currentVersionNumber, loading, localCount, onPreview, onRestore, onCompare, onCreateCheckpoint, onSyncLocal, onClearLocal }: {
  versions: VersionEntry[];
  currentVersionNumber: number | null;
  loading: boolean;
  localCount: number;
  onPreview: (entry: VersionEntry) => void;
  onRestore: (entry: VersionEntry) => void;
  onCompare: (a: VersionEntry, b: VersionEntry) => void;
  onCreateCheckpoint: () => void;
  onSyncLocal: () => void;
  onClearLocal: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<VersionSource | "all">("all");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const filtered = useMemo(() => versions.filter((entry) => {
    if (sourceFilter !== "all" && entry.source !== sourceFilter) return false;
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (entry.label ?? "").toLowerCase().includes(needle)
      || (entry.changeSummary ?? "").toLowerCase().includes(needle)
      || `v${entry.versionNumber}`.includes(needle)
      || (entry.description ?? "").toLowerCase().includes(needle);
  }), [versions, search, sourceFilter]);

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      const next = [...current, id];
      return next.slice(-2);
    });
  };

  return (
    <div className="version-panel">
      <div className="version-panel-tools">
        <label className="search-field"><Search size={15} /><input placeholder="Search versions…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <button className="pages-add-btn version-create-btn" onClick={onCreateCheckpoint}><Flag size={13} />Checkpoint</button>
      </div>
      <div className="version-filters">
        <button className={sourceFilter === "all" ? "active" : ""} onClick={() => setSourceFilter("all")}>All</button>
        {(["manual", "autosave", "ai", "page", "component", "asset", "publish", "restore"] as VersionSource[]).map((source) => (
          <button key={source} className={sourceFilter === source ? "active" : ""} onClick={() => setSourceFilter(source === sourceFilter ? "all" : source)}>{VERSION_SOURCE_LABELS[source]}</button>
        ))}
      </div>
      {compareIds.length === 2 && (
        <div className="version-compare-hint"><ArrowLeftRight size={13} /> Comparing v{versions.find((v) => v.id === compareIds[0])?.versionNumber} and v{versions.find((v) => v.id === compareIds[1])?.versionNumber} — select one more entry to re-pair.</div>
      )}
      {localCount > 0 && (
        <div className="version-local-hint">
          <History size={13} /> {localCount} local version{localCount === 1 ? "" : "s"} — stored on this device only.
          <button onClick={onSyncLocal}><Upload size={11} />Sync</button>
          <button onClick={onClearLocal}>Clear</button>
        </div>
      )}
      <div className="version-timeline">
        {loading && <p className="layers-empty">Loading version history…</p>}
        {!loading && filtered.length === 0 && <p className="layers-empty">No versions match. Create a checkpoint or save to start your history.</p>}
        {filtered.map((entry) => {
          const isCurrent = entry.versionNumber === currentVersionNumber;
          const isComparing = compareIds.includes(entry.id);
          return (
            <div key={entry.id} className={`version-row ${isCurrent ? "current" : ""} ${isComparing ? "comparing" : ""}`}>
              <button className="version-row-main" onClick={() => onPreview(entry)}>
                <span className="version-dot"><Clock size={13} /></span>
                <span className="version-row-info">
                  <span className="version-row-title">
                    <b>v{entry.versionNumber}</b>
                    {entry.label && <span className="version-label">{entry.label}</span>}
                    {entry.isCheckpoint && <em className="version-badge checkpoint"><Flag size={9} />Checkpoint</em>}
                    {entry.publishedAt && <em className="version-badge published"><Upload size={9} />Published</em>}
                    {entry.source === "ai" && <em className="version-badge ai"><Sparkles size={9} />AI</em>}
                    {entry.restoredFromVersionId && <em className="version-badge restored"><RotateCcw size={9} />Restored</em>}
                    {entry.local && <em className="version-badge local">Local only</em>}
                  </span>
                  <span className="version-row-meta">
                    {VERSION_SOURCE_LABELS[entry.source]} · {formatDate(entry.createdAt)}
                    {entry.changeSummary ? ` · ${entry.changeSummary}` : ""}
                  </span>
                </span>
              </button>
              <div className="version-row-actions">
                <button title="Compare" onClick={() => toggleCompare(entry.id)}><ArrowLeftRight size={14} /></button>
                <button title="Preview" onClick={() => onPreview(entry)}><Eye size={14} /></button>
                <button title="Restore" onClick={() => onRestore(entry)}><RotateCcw size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="version-panel-footer">
        <span><Check size={12} /> {versions.length} version{versions.length === 1 ? "" : "s"}</span>
        {compareIds.length === 2 && (
          <button className="version-compare-go" onClick={() => { const a = versions.find((v) => v.id === compareIds[0]); const b = versions.find((v) => v.id === compareIds[1]); if (a && b) onCompare(a, b); }}>Compare selected <ChevronRight size={13} /></button>
        )}
      </div>
    </div>
  );
}