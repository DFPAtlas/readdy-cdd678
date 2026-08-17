import { useCallback, useEffect, useState } from 'react';
import { adminApi, type SupportSessionRow } from './forgeAdmin';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SupportPage() {
  const [sessions, setSessions] = useState<SupportSessionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.supportList();
    if (res.ok) setSessions(res.data.sessions);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle
        title="Support"
        description="Scoped, read-only support sessions opened against customer projects."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {loading ? (
        <LoadingState label="Loading support sessions…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState message="No support sessions recorded." />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Session</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Project</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Scope</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Expires</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Reason</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                    <td className="px-3 py-2 text-xs text-forge-text-muted font-mono">{s.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-xs text-forge-text-muted font-mono">{s.project_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary capitalize">{s.scope ?? 'read-only'}</td>
                    <td className="px-3 py-2"><StatusPill status={s.status} /></td>
                    <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(s.expires_at)}</td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary max-w-[260px] truncate" title={s.reason ?? ''}>{s.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}