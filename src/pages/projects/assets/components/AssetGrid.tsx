import { Badge } from '@/components/ui/Badge';
import { formatBytes, type AssetRecord } from '@/pages/projects/sandbox/sandboxAssets';
import { AssetThumb } from './AssetThumb';

interface AssetGridProps {
  assets: AssetRecord[];
  selectedId: string | null;
  onSelect: (asset: AssetRecord) => void;
}

export function AssetGrid({ assets, selectedId, onSelect }: AssetGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {assets.map((asset) => {
        const selected = selectedId === asset.id;
        return (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className={`text-left rounded-lg border overflow-hidden bg-forge-panel transition-colors ${
              selected
                ? 'border-forge-amber ring-1 ring-forge-amber'
                : 'border-forge-border-subtle hover:border-forge-border'
            }`}
            aria-pressed={selected}
          >
            <div className="aspect-square w-full">
              <AssetThumb asset={asset} />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-forge-text-primary truncate" title={asset.name}>
                {asset.name}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Badge variant="default" size="sm">{asset.type}</Badge>
                <span className="text-[10px] text-forge-text-muted whitespace-nowrap">
                  {formatBytes(asset.size)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}