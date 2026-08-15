import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AiOverview, type DeploymentRow } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function AiDeploySection() {
  const admin = useAdmin();
  const canOperate = hasPermission(admin, 'ai.operate') || hasPermission(admin, 'deployments.operate');
  const [tab, setTab] = useState<'ai' | 'deploy'>('ai');
  return (
    <div>
      <SectionTitle title="AI & Deployments" description="Provider and model kill switches, routing, and deployment queue controls." />
      <div className="flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1 w-fit mb-5">
        <button onClick={() => setTab('ai')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'ai' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>AI Operations</button>
        <button onClick={() => setTab('deploy')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'deploy' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>Deployments</button>
      </div>
      {tab === 'ai' ? <AiOps canOperate={hasPermission(admin, 'ai.operate')} /> : <DeployOps canOperate={hasPermission(admin, 'deployments.operate')} />}
      {canOperate ? null : <p className="mt-4 text-xs text-forge-warning">You have read-only access to this area.</p>}
    </div>
  );
}

function AiOps({ canOperate }: { canOperate: boolean }) {
  const [data, setData] = useState<AiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.aiOverview();
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setFeedback('');
    const res = await fn();
    setFeedback(res.ok ? 'Updated.' : res.message ?? 'Action failed.');
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="No AI registry data." />;

  const flagOn = (key: string) => data.flags.find((f) => f.flag_key === key)?.enabled ?? false;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        <Card className="flex items-center gap-3">
          <span className="text-xs text-forge-text-secondary">Queue depth</span>
          <span className="text-sm font-semibold text-forge-text-primary">{data.queueDepth}</span>
        </Card>
        {canOperate && (
          <Button size="sm" variant={flagOn('ai_paused') ? 'danger' : 'secondary'} onClick={() => act(() => adminApi.aiToggleFlag('ai_paused', !flagOn('ai_paused')))}>
            <i className="ri-pause-circle-line" /> {flagOn('ai_paused') ? 'AI paused — resume' : 'Pause AI'}
          </Button>
        )}
        {canOperate && (
          <Button size="sm" variant={flagOn('local_only') ? 'primary' : 'secondary'} onClick={() => act(() => adminApi.aiToggleFlag('local_only', !flagOn('local_only')))}>
            <i className="ri-home-smile-line" /> {flagOn('local_only') ? 'Local-only ON' : 'Local-only OFF'}
          </Button>
        )}
        {feedback && <span className="text-xs text-forge-success self-center">{feedback}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Providers</h3>
          {data.providers.length === 0 ? <p className="text-sm text-forge-text-muted">No providers configured.</p> : (
            <div className="space-y-1.5">
              {data.providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle last:border-0">
                  <div>
                    <p className="text-sm text-forge-text-primary">{String(p.display_name ?? p.provider_key ?? '—')}</p>
                    <p className="text-[10px] text-forge-text-muted">{String(p.provider_key ?? '')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={String(p.status ?? 'unknown')} />
                    {canOperate && (
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.aiSetProvider(p.id, p.status === 'disabled' ? 'active' : 'disabled'))}>
                        {p.status === 'disabled' ? 'Enable' : 'Disable'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Models</h3>
          {data.models.length === 0 ? <p className="text-sm text-forge-text-muted">No models registered.</p> : (
            <div className="space-y-1.5">
              {data.models.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle last:border-0">
                  <div>
                    <p className="text-sm text-forge-text-primary">{String(m.model_key ?? '—')}</p>
                    <p className="text-[10px] text-forge-text-muted">priority {String(m.routing_priority ?? '—')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={m.enabled ? 'healthy' : 'disabled'} />
                    {canOperate && (
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.aiSetModel(m.id, !m.enabled))}>
                        {m.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DeployOps({ canOperate }: { canOperate: boolean }) {
  const [deployments, setDeployments] = useState<DeploymentRow[] | null>(null);
  const [flags, setFlags] = useState<{ flag_key: string; enabled: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.deploymentsList();
    if (res.ok) { setDeployments(res.data.deployments); setFlags(res.data.flags); }
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setFeedback('');
    const res = await fn();
    setFeedback(res.ok ? 'Done.' : res.message ?? 'Action failed.');
    load();
  };

  const flagOn = (key: string) => flags.find((f) => f.flag_key === key)?.enabled ?? false;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      {canOperate && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Button size="sm" variant={flagOn('deploy_paused') ? 'danger' : 'secondary'} onClick={() => act(() => adminApi.deploymentsToggleFlag('deploy_paused', !flagOn('deploy_paused')))}>
            <i className="ri-pause-circle-line" /> {flagOn('deploy_paused') ? 'Queue paused — resume' : 'Pause queue'}
          </Button>
          <Button size="sm" variant={flagOn('publish_disabled') ? 'danger' : 'secondary'} onClick={() => act(() => adminApi.deploymentsToggleFlag('publish_disabled', !flagOn('publish_disabled')))}>
            <i className="ri-shield-keyhole-line" /> {flagOn('publish_disabled') ? 'Publishing disabled' : 'Disable publishing'}
          </Button>
          {feedback && <span className="text-xs text-forge-success self-center">{feedback}</span>}
        </div>
      )}

      {!deployments || deployments.length === 0 ? <EmptyState message="No deployments recorded." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">ID</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Environment</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Created</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 100).map((d) => (
                <tr key={d.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                  <td className="px-3 py-2 text-xs text-forge-text-muted font-mono">{d.id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-xs text-forge-text-secondary capitalize">{String(d.environment ?? '—')}</td>
                  <td className="px-3 py-2"><StatusPill status={String(d.status ?? '')} /></td>
                  <td className="px-3 py-2 text-xs text-forge-text-muted">{new Date(String(d.created_at ?? '')).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {canOperate && (
                      <div className="flex items-center justify-end gap-1.5">
                        {String(d.status) === 'failed' && <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.deploymentAction('retry', d.id, ''))}>Retry</Button>}
                        {['queued', 'running', 'active'].includes(String(d.status)) && <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.deploymentAction('cancel', d.id, ''))}>Cancel</Button>}
                        {String(d.status) === 'active' && <Button size="sm" variant="ghost" onClick={() => { const r = window.prompt('Reason for emergency rollback?'); if (r) act(() => adminApi.deploymentAction('rollback', d.id, r)); }}>Rollback</Button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}