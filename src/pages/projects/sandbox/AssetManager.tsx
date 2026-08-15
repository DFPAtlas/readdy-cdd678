import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Grid2X2, List, ArrowUpDown, Upload, RefreshCw, Trash2,
  X, Image as ImageIcon, Video, FileText, Layers, AlertCircle,
} from 'lucide-react';
import { useAssetStore, formatBytes, copyAssetUrl, getDownloadUrl, type AssetRecord, type AssetTypeFilter } from './sandboxAssets';
import type { CanvasElement } from './sandboxPersistence';
import AssetUploadZone from './AssetUploadZone';
import AssetCard from './AssetCard';
import AssetPreview from './AssetPreview';

type AssetManagerProps = {
  elements: CanvasElement[];
  onAddToCanvas: (asset: AssetRecord) => void;
  onRemoveElementsByAsset: (assetId: string) => void;
  onMarkMissing: (assetId: string) => void;
  onReplaceAssetFile: (assetId: string, newUrl: string) => void;
  notify: (message: string) => void;
};

const FILTERS: Array<{ id: AssetTypeFilter; label: string; icon?: typeof ImageIcon }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'svg', label: 'SVGs' },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'recent', label: 'Recently used' },
  { id: 'unused', label: 'Unused' },
];

const QUOTA = 1024 * 1024 * 1024; // 1 GB nominal

