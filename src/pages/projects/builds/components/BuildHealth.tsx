import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  buildBadgeVariant,
  buildStatusKind,
  buildStatusLabel,
  formatBuildDuration,
  formatBuildRelativeTime,
  type ProjectBuildsData,
} from '@/services/projectBuildsService';
import { Hammer, CheckCircle2, XCircle, Timer } from 'lucide-react';

export function BuildHealth({ data }: { data: ProjectBuildsData }) {
  const latest = data.latestBuild;
  const latestKind = latest ? buildStatusKind(latest.status) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 text-forge-text-muted">
          <Hammer className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Latest build</span>
        </div>
        {latest ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={latestKind ? buildBadgeVariant(latestKind) : 'default'} size="sm">
              {buildStatusLabel(latest.status)}
            </Badge>
            <span className="text-xs text-forge-text-muted">
              {formatBuildRelativeTime(latest.startedAt)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-forge-text-muted">No builds yet</p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 text-forge-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Successful</span>
        </div>
        <p className="text-lg font-semibold font-mono text-forge-text-primary">{data.successCount}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 text-forge-text-muted">
          <XCircle className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Failed</span>
        </div>
        <p className="text-lg font-semibold font-mono text-forge-text-primary">{data.failedCount}</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 text-forge-text-muted">
          <Timer className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Avg duration</span>
        </div>
        <p className="text-lg font-semibold font-mono text-forge-text-primary">
          {formatBuildDuration(data.averageDurationSeconds)}
        </p>
      </Card>
    </div>
  );
}