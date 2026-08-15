import { Flag, X } from "lucide-react";
import { useState } from "react";

export type CheckpointInput = {
  name: string;
  description: string;
  tag: string;
  releaseCandidate: boolean;
};

export default function CreateCheckpointDialog({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CheckpointInput) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [releaseCandidate, setReleaseCandidate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Give the checkpoint a name"); return; }
    if (trimmed.length > 60) { setError("Keep the name under 60 characters"); return; }
    onCreate({ name: trimmed, description: description.trim(), tag: tag.trim(), releaseCandidate });
    setName("");
    setDescription("");
    setTag("");
    setReleaseCandidate(false);
    setError(null);
  };

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog page-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3><Flag size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--amber)" }} />Create checkpoint</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="page-dialog-body">
          <label className="page-dialog-label">Name
            <input className="asset-dialog-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Client approved homepage" autoFocus />
          </label>
          <label className="page-dialog-label">Description <small>Optional</small>
            <textarea className="asset-dialog-input textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What makes this checkpoint meaningful?" />
          </label>
          <label className="page-dialog-label">Tag <small>Optional</small>
            <input className="asset-dialog-input" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="e.g. review, milestone" />
          </label>
          <label className="asset-check page-dialog-check" style={{ color: "#c4cbd1" }}>
            <input type="checkbox" checked={releaseCandidate} onChange={(event) => setReleaseCandidate(event.target.checked)} />
            Mark as release candidate
          </label>
          {error && <p className="asset-hint link-error" style={{ margin: 0 }}>{error}</p>}
          <p className="page-dialog-hint">Checkpoints are protected from automatic cleanup and remain in your history until you remove them.</p>
        </div>
        <div className="asset-dialog-actions">
          <button className="primary" onClick={submit}>Create checkpoint</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}