export default function AssetManager(props: AssetManagerProps) {
  const { elements, onAddToCanvas, onRemoveElementsByAsset, onMarkMissing, onReplaceAssetFile, notify } = props;
  const { assets, loading, error, load, removeAsset, renameAsset, setAltText, replaceAsset, syncLocalAssets, syncing, clearError } = useAssetStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AssetTypeFilter>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'date' | 'name' | 'size'>('date');
  const [preview, setPreview] = useState<AssetRecord | null>(null);
  const [renameTarget, setRenameTarget] = useState<AssetRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [altTarget, setAltTarget] = useState<AssetRecord | null>(null);
  const [altValue, setAltValue] = useState('');
  const [replaceTarget, setReplaceTarget] = useState<AssetRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, [load]);

  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const element of elements) {
      const id = element.asset?.assetId;
      if (id) map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }, [elements]);

  const storageUsed = useMemo(() => assets.reduce((sum, a) => sum + a.size, 0), [assets]);
  const localCount = useMemo(() => assets.filter((a) => a.local).length, [assets]);

  const filtered = useMemo(() => {
    let list = assets.filter((asset) => {
      if (search && !asset.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'image' && asset.type !== 'image') return false;
      if (filter === 'video' && asset.type !== 'video') return false;
      if (filter === 'svg' && asset.type !== 'svg') return false;
      if (filter === 'document' && asset.type !== 'document') return false;
      if (filter === 'recent' && (usageMap[asset.id] ?? 0) === 0) return false;
      if (filter === 'unused' && (usageMap[asset.id] ?? 0) > 0) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'size') return b.size - a.size;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
    return list;
  }, [assets, search, filter, sort, usageMap]);

  const recent = useMemo(() => {
    return assets.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);
  }, [assets]);

  const handleDelete = async (mode: 'cancel' | 'remove' | 'keep') => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target || mode === 'cancel') return;
    const count = usageMap[target.id] ?? 0;
    if (mode === 'remove' && count > 0) onRemoveElementsByAsset(target.id);
    if (mode === 'keep' && count > 0) onMarkMissing(target.id);
    const result = await removeAsset(target.id, mode === 'remove');
    if (!result.ok && result.message) notify(result.message);
    else notify('Asset deleted');
  };

  const handleReplaceFile = async (file: File | undefined) => {
    const target = replaceTarget;
    if (!target || !file) { setReplaceTarget(null); return; }
    const result = await replaceAsset(target.id, file);
    setReplaceTarget(null);
    if (result.ok) {
      const updated = useAssetStore.getState().assets.find((a) => a.id === target.id);
      if (updated) onReplaceAssetFile(updated.id, updated.url);
      notify('Asset replaced');
    } else {
      notify(result.message ?? 'Replace failed');
    }
  };

  const handleDownload = async (asset: AssetRecord) => {
    const url = await getDownloadUrl(asset);
    if (!url) { notify('Download unavailable'); return; }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = asset.name;
    anchor.target = '_blank';
    anchor.rel = 'nofollow';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleCopyUrl = async (asset: AssetRecord) => {
    const ok = await copyAssetUrl(asset);
    notify(ok ? 'Asset URL copied' : 'Could not copy URL');
  };

  return (
    <div className="asset-manager">
      <div className="asset-toolbar">
        <label className="search-field"><Search size={15} /><input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <div className="asset-view-toggle">
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view"><Grid2X2 size={15} /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view"><List size={15} /></button>
        </div>
        <div className="asset-sort">
          <ArrowUpDown size={13} />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="date">Newest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
        </div>
      </div>

      <div className="asset-filters">
        {FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div className="asset-storage">
        <div className="asset-storage-row">
          <span>{assets.length} assets · {localCount > 0 ? `${localCount} local-only · ` : ''}{formatBytes(storageUsed)} used</span>
          {localCount > 0 && (
            <button className="asset-sync-btn" disabled={syncing} onClick={() => void syncLocalAssets()}>
              <RefreshCw size={12} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync local assets'}
            </button>
          )}
        </div>
        <span className="asset-quota"><i style={{ width: `${Math.min(100, (storageUsed / QUOTA) * 100)}%` }} /></span>
      </div>

      <AssetUploadZone />

      {error && (
        <div className="asset-state error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => { clearError(); void load(); }}>Retry</button>
        </div>
      )}

      {loading && (
        <div className="asset-state"><RefreshCw className="spin" size={20} /><span>Loading assets…</span></div>
      )}

      {!loading && !error && assets.length === 0 && (
        <div className="asset-state empty">
          <ImageIcon size={26} />
          <strong>No assets yet</strong>
          <span>Upload images, videos or documents to get started.</span>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <>
          {filter === 'all' && recent.length > 0 && (
            <section className="asset-section">
              <h4>Recent</h4>
              <div className={view === 'grid' ? 'asset-grid' : 'asset-list'}>
                {recent.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} view={view} usageCount={usageMap[asset.id] ?? 0}
                    onPreview={() => setPreview(asset)}
                    onAddToCanvas={() => onAddToCanvas(asset)}
                    onRename={() => { setRenameTarget(asset); setRenameValue(asset.name); }}
                    onEditAltText={() => { setAltTarget(asset); setAltValue(asset.altText); }}
                    onReplace={() => setReplaceTarget(asset)}
                    onDelete={() => setDeleteTarget(asset)}
                    onDownload={() => void handleDownload(asset)}
                    onCopyUrl={() => void handleCopyUrl(asset)} />
                ))}
              </div>
            </section>
          )}

          <section className="asset-section">
            <h4>{filter === 'all' ? 'All assets' : FILTERS.find((f) => f.id === filter)?.label ?? 'Assets'} <Layers size={12} /> {filtered.length}</h4>
            {filtered.length === 0 ? (
              <div className="asset-state empty"><ImageIcon size={20} /><span>No assets match your filters.</span></div>
            ) : (
              <div className={view === 'grid' ? 'asset-grid' : 'asset-list'}>
                {filtered.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} view={view} usageCount={usageMap[asset.id] ?? 0}
                    onPreview={() => setPreview(asset)}
                    onAddToCanvas={() => onAddToCanvas(asset)}
                    onRename={() => { setRenameTarget(asset); setRenameValue(asset.name); }}
                    onEditAltText={() => { setAltTarget(asset); setAltValue(asset.altText); }}
                    onReplace={() => setReplaceTarget(asset)}
                    onDelete={() => setDeleteTarget(asset)}
                    onDownload={() => void handleDownload(asset)}
                    onCopyUrl={() => void handleCopyUrl(asset)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {preview && (
        <AssetPreview
          asset={preview}
          usageCount={usageMap[preview.id] ?? 0}
          onClose={() => setPreview(null)}
          onDownload={() => void handleDownload(preview)}
          onReplace={() => { setReplaceTarget(preview); setPreview(null); }}
        />
      )}

      {renameTarget && (
        <Dialog title="Rename asset" onClose={() => setRenameTarget(null)}>
          <input className="asset-dialog-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <div className="asset-dialog-actions">
            <button onClick={() => setRenameTarget(null)}>Cancel</button>
            <button className="primary" onClick={() => { void renameAsset(renameTarget.id, renameValue).then(() => { setRenameTarget(null); notify('Asset renamed'); }); }}>Save</button>
          </div>
        </Dialog>
      )}

      {altTarget && (
        <Dialog title="Edit alt text" onClose={() => setAltTarget(null)}>
          <textarea className="asset-dialog-input textarea" value={altValue} onChange={(e) => setAltValue(e.target.value)} placeholder="Describe the image for screen readers…" />
          <div className="asset-dialog-actions">
            <button onClick={() => setAltTarget(null)}>Cancel</button>
            <button className="primary" onClick={() => { void setAltText(altTarget.id, altValue).then(() => { setAltTarget(null); notify('Alt text saved'); }); }}>Save</button>
          </div>
        </Dialog>
      )}

      {replaceTarget && (
        <Dialog title={`Replace “${replaceTarget.name}”`} onClose={() => setReplaceTarget(null)}>
          <p className="asset-dialog-copy">Choose a new file. Position, size, border radius and link settings on the canvas are preserved.</p>
          <div className="asset-dialog-actions">
            <button onClick={() => setReplaceTarget(null)}>Cancel</button>
            <button className="primary" onClick={() => replaceInputRef.current?.click()}><Upload size={13} /> Choose file</button>
          </div>
          <input ref={replaceInputRef} type="file" className="asset-file-input" accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.pdf,.txt,image/*,video/*,application/pdf,text/plain" onChange={(e) => void handleReplaceFile(e.target.files?.[0])} />
        </Dialog>
      )}

      {deleteTarget && (
        <Dialog title={`Delete “${deleteTarget.name}”?`} onClose={() => setDeleteTarget(null)}>
          {(usageMap[deleteTarget.id] ?? 0) > 0 ? (
            <>
              <div className="asset-delete-warning"><AlertCircle size={15} /> This asset is used by <b>{(usageMap[deleteTarget.id] ?? 0)} canvas element{usageMap[deleteTarget.id] === 1 ? '' : 's'}</b>.</div>
              <div className="asset-dialog-actions column">
                <button onClick={() => void handleDelete('cancel')}>Cancel</button>
                <button className="danger" onClick={() => void handleDelete('remove')}>Remove asset &amp; its canvas elements</button>
                <button onClick={() => void handleDelete('keep')}>Keep canvas elements, mark file missing</button>
              </div>
            </>
          ) : (
            <>
              <p className="asset-dialog-copy">This asset is not used on the canvas.</p>
              <div className="asset-dialog-actions">
                <button onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="danger" onClick={() => void handleDelete('remove')}><Trash2 size={13} /> Delete</button>
              </div>
            </>
          )}
        </Dialog>
      )}

      {errorMsg && (
        <div className="asset-state error"><AlertCircle size={16} /><span>{errorMsg}</span><button onClick={() => setErrorMsg(null)}><X size={13} /></button></div>
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="asset-dialog-header"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X size={15} /></button></div>
        {children}
      </div>
    </div>
  );
}