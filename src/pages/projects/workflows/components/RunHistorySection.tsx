import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { History } from 'lucide-react';
import type { WorkflowRun, RunStatus } from '../workflowTypes';
import { listWorkflowRuns } from '../workflowData';

function runVariant(s: RunStatus): 'default' | 'success' | 'warning' | 'error' {
  if (s === 'succeeded') return 'success';
  if (s === 'failed' || s === 'dead_letter') return 'error';
  if (s === 'expired' || s === 'cancelled') return 'warning';
  return 'default';
}

function duration(start: string | null, end: string | null): string {
  if (!start) return '—';
  const a = new Date(start).getTime();
  const b = end ? new Date(end).getTime() : Date.now();
  const ms = Math.max(0, b - a);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function RunHistorySection({ projectId }: { projectId: string }) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listWorkflowRuns(projectId, false);
      setRuns(data);
    } catch {
      setError('Could not load run history.');
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [projectId]);

  if (loading) return <div className="py-16 flex justify-center"><Spinner /></div>;
  if (error) return <EmptyState title="Could not load run history" description={error} action={<Button size="sm" onClick={refresh}>Retry</Button>} />;

  return (
    <div>
      <p className="text-xs text-forge-text-muted mb-4">
        Production runs only. Test runs are never mixed into this history.
      </p>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            icon={<History className="h-8 w-8" />}
            title="No runs yet"
            description="Run history appears here once the execution engine processes a workflow trigger."
          />
        </div>
      ) : (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forge-border-subtle text-left text-xs text-forge-text-muted">
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Trigger</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-forge-border-subtle last:border-0">
                  <td className="px-3 py-2"><Badge variant={runVariant(r.status)}>{r.status.replace('_', ' ')}</Badge></td>
                  <td className="px-3 py-2 text-forge-text-primary">{r.triggerType.replace('_', ' ')}{r.triggerReference ? ` · ${r.triggerReference}` : ''}</td>
                  <td className="px-3 py-2 text-forge-text-muted">{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-forge-text-muted">{duration(r.startedAt, r.completedAt)}</td>
                  <td className="px-3 py-2 text-forge-text-muted">{r.safeError ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}