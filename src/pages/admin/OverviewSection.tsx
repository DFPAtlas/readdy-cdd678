import { useCallback, useEffect, useState } from 'react';
import { adminApi, type DashboardSummary, type HealthResult, type SecurityItem, type ReleaseGate } from './forgeAdmin';
import { StatCard, StatusPill, LoadingState, ErrorState, SectionTitle, formatBytes, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function OverviewSection() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [security, setSecurity] = useState<SecurityItem[] | null>(null);
  const [gate, setGate] = useState<ReleaseGate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [d, h, s, g] = await Promise.all([
      adminApi.dashboard(),
      adminApi.health(),
      adminApi.security(),
      adminApi.releaseGate(),
    ]);
    if (d.ok) setSummary(d.data.summary); else setError(d.message);
    if (h.ok) setHealth(h.data); else if (!error) setError(h.message);
    if (s.ok) setSecurity(s.data.items); else if (!error) setError(s.message);
    if (g.ok) setGate(g.data); else if (!error) setError(g.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading platform overview…" />;
  if (error && !summary) return <ErrorState message={error} onRetry={load} />;

  const gateTone = gate?.result === 'GO' ? 'success' : gate?.result === 'CONDITIONAL GO' ? 'warning' : 'error';

  return (
    <div>
      <SectionTitle
        title="Platform Overview"
        description="Real operational metrics. No values here are fabricated."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          <StatCard label="Active users" value={summary.activeUsers} icon="ri-user-3-line" tone="amber" />
          <StatCard label="Active subscriptions" value={summary.activeSubscriptions} icon="ri-bank-card-line" tone="success" />
          <StatCard label="Projects" value={summary.projects} icon="ri-folder-3-line" tone="accent" />
          <StatCard label="Published sites" value={summary.publishedSites} icon="ri-global-line" tone="success" />
          <StatCard label="Deployments (24h)" value={summary.deploymentsToday} icon="ri-rocket-line" tone="accent" />
          <StatCard label="Failed deployments" value={summary.failedDeployments} icon="ri-close-circle-line" tone={summary.failedDeployments > 0 ? 'error' : 'muted'} />
          <StatCard label="AI jobs" value={summary.aiJobs} icon="ri-robot-line" tone="agent" hint={`${summary.aiProviderHealth.healthy}/${summary.aiProviderHealth.total} providers healthy`} />
          <StatCard label="Queue depth" value={summary.queueDepth} icon="ri-stack-line" tone="warning" />
          <StatCard label="Form delivery failures" value={summary.formDeliveryFailures} icon="ri-mail-unread-line" tone={summary.formDeliveryFailures > 0 ? 'warning' : 'muted'} />
          <StatCard label="Storage used" value={formatBytes(summary.storageBytes)} icon="ri-database-2-line" tone="accent" />
          <StatCard label="Template queue" value={summary.templateQueue} icon="ri-layout-grid-line" tone="amber" />
          <StatCard label="Webhook failures" value={summary.securityAlerts} icon="ri-shield-keyhole-line" tone={summary.securityAlerts > 0 ? 'error' : 'muted'} />
          <StatCard label="Open incidents" value={summary.openIncidents} icon="ri-alert-line" tone={summary.openIncidents > 0 ? 'error' : 'success'} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Service health */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-forge-text-primary">Service Health</h3>
            {health && <span className="text-xs text-forge-text-muted">Checked {formatDate(health.checkedAt)}</span>}
          </div>
          {health ? (
            <div className="space-y-1.5">
              {Object.entries(health.services).map(([key, svc]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusPill status={svc.status} />
                    <span className="text-xs text-forge-text-secondary capitalize">{key.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-forge-text-muted">{svc.responseTimeMs != null ? `${svc.responseTimeMs}ms` : ''}</span>
                    {svc.safeError && <p className="text-[10px] text-forge-text-muted max-w-[220px] truncate" title={svc.safeError}>{svc.safeError}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-forge-text-muted">No health data yet.</p>
          )}
        </Card>

        {/* Security centre */}
        <Card>
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Security Centre</h3>
          {security ? (
            <div className="space-y-1.5">
              {security.map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle last:border-0">
                  <span className="text-xs text-forge-text-secondary">{item.label}</span>
                  <span className="text-xs text-forge-text-primary font-medium">
                    {item.count === null ? <span className="text-forge-text-muted">not instrumented</span> : item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-forge-text-muted">No security data yet.</p>
          )}
        </Card>
      </div>

      {/* Release gate */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-forge-text-primary">Release Readiness Gate</h3>
              <p className="text-xs text-forge-text-muted mt-0.5">Critical security, backup, build and tenant-isolation items must be verified.</p>
            </div>
            {gate && (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${gateTone === 'success' ? 'bg-forge-success/10 text-forge-success' : gateTone === 'warning' ? 'bg-forge-warning/10 text-forge-warning' : 'bg-forge-error/10 text-forge-error'}`}>
                {gate.result}
              </span>
            )}
          </div>
          {gate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
              {gate.checklist.map((c) => (
                <div key={c.key} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle">
                  <span className="text-xs text-forge-text-secondary">{c.label}{c.critical && <span className="text-forge-error ml-1">*</span>}</span>
                  <StatusPill status={c.status === 'verified' ? 'healthy' : 'unknown'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-forge-text-muted">No gate data.</p>
          )}
          {gate && gate.criticalUnverified > 0 && (
            <p className="mt-3 text-xs text-forge-warning">{gate.criticalUnverified} critical item(s) unverified — release is blocked.</p>
          )}
        </Card>
      </div>
    </div>
  );
}