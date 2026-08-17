import { Play, Pause, Pencil, AlertTriangle, Workflow } from 'lucide-react';
import type { WorkflowCounts } from '@/services/projectWorkflowsService';

interface WorkflowsOverviewProps {
  counts: WorkflowCounts;
  runCount: number;
}

const items = [
  { key: 'active', label: 'Active', icon: Play, color: 'text-forge-success' },
  { key: 'paused', label: 'Paused', icon: Pause, color: 'text-forge-warning' },
  { key: 'draft', label: 'Draft', icon: Pencil, color: 'text-forge-text-muted' },
  { key: 'failed', label: 'Failed', icon: AlertTriangle, color: 'text-forge-error' },
] as const;

export function WorkflowsOverview({ counts, runCount }: WorkflowsOverviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-forge-text-muted">{item.label}</span>
            </div>
            <p className="text-2xl font-semibold text-forge-text-primary">{counts[item.key]}</p>
          </div>
        );
      })}

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <Workflow className="h-4 w-4 text-forge-amber" />
          <span className="text-xs text-forge-text-muted">Runs recorded</span>
        </div>
        <p className="text-2xl font-semibold text-forge-text-primary">{runCount}</p>
        <p className="text-[11px] text-forge-text-muted mt-1">execution engine not yet active</p>
      </div>
    </div>
  );
}