import { useEffect, useState } from 'react';
import { X, Download, RefreshCw, FileText, Play } from 'lucide-react';
import { formatBytes, type AssetRecord } from './sandboxAssets';

type AssetPreviewProps = {
  asset: AssetRecord;
  usageCount: number;
  onClose: () => void;
  onDownload: () => void;
  onReplace: () => void;
};

export default function AssetPreview({ asset, usageCount, onClose, onDownload, onReplace }: AssetPreviewProps) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    if (asset.type === 'image' || asset.type === 'svg') {
      if (!asset.url) return;
      const img = new Image();
      img.onload = () => setDimensions(`${img.naturalWidth} × ${img.naturalHeight}`);
      img.src = asset.url;
    }
    if (asset.type === 'video') {
      if (!asset.url) return;
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setDimensions(`${video.videoWidth} × ${video.videoHeight}`);
        const seconds = Math.round(video.duration);
        setDuration(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
      };
      video.src = asset.url;
    }
  }, [asset]);

  return (
    <div className="asset-preview-overlay" onClick={onClose} role="dialog" aria-label="Asset preview">
      <div className="asset-preview-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="asset-preview-header">
          <h3>{asset.name}</h3>
          <button onClick={onClose} aria-label="Close preview"><X size={16} /></button>
        </div>

        <div className="asset-preview-body">
          {asset.type === 'image' || asset.type === 'svg' ? (
            asset.url ? <img src={asset.url} alt={asset.altText} className="asset-preview-image" /> : <div className="asset-preview-empty"><FileText size={30} /></div>
          ) : asset.type === 'video' ? (
            asset.url ? (
              <video src={asset.url} controls className="asset-preview-video" />
            ) : <div className="asset-preview-empty"><Play size={30} /></div>
          ) : (
            <div className="asset-preview-doc">
              <FileText size={34} />
              <span>{asset.mimeType === 'application/pdf' ? 'PDF document' : 'Text document'}</span>
              <p>Document contents are not embedded. Use the download button to open it safely.</p>
              <button onClick={onDownload}><Download size={14} /> Download</button>
            </div>
          )}
        </div>

        <div className="asset-preview-meta">
          <Meta label="Type" value={asset.type} />
          <Meta label="Size" value={formatBytes(asset.size)} />
          <Meta label="MIME type" value={asset.mimeType} />
          {dimensions && <Meta label="Dimensions" value={dimensions} />}
          {duration && <Meta label="Duration" value={duration} />}
          {asset.altText && <Meta label="Alt text" value={asset.altText} />}
          <Meta label="Uploaded" value={new Date(asset.createdAt).toLocaleString()} />
          <Meta label="Usage" value={`${usageCount} canvas element${usageCount === 1 ? '' : 's'}`} />
        </div>

        <div className="asset-preview-actions">
          <button onClick={onReplace}><RefreshCw size={14} /> Replace</button>
          <button onClick={onDownload}><Download size={14} /> Download</button>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="asset-meta-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}