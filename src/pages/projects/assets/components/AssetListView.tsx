import { Badge } from '@/components/ui/Badge';
import { formatBytes, type AssetRecord } from '@/pages/projects/sandbox/sandboxAssets';
import { AssetThumb } from './AssetThumb';

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface AssetListViewProps {
  assets: AssetRecord[];
  selectedId: string | null;
  onSelect: (asset: AssetRecord) => void;
}

export function AssetListView({ assets, selectedId, onSelect }: AssetListViewProps) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
      <div className="divide-y divide-forge-border-subtle">
        {assets.map((asset) => {
          const selected = selectedId === asset.id;
          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                selected ? 'bg-forge-amber/10' : 'hover:bg-forge-hover'
              }`}
              aria-pressed={selected}
            >
              <div className="h-9 w-9 rounded-md overflow-hidden flex-shrink-0 bg-forge-bg">
                <AssetThumb asset={asset} objectFit="cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-forge-text-primary truncate" title={asset.name}>
                  {asset.name}
                </p>
                <p className="text-xs text-forge-text-muted truncate">
                  {asset.type} · {formatBytes(asset.size)}
                </p>
              </div>
              <Badge variant="default" size="sm">{asset.type}</Badge>
              <span className="text-xs text-forge-text-muted whitespace-nowrap w-20 text-right">
                {formatUpdated(asset.createdAt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}