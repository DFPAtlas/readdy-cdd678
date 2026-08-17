import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Play, Pause, Copy, Trash2, Workflow, ArrowDown, CircleDot, Zap,
} from 'lucide-react';
import type { WorkflowSummary } from '@/services/projectWorkflowsService';
import type { WorkflowStatus, RunStatus } from '../workflowTypes';
import { setWorkflowStatus, deleteWorkflow, duplicateWorkflow } from '../workflowData';

type Filter = 'all' | WorkflowStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'failed', label: 'Failed' },
];

function statusVariant(s: WorkflowStatus): 'default' | 'success' | 'warning' | 'error' {
  if (s === 'active') return 'success';
  if (s === 'paused') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
}

function runVariant(s: RunStatus): 'default' | 'success' | 'warning' | 'error' {
  if (s === 'succeeded') return 'success';
  if (s === 'failed' || s === 'dead_letter') return 'error';
  if (s === 'expired' || s === 'cancelled') return 'warning';
  return 'default';
}

function lastRunLabel(summary: WorkflowSummary): string {
  if (!summary.lastRun) return 'Never run';
  return summary.lastRun.startedAt ? new Date(summary.lastRun.startedAt).toLocaleString() : '—';
}

export function WorkflowsListSection({ projectId, workflows, role, onCreateRequest, onRefresh, onOpen }: {
  projectId: string;
  workflows: WorkflowSummary[];
  role: string | null;
  onCreateRequest: () => void;
  onRefresh: () => Promise<void>;
  onOpen: (w: WorkflowSummary) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = role === 'owner' || role === 'admin' || role === 'developer';

  const filtered = filter === 'all' ? workflows : workflows.filter((w) => w.status === filter);

  const toggleStatus = async (w: WorkflowSummary) => {
    setBusyId(w.id);
    await setWorkflowStatus(w.id, w.status === 'active' ? 'paused' : 'active');
    setBusyId(null);
    await onRefresh();
  };

  const handleDuplicate = async (w: WorkflowSummary) => {
    setBusyId(w.id);
    await duplicateWorkflow(projectId, w.id, w.name);
    setBusyId(null);
    await onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteWorkflow(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    await onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
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
        <span className="text-xs text-forge-text-muted">
          {filtered.length} workflow{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          {workflows.length === 0 ? (
            <EmptyState
              icon={<Workflow className="h-8 w-8" />}
              title="No workflows yet"
              description="Create a workflow to define a repeatable project action. Note: the execution engine is not wired up yet, so workflows are saved as configuration but do not run."
              action={
                canManage ? (
                  <Button size="sm" onClick={onCreateRequest}>
                    Create workflow
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={<Workflow className="h-8 w-8" />}
              title="No workflows match this filter"
              description="Try a different status filter to see other workflows."
              action={
                <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                  Clear filter
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-forge-border-subtle bg-forge-panel p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(w)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-forge-text-primary truncate">{w.name}</span>
                    <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                  </div>
                  {w.description && (
                    <p className="text-xs text-forge-text-muted mt-0.5 line-clamp-1">{w.description}</p>
                  )}

                  {/* Flow strip */}
                  {w.steps.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {w.steps.slice(0, 5).map((step, i) => (
                        <span key={`${w.id}-${i}`} className="flex items-center gap-1.5">
                          {i > 0 && <ArrowDown className="h-3 w-3 text-forge-text-muted shrink-0" />}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                              step.category === 'trigger'
                                ? 'bg-forge-amber/10 text-forge-amber'
                                : step.category === 'action'
                                  ? 'bg-forge-border text-forge-text-secondary'
                                  : 'bg-forge-bg text-forge-text-muted'
                            }`}
                          >
                            {step.category === 'trigger' && <CircleDot className="h-3 w-3" />}
                            {step.category === 'action' && <Zap className="h-3 w-3" />}
                            <span className="whitespace-nowrap">{step.label}</span>
                          </span>
                        </span>
                      ))}
                      {w.steps.length > 5 && (
                        <span className="text-[11px] text-forge-text-muted">+{w.steps.length - 5} more</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-forge-text-muted mt-2">No definition saved yet — open to build the flow.</p>
                  )}

                  {/* Last run */}
                  <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-forge-text-muted">
                    <span>Last run: {lastRunLabel(w)}</span>
                    {w.lastRun && (
                      <>
                        <span className="text-forge-border">·</span>
                        <Badge variant={runVariant(w.lastRun.status)} size="sm">
                          {w.lastRun.status.replace('_', ' ')}
                        </Badge>
                        {w.lastRun.safeError && (
                          <span className="text-forge-error truncate max-w-[220px]">{w.lastRun.safeError}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => onOpen(w)}>
                    View
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={w.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        loading={busyId === w.id}
                        onClick={() => toggleStatus(w)}
                      >
                        {w.status === 'active' ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy className="h-3.5 w-3.5" />}
                        loading={busyId === w.id}
                        onClick={() => handleDuplicate(w)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        className="text-forge-error"
                        onClick={() => setDeleteTarget(w)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete workflow"
        message={`Delete "${deleteTarget?.name}"? This removes the workflow and all of its versions and runs.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}