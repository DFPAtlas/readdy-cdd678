import { useCallback, useEffect, useState } from 'react';
import { adminApi, type HealthResult, type HealthService } from './forgeAdmin';
import { StatusPill, LoadingState, ErrorState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

function healthLabel(status: string, safeError: string | null): string {
  if (status === 'healthy') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  if (status === 'down') return 'Action Required';
  if (safeError?.toLowerCase().includes('not configured')) return 'Not configured';
  return 'Unknown';
}

function statusTone(status: string): 'healthy' | 'degraded' | 'down' | 'unknown' {
  if (status === 'healthy') return 'healthy';
  if (status === 'degraded') return 'degraded';
  if (status === 'down') return 'down';
  return 'unknown';
}

export default function SystemPage() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.health();
    if (res.ok) setHealth(res.data);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionTitle
        title="System Health"
        description="Only statuses from actual health probes. Uninstrumented services are reported as unknown — never fabricated green."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Re-check</Button>}
      />

      {loading ? (
        <LoadingState label="Running health probes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !health ? (
        <p className="text-sm text-forge-text-muted">No health data available.</p>
      ) : (
        <>
          <p className="text-xs text-forge-text-muted mb-4">Last checked {formatDate(health.checkedAt)}</p>
          <Card>
            <div className="divide-y divide-forge-border-subtle">
              {Object.entries(health.services).map(([key, svc]: [string, HealthService]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusPill status={statusTone(svc.status)} />
                    <div className="min-w-0">
                      <p className="text-sm text-forge-text-primary capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-forge-text-muted">{healthLabel(svc.status, svc.safeError)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-forge-text-muted">{svc.responseTimeMs != null ? `${svc.responseTimeMs}ms` : ''}</span>
                    {svc.safeError && <p className="text-[10px] text-forge-text-muted max-w-[260px] truncate" title={svc.safeError}>{svc.safeError}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}