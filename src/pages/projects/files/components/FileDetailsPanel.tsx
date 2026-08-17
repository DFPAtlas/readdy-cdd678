import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/pages/projects/sandbox/sandboxAssets';
import type { StructureNode } from '@/services/projectFilesService';
import { kindIcon, kindLabel } from './nodeIcons';

const LARGE_THRESHOLD = 200 * 1024;
const PREVIEW_CAP = 40000;

function formatUpdated(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function previewText(node: StructureNode): { text: string; truncated: boolean; large: boolean } {
  if (node.sizeBytes > LARGE_THRESHOLD) {
    return { text: '', truncated: false, large: true };
  }
  const full = JSON.stringify(node.raw, null, 2) || '';
  if (full.length <= PREVIEW_CAP) {
    return { text: full, truncated: false, large: false };
  }
  return { text: full.slice(0, PREVIEW_CAP), truncated: true, large: false };
}

export function FileDetailsPanel({ node }: { node: StructureNode | null }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-forge-text-muted">
        <p className="text-sm">Select a file to inspect it</p>
      </div>
    );
  }

  const preview = previewText(node);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-forge-border-subtle">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-forge-amber">{kindIcon(node.kind)}</span>
          <h2 className="text-sm font-semibold text-forge-text-primary truncate">{node.name}</h2>
          <Badge variant="amber" size="sm">{kindLabel(node.kind)}</Badge>
        </div>
        <p className="text-xs text-forge-text-muted font-mono truncate">{node.path}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Type</p>
            <p className="text-sm text-forge-text-primary">{kindLabel(node.kind)}</p>
          </div>
          <div>
            <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Size</p>
            <p className="text-sm text-forge-text-primary font-mono">{formatBytes(node.sizeBytes)}</p>
          </div>
          <div>
            <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Updated</p>
            <p className="text-sm text-forge-text-primary">{formatUpdated(node.updatedAt)}</p>
          </div>
          <div>
            <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Detail</p>
            <p className="text-sm text-forge-text-primary truncate">{node.detail}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-forge-text-secondary">{node.summary}</p>
        </div>

        <div>
          <p className="text-[11px] text-forge-text-muted uppercase tracking-wide mb-2">Preview</p>
          {preview.large ? (
            <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3 text-xs text-forge-text-muted">
              Preview unavailable for large file.
            </div>
          ) : (
            <pre className="rounded-md border border-forge-border-subtle bg-forge-bg p-3 text-xs font-mono text-forge-text-secondary overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
              {preview.text || '// Empty'}
              {preview.truncated && <span className="text-forge-amber">{'\n… truncated'}</span>}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}