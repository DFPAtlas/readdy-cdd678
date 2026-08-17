import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type UploadStatus = {
  id: string;
  name: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
};

interface UploadButtonProps {
  onUpload: (file: File) => Promise<{ ok: boolean; error?: string }>;
}

export function UploadButton({ onUpload }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<UploadStatus[]>([]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const entries = list.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        status: 'uploading' as const,
      }));
      setItems((prev) => [...entries, ...prev]);

      for (let i = 0; i < list.length; i += 1) {
        const file = list[i];
        const id = entries[i].id;
        const result = await onUpload(file);
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: result.ok ? ('success' as const) : ('error' as const),
                  error: result.error,
                }
              : it,
          ),
        );
      }
    },
    [onUpload],
  );

  return (
    <div>
      <div
        className={`rounded-lg border border-dashed transition-colors p-4 flex flex-col items-center justify-center gap-2 ${
          dragActive
            ? 'border-forge-amber bg-forge-amber/5'
            : 'border-forge-border bg-forge-bg'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm,.pdf,.txt"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-forge-text-muted">
          Drop images, videos or documents here to add them to this project.
        </p>
        <Button size="sm" onClick={() => inputRef.current?.click()} icon={<Upload className="h-3.5 w-3.5" />}>
          Upload Asset
        </Button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs"
            >
              {item.status === 'uploading' && (
                <Loader2 className="h-3.5 w-3.5 text-forge-amber animate-spin flex-shrink-0" />
              )}
              {item.status === 'success' && (
                <CheckCircle className="h-3.5 w-3.5 text-forge-success flex-shrink-0" />
              )}
              {item.status === 'error' && (
                <AlertCircle className="h-3.5 w-3.5 text-forge-error flex-shrink-0" />
              )}
              <span className="text-forge-text-primary truncate flex-1">{item.name}</span>
              <span className="text-forge-text-muted whitespace-nowrap">
                {item.status === 'uploading'
                  ? 'Uploading…'
                  : item.status === 'success'
                    ? 'Uploaded'
                    : item.error ?? 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}