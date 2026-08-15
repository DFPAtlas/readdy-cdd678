import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Upload, X, Loader2, CheckCircle, AlertCircle, Sparkles, FileImage } from 'lucide-react';
import { useAssetStore, formatBytes, compressImageToWebP, validateFile, type UploadItem } from './sandboxAssets';

type OptimizeEstimate = { original: number; optimized: number; count: number };

export default function AssetUploadZone() {
  const { addFiles, cancelUpload, uploads } = useAssetStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<{ files: File[]; estimate: OptimizeEstimate | null; estimating: boolean } | null>(null);

  const collect = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const hasImage = files.some((f) => validateFile(f).ok && validateFile(f).kind === 'image');
    if (hasImage) {
      setPending({ files, estimate: null, estimating: true });
      void (async () => {
        const images = files.filter((f) => validateFile(f).ok && validateFile(f).kind === 'image').slice(0, 6);
        let original = 0;
        let optimized = 0;
        let count = 0;
        for (const img of images) {
          const result = await compressImageToWebP(img).catch(() => null);
          if (result) {
            original += result.originalSize;
            optimized += result.compressedSize;
            count += 1;
          } else {
            original += img.size;
            optimized += img.size;
            count += 1;
          }
        }
        setPending({ files, estimate: { original, optimized, count }, estimating: false });
      })();
    } else {
      addFiles(files, false);
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) collect(event.dataTransfer.files);
  };

  const confirmOptimize = (optimize: boolean) => {
    if (pending) addFiles(pending.files, optimize);
    setPending(null);
  };

  return (
    <div className="asset-upload">
      <div
        className={`asset-dropzone ${dragOver ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload assets"
      >
        <Upload size={18} />
        <span>Drag &amp; drop files, or <b>browse</b></span>
        <small>JPG, PNG, WebP, GIF, SVG, MP4, WebM, PDF, TXT</small>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.pdf,.txt,image/*,video/*,application/pdf,text/plain"
        className="asset-file-input"
        onChange={(e) => { if (e.target.files?.length) collect(e.target.files); e.target.value = ''; }}
      />

      {uploads.length > 0 && (
        <div className="asset-upload-list">
          {uploads.map((item) => <UploadRow key={item.id} item={item} onCancel={() => cancelUpload(item.id)} />)}
        </div>
      )}

      {pending && (
        <div className="asset-optimize-dialog">
          {pending.estimating ? (
            <div className="asset-optimize-row"><Loader2 className="spin" size={15} /> Estimating WebP savings…</div>
          ) : (
            <>
              <div className="asset-optimize-row">
                <Sparkles size={15} />
                <span>Optimise {pending.estimate?.count ?? 0} image(s) to WebP — save {formatBytes(Math.max(0, (pending.estimate?.original ?? 0) - (pending.estimate?.optimized ?? 0)))} ({pending.estimate && pending.estimate.original ? Math.round((1 - pending.estimate.optimized / pending.estimate.original) * 100) : 0}%).</span>
              </div>
              <div className="asset-optimize-actions">
                <button onClick={() => confirmOptimize(true)}>Compress to WebP</button>
                <button onClick={() => confirmOptimize(false)}>Keep original</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UploadRow({ item, onCancel }: { item: UploadItem; onCancel: () => void }) {
  const active = item.status === 'queued' || item.status === 'uploading' || item.status === 'optimizing';
  return (
    <div className={`asset-upload-row ${item.status}`}>
      <span className="asset-upload-icon">
        {item.status === 'success' ? <CheckCircle size={15} /> : item.status === 'error' ? <AlertCircle size={15} /> : <FileImage size={15} />}
      </span>
      <div className="asset-upload-body">
        <span className="asset-upload-name">{item.name}</span>
        {item.status === 'error' && <span className="asset-upload-error">{item.error}</span>}
        {active && (
          <span className="asset-progress"><i style={{ width: `${item.status === 'uploading' ? item.progress : item.status === 'optimizing' ? 45 : 8}%` }} /></span>
        )}
        <span className="asset-upload-sub">
          {item.status === 'queued' && 'Queued'}
          {item.status === 'optimizing' && 'Optimising…'}
          {item.status === 'uploading' && `${item.progress}%`}
          {item.status === 'success' && 'Uploaded'}
          {item.status === 'error' && 'Failed'}
        </span>
      </div>
      {active && <button className="asset-upload-cancel" onClick={onCancel} title="Cancel"><X size={14} /></button>}
    </div>
  );
}