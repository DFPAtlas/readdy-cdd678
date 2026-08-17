import { useCallback, useEffect, useState } from 'react';
import { adminApi, type UsageSummary, type UsageCustomerRow } from './forgeAdmin';
import { SectionTitle, LoadingState, ErrorState, EmptyState, StatCard, StatusPill, formatBytes } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PAGE_SIZE = 25;

function fmtCost(micros: number): string {
  return `$${(micros / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [rows, setRows] = useState<UsageCustomerRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [s, c] = await Promise.all([adminApi.usageSummary(), adminApi.usageCustomers({ page, pageSize: PAGE_SIZE })]);
    if (s.ok) setSummary(s.data.summary);
    else setError(s.message);
    if (c.ok) { setRows(c.data.customers); setTotal(c.data.total); }
    else if (!error) setError(c.message);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle
        title="Usage"
        description="Platform resource usage across customers, over the last 30 days."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {loading ? <LoadingState label="Loading usage…" /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          {/* Summary */}
          {summary && (
            <>
              <p className="text-[10px] text-forge-text-muted mb-3">Period: last {summary.periodDays} days (since {new Date(summary.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard label="AI requests" value={summary.aiRequests.toLocaleString()} icon="ri-robot-line" tone="amber" />
                <StatCard label="AI tokens" value={summary.aiTokens.toLocaleString()} icon="ri-flashlight-line" tone="accent" />
                <StatCard label="AI credits used" value={summary.aiCredits.toLocaleString()} icon="ri-coin-line" tone="success" />
                <StatCard label="Builds" value={summary.builds.toLocaleString()} icon="ri-hammer-line" tone="muted" />
                <StatCard label="Exports" value={summary.exports.toLocaleString()} icon="ri-download-2-line" tone="muted" />
                <StatCard label="Workflow runs" value={summary.workflowRuns.toLocaleString()} icon="ri-flow-chart" tone="muted" />
                <StatCard label="Storage" value={formatBytes(summary.storageBytes)} icon="ri-database-2-line" tone="muted" />
                <StatCard label="AI jobs" value={summary.aiJobs.toLocaleString()} icon="ri-braces-line" tone="muted" />
              </div>

              {/* AI cost */}
              <Card className="mb-5">
                <h3 className="text-sm font-semibold text-forge-text-primary mb-2">AI cost</h3>
                {summary.hasCostData ? (
                  <p className="text-sm text-forge-text-secondary">
                    Estimated cost: <span className="font-medium text-forge-text-primary">{fmtCost(summary.aiCostMicros)}</span>
                    <span className="text-forge-text-muted"> (provider-reported estimate, last {summary.periodDays} days)</span>
                  </p>
                ) : (
                  <p className="text-sm text-forge-text-muted">
                    Per-request cost is not currently reported by the AI pipeline, so no cost estimate is displayed.
                  </p>
                )}
              </Card>
            </>
          )}

          {/* Customer usage table */}
          <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Customer usage</h3>
          {!rows || rows.length === 0 ? <EmptyState message="No usage data." /> : (
            <>
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                      <tr>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Customer</th>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Plan</th>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">AI credits</th>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Builds</th>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Storage</th>
                        <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Projects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const creditPct = r.aiCreditLimit ? Math.round((r.aiCredits / r.aiCreditLimit) * 100) : null;
                        const storageLimitBytes = r.storageLimitMb ? r.storageLimitMb * 1024 * 1024 : null;
                        const storagePct = storageLimitBytes ? Math.round((r.storageBytes / storageLimitBytes) * 100) : null;
                        return (
                          <tr key={r.userId} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                            <td className="px-3 py-2">
                              <p className="text-sm text-forge-text-primary">{r.displayName ?? '—'}</p>
                              <p className="text-xs text-forge-text-muted">{r.email ?? '—'}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-forge-text-secondary capitalize">{r.plan}</span>
                              {r.subscriptionStatus && <span className="block"><StatusPill status={r.subscriptionStatus} /></span>}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-forge-text-secondary">{r.aiCredits.toLocaleString()}</span>
                                {r.aiCreditLimit != null && <span className="text-xs text-forge-text-muted">/ {r.aiCreditLimit.toLocaleString()}</span>}
                                {creditPct != null && creditPct >= 100 && <i className="ri-error-warning-fill text-forge-error" title="At limit" />}
                                {creditPct != null && creditPct >= 80 && creditPct < 100 && <i className="ri-alert-fill text-forge-warning" title="Near limit" />}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-forge-text-secondary">{r.builds}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-forge-text-secondary">{formatBytes(r.storageBytes)}</span>
                                {storagePct != null && storagePct >= 100 && <i className="ri-error-warning-fill text-forge-error" title="At storage limit" />}
                                {storagePct != null && storagePct >= 80 && storagePct < 100 && <i className="ri-alert-fill text-forge-warning" title="Near storage limit" />}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-forge-text-secondary">{r.projects}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex items-center justify-between mt-3 text-xs text-forge-text-muted">
                <span>{total} account{total === 1 ? '' : 's'}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ri-arrow-left-s-line" /> Prev</Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <i className="ri-arrow-right-s-line" /></Button>
                </div>
              </div>

              <p className="text-[10px] text-forge-text-muted mt-3">
                Plan limits come from the plan_entitlements table (monthly_ai_credits / asset_storage_mb). Usage is measured, not estimated.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}