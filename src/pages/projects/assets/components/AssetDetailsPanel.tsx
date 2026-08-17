import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { formatBytes, type AssetRecord } from '@/pages/projects/sandbox/sandboxAssets';
import { AssetThumb } from './AssetThumb';
import { X, Download, Copy, Check, Trash2, Pencil } from 'lucide-react';

interface AssetDetailsPanelProps {
  asset: AssetRecord | null;
  onClose: () => void;
  onDelete: (asset: AssetRecord) => Promise<{ ok: boolean; error?: string }>;
  onRename: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
}

export function AssetDetailsPanel({ asset, onClose, onDelete, onRename }: AssetDetailsPanelProps) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDimensions(null);
    setCopied(false);
    setRenaming(false);
    setErrorMsg(null);
    if (!asset) return;
    setDraftName(asset.name);
    if (asset.type === 'image' || asset.type === 'svg') {
      const img = document.createElement('img');
      img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = asset.url;
    }
  }, [asset]);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asset, onClose]);

  if (!asset) return null;

  const handleCopy = async () => {
    const path = asset.storagePath ?? asset.name;
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const submitRename = async () => {
    if (!draftName.trim() || draftName.trim() === asset.name) {
      setRenaming(false);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    const result = await onRename(asset.id, draftName);
    setBusy(false);
    if (result.ok) {
      setRenaming(false);
    } else {
      setErrorMsg(result.error ?? 'Rename failed');
    }
  };

  const confirmDeleteAction = async () => {
    setBusy(true);
    setErrorMsg(null);
    const result = await onDelete(asset);
    setBusy(false);
    if (result.ok) {
      setConfirmDelete(false);
      onClose();
    } else {
      setErrorMsg(result.error ?? 'Delete failed');
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="relative ml-auto w-full max-w-md bg-forge-panel border-l border-forge-border h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={asset.name}
        >
          <div className="sticky top-0 bg-forge-panel border-b border-forge-border-subtle px-4 py-3 flex items-center justify-between z-10">
            <h3 className="text-sm font-semibold text-forge-text-primary truncate">{asset.name}</h3>
            <button
              onClick={onClose}
              className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Preview */}
            <div className="aspect-video rounded-lg overflow-hidden bg-forge-bg">
              <AssetThumb asset={asset} objectFit="contain" />
            </div>

            {errorMsg && (
              <div className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2 text-xs text-forge-error">
                {errorMsg}
              </div>
            )}

            {/* Name / rename */}
            <div>
              <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Name</p>
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                    autoFocus
                    className="h-8 flex-1 px-2 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm focus:outline-none focus:border-forge-amber"
                    aria-label="Asset name"
                  />
                  <Button size="sm" onClick={submitRename} loading={busy}>
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-forge-text-primary truncate">{asset.name}</p>
                  <button
                    onClick={() => setRenaming(true)}
                    className="text-forge-text-muted hover:text-forge-text-primary transition-colors"
                    aria-label="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Type</p>
                <Badge variant="default" size="sm">{asset.type}</Badge>
              </div>
              <div>
                <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Size</p>
                <p className="text-sm text-forge-text-primary">{formatBytes(asset.size)}</p>
              </div>
              <div>
                <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">MIME type</p>
                <p className="text-xs font-mono text-forge-text-primary break-all">{asset.mimeType}</p>
              </div>
              <div>
                <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Updated</p>
                <p className="text-sm text-forge-text-primary">
                  {new Date(asset.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {dimensions && (
                <div>
                  <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Dimensions</p>
                  <p className="text-sm text-forge-text-primary font-mono">
                    {dimensions.w} × {dimensions.h}
                  </p>
                </div>
              )}
            </div>

            {asset.storagePath && (
              <div>
                <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Location</p>
                <p className="text-xs font-mono text-forge-text-secondary break-all">{asset.storagePath}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-forge-border-subtle">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleCopy}
                icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copied ? 'Copied' : 'Copy path'}
              </Button>
              {asset.url ? (
                <a
                  href={asset.url}
                  download={asset.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1 h-7 px-2.5 text-xs font-medium rounded-md bg-forge-border text-forge-text-primary hover:bg-forge-hover border border-forge-border-subtle transition-colors whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              ) : (
                <Button variant="secondary" size="sm" className="flex-1" disabled>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmDelete(true)}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteAction}
        title="Delete asset"
        message={`Are you sure you want to delete "${asset.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={busy}
      />
    </>
  );
}