import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BuildRow, type BuildsSummary, type BuildDetail } from './forgeAdmin';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, StatCard, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';

type Filter = 'failed' | 'running' | 'succeeded' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'failed', label: 'Failed' },
  { key: 'running', label: 'In progress' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'all', label: 'All' },
];

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function BuildsSection() {
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [summary, setSummary] = useState<BuildsSummary | null>(null);
  const [filter, setFilter] = useState<Filter>('failed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState<BuildDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.buildsList();
    if (res.ok) { setBuilds(res.data.builds); setSummary(res.data.summary); }
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (buildId: string) => {
    setDetailLoading(true);
    setDetail(null);
    const res = await adminApi.buildsGet(buildId);
    if (res.ok) setDetail(res.data.build);
    setDetailLoading(false);
  };

  const filtered = (builds ?? []).filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'failed') return b.status === 'failed';
    if (filter === 'running') return b.status === 'running' || b.status === 'queued';
    if (filter === 'succeeded') return b.status === 'success';
    return true;
  });

  return (
    <div>
      <SectionTitle
        title="Build Operations"
        description="Recent builds across the platform, focused on failures. Log bodies and artifacts are never surfaced here."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="In progress" value={summary.running + summary.queued} icon="ri-loader-4-line" tone={summary.running + summary.queued > 0 ? 'warning' : 'muted'} />
          <StatCard label="Succeeded" value={summary.succeeded} icon="ri-check-double-line" tone="success" />
          <StatCard label="Failed" value={summary.failed} icon="ri-close-circle-line" tone={summary.failed > 0 ? 'error' : 'muted'} />
          <StatCard label="Queued" value={summary.queued} icon="ri-hourglass-line" tone="muted" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${filter === f.key ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading builds…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !builds || builds.length === 0 ? (
        <EmptyState message="No builds recorded yet." />
      ) : filtered.length === 0 ? (
        <EmptyState message="No builds match this filter." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[820px]">
              <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Project</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Owner</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Build</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Duration</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Started</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">W / E</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Failure</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40 cursor-pointer" onClick={() => openDetail(b.id)}>
                    <td className="px-3 py-2">
                      <p className="text-sm text-forge-text-primary">{b.projectName ?? '—'}</p>
                      <p className="text-[10px] text-forge-text-muted font-mono">{b.projectId.slice(0, 8)}…</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary">{b.ownerEmail ?? '—'}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-forge-text-secondary font-mono">{b.buildNumber != null ? `#${b.buildNumber}` : '—'}</p>
                      {b.version && <p className="text-[10px] text-forge-text-muted">{b.version}</p>}
                    </td>
                    <td className="px-3 py-2"><StatusPill status={b.status} /></td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary font-mono">{formatDuration(b.duration)}</td>
                    <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(b.startedAt)}</td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary font-mono">{(b.warningCount ?? 0)} / {(b.errorCount ?? 0)}</td>
                    <td className="px-3 py-2">
                      {b.failureCode ? (
                        <span className="text-xs text-forge-error font-mono" title={b.failureCode}>{b.failureCode.slice(0, 28)}{b.failureCode.length > 28 ? '…' : ''}</span>
                      ) : (
                        <span className="text-xs text-forge-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Drawer open={detail !== null || detailLoading} onClose={() => setDetail(null)} title="Build details" width="w-[420px]">
        <div className="p-4">
          {detailLoading ? (
            <LoadingState label="Loading build…" />
          ) : !detail ? (
            <EmptyState message="No build data." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-forge-text-muted mb-1">Project</p>
                <p className="text-sm text-forge-text-primary">{detail.projectName ?? '—'}</p>
                <p className="text-[10px] text-forge-text-muted font-mono">{detail.projectId.slice(0, 8)}…</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Owner</p>
                  <p className="text-sm text-forge-text-primary break-all">{detail.ownerEmail ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Status</p>
                  <StatusPill status={detail.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Build #</p>
                  <p className="text-sm text-forge-text-primary font-mono">{detail.buildNumber != null ? `#${detail.buildNumber}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Version</p>
                  <p className="text-sm text-forge-text-primary">{detail.version ?? '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Started</p>
                  <p className="text-sm text-forge-text-secondary">{formatDate(detail.startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Duration</p>
                  <p className="text-sm text-forge-text-secondary font-mono">{formatDuration(detail.duration)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Warnings / Errors</p>
                  <p className="text-sm text-forge-text-secondary font-mono">{(detail.warningCount ?? 0)} / {(detail.errorCount ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Environment</p>
                  <p className="text-sm text-forge-text-secondary capitalize">{detail.environment ?? '—'}</p>
                </div>
              </div>

              {detail.failureCode && (
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Failure code</p>
                  <p className="text-sm text-forge-error font-mono break-all">{detail.failureCode}</p>
                </div>
              )}

              {detail.failureMessage && (
                <div>
                  <p className="text-xs text-forge-text-muted mb-1">Failure message</p>
                  <p className="text-sm text-forge-text-secondary whitespace-pre-wrap break-words">{detail.failureMessage}</p>
                </div>
              )}

              <div className="rounded-md bg-forge-panel border border-forge-border-subtle p-3">
                <p className="text-[10px] text-forge-text-muted">{detail.logNote}</p>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}