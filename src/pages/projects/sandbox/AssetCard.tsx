import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  Image as ImageIcon, FileText, File, MoreVertical, Play, Download,
  Copy, Trash2, Pencil, RefreshCw, Plus, Type, Eye,
} from 'lucide-react';
import { formatBytes, type AssetRecord } from './sandboxAssets';

type AssetCardProps = {
  asset: AssetRecord;
  view: 'grid' | 'list';
  usageCount: number;
  onPreview: () => void;
  onAddToCanvas: () => void;
  onRename: () => void;
  onEditAltText: () => void;
  onReplace: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onCopyUrl: () => void;
};

function FileThumb({ asset }: { asset: AssetRecord }) {
  if (asset.type === 'image' || asset.type === 'svg') {
    return asset.url
      ? <img src={asset.url} alt="" className="asset-thumb-img" draggable={false} />
      : <ImageIcon size={22} />;
  }
  if (asset.type === 'video') {
    return asset.url
      ? <video src={asset.url} muted className="asset-thumb-img" draggable={false} />
      : <Play size={22} />;
  }
  if (asset.type === 'document' && asset.mimeType === 'application/pdf') {
    return <FileText size={22} />;
  }
  return <File size={22} />;
}

export default function AssetCard(props: AssetCardProps) {
  const { asset, view, usageCount } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const startDrag = (event: DragEvent) => {
    event.dataTransfer.setData('text/forge-asset', asset.id);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const menuItems = [
    { label: 'Add to canvas', icon: Plus, onClick: props.onAddToCanvas },
    { label: 'Preview', icon: Eye, onClick: props.onPreview },
    { label: 'Rename', icon: Pencil, onClick: props.onRename },
    { label: 'Edit alt text', icon: Type, onClick: props.onEditAltText },
    { label: 'Replace file', icon: RefreshCw, onClick: props.onReplace },
    { label: 'Download', icon: Download, onClick: props.onDownload },
    { label: 'Copy URL', icon: Copy, onClick: props.onCopyUrl },
    { label: 'Delete', icon: Trash2, danger: true, onClick: props.onDelete },
  ];

  if (view === 'list') {
    return (
      <div className="asset-list-row" draggable onDragStart={startDrag} onClick={props.onPreview}>
        <span className="asset-list-thumb"><FileThumb asset={asset} /></span>
        <div className="asset-list-meta">
          <span className="asset-list-name">{asset.name}</span>
          <span className="asset-list-sub">{asset.type} · {formatBytes(asset.size)} · {asset.local ? 'Local only' : 'Synced'}</span>
        </div>
        {usageCount > 0 && <span className="asset-usage-chip">Used ×{usageCount}</span>}
        {asset.local && <span className="asset-local-chip">Local only</span>}
        <button className="asset-add-btn" title="Add to canvas" onClick={(e) => { e.stopPropagation(); props.onAddToCanvas(); }}><Plus size={15} /></button>
        <button className="asset-more-btn" title="More actions" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}><MoreVertical size={16} /></button>
        {menuOpen && (
          <div className="asset-menu" ref={menuRef}>
            {menuItems.map((item) => (
              <button key={item.label} className={item.danger ? 'danger' : ''} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); item.onClick(); }}>
                <item.icon size={13} />{item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="asset-card" draggable onDragStart={startDrag} onClick={props.onPreview}>
      <div className="asset-card-thumb">
        <FileThumb asset={asset} />
        {asset.type === 'video' && <span className="asset-video-badge"><Play size={11} /></span>}
      </div>
      <div className="asset-card-meta">
        <span className="asset-card-name" title={asset.name}>{asset.name}</span>
        <span className="asset-card-sub">{asset.type} · {formatBytes(asset.size)}</span>
      </div>
      <div className="asset-card-badges">
        {usageCount > 0 && <span className="asset-usage-chip">×{usageCount}</span>}
        {asset.local && <span className="asset-local-chip">Local</span>}
      </div>
      <button className="asset-more-btn" title="More actions" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}><MoreVertical size={16} /></button>
      {menuOpen && (
        <div className="asset-menu" ref={menuRef}>
          {menuItems.map((item) => (
            <button key={item.label} className={item.danger ? 'danger' : ''} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); item.onClick(); }}>
              <item.icon size={13} />{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}