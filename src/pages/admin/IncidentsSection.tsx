import { useCallback, useEffect, useState } from 'react';
import { adminApi, type Incident } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const STATUSES = ['investigating', 'identified', 'monitoring', 'resolved', 'closed'] as const;
const SEVERITIES = ['critical', 'major', 'minor'] as const;
const SERVICES = ['web_app', 'database', 'ai_providers', 'deployments', 'billing', 'forms', 'templates', 'auth', 'storage', 'edge_functions'];

export function IncidentsSection() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'incidents.manage');
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.incidentsList();
    if (res.ok) setIncidents(res.data.incidents);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, status: string) => {
    const msg = window.prompt(`Status note for "${status}"?`);
    if (msg === null) return;
    setFeedback('');
    const res = await adminApi.incidentsUpdate(id, status, msg);
    setFeedback(res.ok ? 'Incident updated.' : res.message);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <SectionTitle
        title="Incidents"
        description="Append-only incident timelines with severity and affected services."
        action={canManage ? <Button size="sm" icon={<i className="ri-add-line" />} onClick={() => setShowCreate((v) => !v)}>New incident</Button> : undefined}
      />

      {feedback && <p className="mb-3 text-xs text-forge-success">{feedback}</p>}

      {showCreate && canManage && <CreateIncident onDone={() => { setShowCreate(false); load(); }} />}

      {!incidents || incidents.length === 0 ? <EmptyState message="No incidents recorded." /> : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusPill status={inc.severity} />
                    <StatusPill status={inc.status} />
                    <h3 className="text-sm font-semibold text-forge-text-primary">{inc.title}</h3>
                  </div>
                  <p className="text-xs text-forge-text-muted mt-1">
                    Started {formatDate(inc.started_at)}
                    {inc.resolved_at ? ` · Resolved ${formatDate(inc.resolved_at)}` : ''}
                  </p>
                  {Array.isArray(inc.affected_services) && inc.affected_services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {inc.affected_services.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-forge-border text-[10px] text-forge-text-secondary capitalize">{s.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {STATUSES.filter((s) => s !== inc.status).map((s) => (
                      <Button key={s} size="sm" variant="ghost" onClick={() => update(inc.id, s)}>{s.replace('_', ' ')}</Button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateIncident({ onDone }: { onDone: () => void }) {
  const [severity, setSeverity] = useState<string>('major');
  const [title, setTitle] = useState('');
  const [affected, setAffected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (s: string) => setAffected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    if (!title) { setFeedback('Title is required.'); return; }
    setBusy(true);
    const res = await adminApi.incidentsCreate(severity, title, affected);
    setBusy(false);
    if (res.ok) onDone();
    else setFeedback(res.message);
  };

  return (
    <Card className="mb-4 border-forge-warning/30">
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">New incident</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
        <div className="flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1">
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => setSeverity(s)} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${severity === s ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>{s}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {SERVICES.map((s) => (
          <button key={s} onClick={() => toggle(s)} className={`px-2 py-1 rounded text-xs transition-colors ${affected.includes(s) ? 'bg-forge-amber/15 text-forge-amber' : 'bg-forge-border text-forge-text-secondary hover:text-forge-text-primary'}`}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" loading={busy} onClick={submit}>Create</Button>
        {feedback && <span className="text-xs text-forge-text-secondary">{feedback}</span>}
      </div>
    </Card>
  );
}