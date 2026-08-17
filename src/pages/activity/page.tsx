import { useMemo, useState } from 'react';
import { FolderKanban, Hammer, Bot, GitBranch, Package, RefreshCw, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useActivity } from '@/hooks/useActivity';
import {
  filterActivity,
  defaultActivityFilters,
  type ActivityFilters,
} from '@/services/activityService';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ActivityFilters as FiltersBar } from './components/ActivityFilters';
import { ActivityTimeline } from './components/ActivityTimeline';

interface SummaryCardProps {
  icon: LucideIcon;
  tint: string;
  bg: string;
  label: string;
  value: number;
}

function SummaryCard({ icon: Icon, tint, bg, label, value }: SummaryCardProps) {
  return (
    <div className="bg-forge-panel border border-forge-border-subtle rounded-lg p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${bg} ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-forge-text-primary leading-none">{value}</p>
        <p className="mt-1 text-xs text-forge-text-muted truncate">{label}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-forge-panel border border-forge-border-subtle rounded-lg overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-forge-border-subtle last:border-b-0">
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const { data, loading, error, lastUpdated, retry } = useActivity();
  const [filters, setFilters] = useState<ActivityFilters>(defaultActivityFilters);

  const filtered = useMemo(() => filterActivity(data.activity, filters), [data.activity, filters]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.kind !== 'all' ||
    filters.projectId !== 'all' ||
    filters.status !== 'all' ||
    filters.dateRange !== 'all';

  const patchFilters = (patch: Partial<ActivityFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFilters(defaultActivityFilters);

  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-forge-amber mb-1">Workspace</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-forge-text-primary">Activity</h1>
            <p className="mt-1 text-sm text-forge-text-muted">
              Review recent changes, builds, AI-assisted work and important events across Forge.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdatedLabel && (
              <span className="text-xs text-forge-text-muted whitespace-nowrap">
                Last updated: {lastUpdatedLabel}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={retry}
              loading={loading}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard icon={FolderKanban} tint="text-forge-amber" bg="bg-forge-amber/10" label="Projects" value={data.summary.projects} />
        <SummaryCard icon={Hammer} tint="text-forge-accent" bg="bg-forge-accent/10" label="Builds" value={data.summary.builds} />
        <SummaryCard icon={Bot} tint="text-forge-agent" bg="bg-forge-agent/10" label="AI tasks" value={data.summary.ai} />
        <SummaryCard icon={GitBranch} tint="text-forge-success" bg="bg-forge-success/10" label="Versions" value={data.summary.versions} />
        <SummaryCard icon={Package} tint="text-forge-warning" bg="bg-forge-warning/10" label="Exports" value={data.summary.exports} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FiltersBar
          filters={filters}
          projects={data.projects}
          onChange={patchFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Content */}
      {error ? (
        <ErrorState title="Unable to load activity" onRetry={retry} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : data.activity.length === 0 ? (
        <div className="bg-forge-panel border border-forge-border-subtle rounded-lg">
          <EmptyState
            icon={<Activity className="h-8 w-8" />}
            title="No activity yet"
            description="Activity will appear here as you create projects, run builds and use Forge features."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-forge-panel border border-forge-border-subtle rounded-lg">
          <EmptyState
            title="No activity matches these filters"
            description="Try adjusting or clearing your filters to see more events."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <ActivityTimeline activity={filtered} />
      )}
    </>
  );
}