import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type BillingSummary, type BillingSubRow, type PaymentProblem } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { SectionTitle, LoadingState, ErrorState, EmptyState, StatusPill, StatCard, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const SUB_STATUS_OPTIONS = ['active', 'trialing', 'past_due', 'cancelled'];
const BILLABLE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

function fmtMoney(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingPage() {
  const admin = useAdmin();
  const canOperate = hasPermission(admin, 'billing.operate');

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [subs, setSubs] = useState<BillingSubRow[] | null>(null);
  const [problems, setProblems] = useState<PaymentProblem[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [s, subsRes, p] = await Promise.all([
      adminApi.billingSummary(),
      adminApi.billingList(statusFilter || undefined),
      adminApi.billingPaymentProblems(),
    ]);
    if (s.ok) setSummary(s.data.summary);
    else setError(s.message);
    if (subsRes.ok) setSubs(subsRes.data.subscriptions);
    else if (!error) setError(subsRes.message);
    if (p.ok) setProblems(p.data.items);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  /* Operational visibility only — users with more than one billable
     subscription. No cancel action is offered here. */
  const conflicts = useMemo(() => {
    if (!subs) return [] as { userId: string; customerEmail: string | null; customerName: string | null; stripeCustomerId: string | null; count: number; subscriptions: BillingSubRow[] }[];
    const byUser: Record<string, BillingSubRow[]> = {};
    for (const s of subs) {
      if (!BILLABLE_STATUSES.includes(s.status)) continue;
      (byUser[s.userId] ??= []).push(s);
    }
    return Object.values(byUser)
      .filter((list) => list.length > 1)
      .map((list) => ({
        userId: list[0].userId,
        customerEmail: list[0].customerEmail,
        customerName: list[0].customerName,
        stripeCustomerId: list[0].stripeCustomerId,
        count: list.length,
        subscriptions: list,
      }));
  }, [subs]);

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, label: string) => {
    setFeedback('');
    const res = await fn();
    setFeedback(res.ok ? label : res.message ?? 'Action failed.');
    if (res.ok) load();
  };

  return (
    <div>
      <SectionTitle
        title="Billing & Revenue"
        description="Stripe remains the source of payment truth. Forge never rewrites it."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {/* Summary cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatCard label="MRR" value={fmtMoney(summary.mrr)} icon="ri-funds-line" tone="amber" hint="Normalized monthly, from active + past-due recurring subs" />
            <StatCard label="Active subscriptions" value={summary.activeSubscriptions} icon="ri-bank-card-line" tone="success" />
            <StatCard label="Past due" value={summary.pastDue} icon="ri-alert-line" tone="warning" />
            <StatCard label="Cancellations" value={summary.cancellations} icon="ri-close-circle-line" tone="muted" />
            <StatCard label="Failed payments" value={summary.failedPayments} icon="ri-error-warning-line" tone="error" />
          </div>
          <p className="text-[10px] text-forge-text-muted mb-4">
            MRR calculated from active + past-due recurring subscriptions (yearly normalized to /12), using the plan price list mirrored from the pricing page. It is not derived from invoice history.
          </p>
        </>
      )}

      {/* Billing conflicts — operational visibility only (no cancel action) */}
      {conflicts.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Billing conflicts</h3>
          {conflicts.map((c) => (
            <div key={c.userId} className="rounded-md border border-forge-warning/40 bg-forge-panel p-3 mb-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <i className="ri-alert-line text-forge-warning" />
                    <span className="text-sm text-forge-text-primary font-medium truncate">{c.customerEmail ?? c.customerName ?? 'Unknown user'}</span>
                    <span className="text-xs font-semibold text-forge-warning whitespace-nowrap">Billing conflict</span>
                  </div>
                  <p className="text-xs text-forge-text-muted mt-1">
                    Stripe customer <span className="text-forge-text-secondary">{c.stripeCustomerId ?? '—'}</span> · {c.count} billable subscriptions · test environment
                  </p>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-forge-text-muted">
                      <th className="py-1 pr-3 font-medium">Subscription</th>
                      <th className="py-1 pr-3 font-medium">Plan</th>
                      <th className="py-1 pr-3 font-medium">Status</th>
                      <th className="py-1 font-medium">Cancel at period end</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.subscriptions.map((s) => (
                      <tr key={s.id} className="border-t border-forge-border-subtle">
                        <td className="py-1 pr-3 text-forge-text-secondary">{s.stripeSubscriptionId ?? '—'}</td>
                        <td className="py-1 pr-3 text-forge-text-primary capitalize">{s.planKey}</td>
                        <td className="py-1 pr-3 text-forge-text-primary">{s.status}</td>
                        <td className="py-1">{s.cancelAtPeriodEnd ? <span className="text-forge-warning">Yes</span> : <span className="text-forge-text-muted">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Payment problems */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Failed / action required</h3>
        {problems === null ? <p className="text-xs text-forge-text-muted">—</p> : problems.length === 0 ? (
          <div className="rounded-md border border-forge-border-subtle bg-forge-panel px-3 py-4 text-sm text-forge-text-muted">No failed payments or webhook failures on record.</div>
        ) : (
          <div className="space-y-1.5">
            {problems.map((p) => (
              <div key={`${p.kind}-${p.id}`} className="flex items-center justify-between gap-3 rounded-md border border-forge-border-subtle bg-forge-panel px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {p.kind === 'past_due_subscription' ? <i className="ri-alert-line text-forge-warning" /> : <i className="ri-plug-line text-forge-warning" />}
                    <span className="text-sm text-forge-text-primary truncate">{p.customerEmail ?? p.customerName ?? (p.eventType ?? 'Webhook event')}</span>
                    {p.amount !== undefined && <span className="text-xs text-forge-text-secondary">{fmtMoney(p.amount)}</span>}
                  </div>
                  <p className="text-xs text-forge-text-muted truncate">{p.detail}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.at && <span className="text-xs text-forge-text-muted">{formatDate(p.at)}</span>}
                  {p.kind === 'past_due_subscription' && p.userId && canOperate && (
                    <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.billingRefresh(p.userId!), 'Refresh queued.')}><i className="ri-refresh-line" /> Refresh</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscriptions */}
      <div className="flex items-center gap-2 mb-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All statuses</option>
          {SUB_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {feedback && <span className="text-xs text-forge-success whitespace-nowrap">{feedback}</span>}
      </div>

      {loading ? <LoadingState label="Loading billing…" /> : error ? <ErrorState message={error} onRetry={load} /> : !subs || subs.length === 0 ? <EmptyState message="No subscriptions yet." /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Customer</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Plan</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Interval</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Amount</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Period ends</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Cancellation</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                    <td className="px-3 py-2">
                      <p className="text-sm text-forge-text-primary">{s.customerName ?? '—'}</p>
                      <p className="text-xs text-forge-text-muted">{s.customerEmail ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-forge-text-primary capitalize">{s.planKey}</td>
                    <td className="px-3 py-2 text-xs text-forge-text-secondary capitalize">{s.billingInterval ?? '—'}</td>
                    <td className="px-3 py-2 text-sm text-forge-text-secondary">{fmtMoney(s.amount)}</td>
                    <td className="px-3 py-2"><StatusPill status={s.status} /></td>
                    <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(s.currentPeriodEnd)}</td>
                    <td className="px-3 py-2 text-xs">{s.cancelAtPeriodEnd ? <span className="text-forge-warning">At period end</span> : <span className="text-forge-text-muted">—</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end">
                        {canOperate && <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.billingRefresh(s.userId), 'Refresh queued.')}><i className="ri-refresh-line" /> Refresh</Button>}
                      </div>
                    </td>
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