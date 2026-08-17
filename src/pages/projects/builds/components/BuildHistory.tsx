import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  buildBadgeVariant,
  buildReference,
  buildStatusKind,
  buildStatusLabel,
  formatBuildDuration,
  formatBuildTimestamp,
  isBuildInProgress,
  versionShortLabel,
  type BuildVersionLink,
  type ProjectBuildRecord,
} from '@/services/projectBuildsService';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Clock,
  ChevronRight,
  SearchX,
} from 'lucide-react';

type Filter = 'all' | 'running' | 'completed' | 'failed';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

function statusIcon(kind: ReturnType<typeof buildStatusKind>) {
  switch (kind) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-forge-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-forge-error" />;
    case 'active':
      return <Loader2 className="h-4 w-4 text-forge-amber animate-spin" />;
    case 'queued':
      return <Clock className="h-4 w-4 text-forge-text-muted" />;
    default:
      return <Circle className="h-4 w-4 text-forge-text-muted" />;
  }
}

interface BuildHistoryProps {
  builds: ProjectBuildRecord[];
  versionByBuildId: Record<string, BuildVersionLink>;
  onSelect: (build: ProjectBuildRecord) => void;
}

export function BuildHistory({ builds, versionByBuildId, onSelect }: BuildHistoryProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return builds;
    return builds.filter((b) => {
      if (filter === 'running') return isBuildInProgress(b.status);
      if (filter === 'completed') return buildStatusKind(b.status) === 'success';
      if (filter === 'failed') return buildStatusKind(b.status) === 'failed';
      return true;
    });
  }, [builds, filter]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-forge-text-primary mr-2">Build history</h3>
        <div className="flex items-center gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                filter === f.value
                  ? 'bg-forge-amber text-forge-text-inverse'
                  : 'bg-forge-panel text-forge-text-secondary hover:bg-forge-hover border border-forge-border-subtle'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel px-4 py-10 flex flex-col items-center justify-center text-center">
          <SearchX className="h-8 w-8 text-forge-text-muted mb-3" />
          <p className="text-sm font-medium text-forge-text-primary">No builds match this filter</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setFilter('all')}>
            Clear filter
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-forge-border-subtle bg-forge-bg/50">
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Build</th>
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Started</th>
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Duration</th>
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Version</th>
                  <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Triggered by</th>
                  <th className="text-right px-4 py-2.5 font-medium text-forge-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border-subtle">
                {filtered.map((build) => {
                  const kind = buildStatusKind(build.status);
                  const versionLabel =
                    versionShortLabel(versionByBuildId[build.id]) ?? build.version ?? '—';
                  return (
                    <tr key={build.id} className="hover:bg-forge-hover/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {statusIcon(kind)}
                          <span className="font-mono text-forge-text-primary">
                            {buildReference(build)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={buildBadgeVariant(kind)} size="sm">
                          {buildStatusLabel(build.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-forge-text-secondary">
                        {formatBuildTimestamp(build.startedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-forge-text-secondary font-mono">
                        {formatBuildDuration(build.duration)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-forge-text-primary">{versionLabel}</span>
                      </td>
                      <td className="px-4 py-2.5 text-forge-text-secondary">
                        {build.requestedBy ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => onSelect(build)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((build) => {
              const kind = buildStatusKind(build.status);
              const versionLabel =
                versionShortLabel(versionByBuildId[build.id]) ?? build.version ?? '—';
              return (
                <button
                  key={build.id}
                  onClick={() => onSelect(build)}
                  className="w-full text-left rounded-lg border border-forge-border-subtle bg-forge-panel p-3 hover:border-forge-border transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon(kind)}
                      <span className="font-mono text-forge-text-primary">
                        {buildReference(build)}
                      </span>
                    </div>
                    <Badge variant={buildBadgeVariant(kind)} size="sm">
                      {buildStatusLabel(build.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-forge-text-muted">
                    <span>{formatBuildTimestamp(build.startedAt)}</span>
                    <span className="font-mono">{formatBuildDuration(build.duration)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs mt-1">
                    <span className="text-forge-text-secondary font-mono">{versionLabel}</span>
                    <span className="flex items-center text-forge-amber">
                      View Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}