import { useCallback, useEffect, useState } from 'react';
import { adminApi, type CustomerRow, type CustomerSummary, type CustomerDetail } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { SectionTitle, LoadingState, ErrorState, EmptyState, StatusPill, StatCard, formatDate, formatBytes } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';

const PLAN_OPTIONS = ['free', 'starter', 'builder', 'pro', 'agency'];
const STATUS_OPTIONS = ['active', 'trialing', 'past_due', 'cancelled'];

const PAGE_SIZE = 25;

export default function CustomersPage() {
  const admin = useAdmin();
  const canSuspend = hasPermission(admin, 'users.suspend');

  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // detail drawer
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.customersList({ query, plan: plan || undefined, status: status || undefined, page, pageSize: PAGE_SIZE });
    if (res.ok) {
      setRows(res.data.customers);
      setSummary(res.data.summary);
      setTotal(res.data.total);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [query, plan, status, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [query, plan, status]);

  const openDetail = async (userId: string) => {
    setDetailLoading(true);
    setFeedback('');
    const res = await adminApi.customersGet(userId);
    if (res.ok) setDetail(res.data.customer);
    else setFeedback(res.message);
    setDetailLoading(false);
  };

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, label: string) => {
    setFeedback('');
    const res = await fn();
    setFeedback(res.ok ? label : res.message ?? 'Action failed.');
    if (res.ok) load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle
        title="Customers"
        description="Manage Forge accounts, subscription state and account activity."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <StatCard label="Total accounts" value={summary.totalAccounts} icon="ri-user-3-line" tone="amber" />
          <StatCard label="Active paid" value={summary.activePaid} icon="ri-bank-card-line" tone="success" />
          <StatCard label="Trial" value={summary.trialing} icon="ri-hourglass-line" tone="accent" />
          <StatCard label="Past due" value={summary.pastDue} icon="ri-alert-line" tone="warning" />
          <StatCard label="New this month" value={summary.newThisMonth} icon="ri-user-add-line" tone="muted" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted text-sm" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-8 pl-8 pr-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber"
          />
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All plans</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {feedback && <span className="text-xs text-forge-success whitespace-nowrap">{feedback}</span>}
      </div>

      {loading ? <LoadingState label="Loading customers…" /> : error ? <ErrorState message={error} onRetry={load} /> : !rows || rows.length === 0 ? <EmptyState message="No customers match these filters." /> : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Customer</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Plan</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Subscription</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Projects</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Last activity</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Joined</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-forge-text-primary">{u.displayName ?? '—'}</span>
                          {u.adminRole && <span className="text-[9px] uppercase tracking-wide text-forge-amber bg-forge-amber/10 rounded px-1 py-0.5">{u.adminRole}</span>}
                        </div>
                        <p className="text-xs text-forge-text-muted">{u.email ?? '—'}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary capitalize">{u.plan ?? '—'}</td>
                      <td className="px-3 py-2"><StatusPill status={u.subscriptionStatus} /></td>
                      <td className="px-3 py-2 text-sm text-forge-text-secondary">{u.projectCount}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(u.lastActivity)}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(u.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(u.id)}><i className="ri-eye-line" /> View</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-xs text-forge-text-muted">
            <span>{total} account{total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ri-arrow-left-s-line" /> Prev</Button>
              <span>Page {page} of {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <i className="ri-arrow-right-s-line" /></Button>
            </div>
          </div>
        </>
      )}

      {/* Detail drawer */}
      <Drawer open={!!detail || detailLoading} onClose={() => setDetail(null)} title="Customer detail" position="right" width="w-[480px]">
        {detailLoading ? <div className="p-4"><LoadingState label="Loading customer…" /></div> : detail && (
          <div className="p-4 space-y-5">
            {/* Account */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Account</h4>
              <div className="rounded-md bg-forge-panel-elevated p-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-forge-text-primary">{detail.account.displayName ?? '—'}</span>
                  {detail.account.email && <span className="text-forge-text-muted">· {detail.account.email}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-forge-text-muted">
                  <span className="font-mono">{detail.account.id.slice(0, 8)}…{detail.account.id.slice(-4)}</span>
                  <button className="text-forge-amber hover:text-forge-amber-dim whitespace-nowrap" onClick={() => navigator.clipboard?.writeText(detail.account.id)}>
                    <i className="ri-file-copy-line mr-1" />Copy ID
                  </button>
                </div>
                <p className="text-xs text-forge-text-muted">Joined {formatDate(detail.account.createdAt)}</p>
              </div>
            </section>

            {/* Subscription */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Subscription</h4>
              {detail.subscription ? (
                <div className="rounded-md bg-forge-panel-elevated p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-forge-text-primary capitalize">{detail.subscription.planKey}</span>
                    <StatusPill status={detail.subscription.status} />
                    {detail.subscription.billingInterval && <span className="text-xs text-forge-text-muted">/ {detail.subscription.billingInterval}</span>}
                  </div>
                  <p className="text-xs text-forge-text-muted">Period ends {formatDate(detail.subscription.currentPeriodEnd)}</p>
                  {detail.subscription.cancelAtPeriodEnd && <p className="text-xs text-forge-warning">Cancels at period end</p>}
                  {detail.subscription.stripeCustomerId && (
                    <p className="text-xs text-forge-text-muted font-mono">Stripe cus_{detail.subscription.stripeCustomerId.slice(0, 10)}…</p>
                  )}
                </div>
              ) : <p className="text-sm text-forge-text-muted">No subscription on record.</p>}
            </section>

            {/* Usage */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Usage (last 30 days)</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta label="AI requests" value={detail.usage.aiRequests} />
                <Meta label="AI credits" value={detail.usage.aiCredits} />
                <Meta label="Tokens" value={detail.usage.aiTokens.toLocaleString()} />
                <Meta label="Storage" value={formatBytes(detail.usage.storageBytes)} />
              </div>
            </section>

            {/* Projects */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Projects ({detail.projects.length})</h4>
              {detail.projects.length === 0 ? <p className="text-sm text-forge-text-muted">No projects.</p> : (
                <div className="space-y-1.5">
                  {detail.projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md bg-forge-panel-elevated px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-forge-text-primary truncate">{p.name}</p>
                        <p className="text-xs text-forge-text-muted">/{p.slug} · {p.pageCount} pages</p>
                      </div>
                      <StatusPill status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent builds */}
            {detail.recentBuilds.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Recent builds</h4>
                <div className="space-y-1">
                  {detail.recentBuilds.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-forge-border-subtle last:border-0">
                      <span className="text-forge-text-muted font-mono">{b.id.slice(0, 8)}</span>
                      <StatusPill status={b.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Support notes */}
            {detail.supportNotes.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Support notes</h4>
                <div className="space-y-1.5">
                  {detail.supportNotes.map((n, i) => (
                    <div key={i} className="rounded-md bg-forge-panel-elevated px-3 py-2">
                      <p className="text-xs text-forge-text-secondary">{n.reason}</p>
                      <p className="text-[10px] text-forge-text-muted mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            {canSuspend && (
              <div className="pt-2 border-t border-forge-border-subtle flex gap-2">
                <Button size="sm" variant="danger" onClick={() => {
                  const r = window.prompt(`Reason for suspending ${detail.account.email ?? 'this account'}?`);
                  if (r && r.trim()) act(() => adminApi.suspendUser(detail.account.id, r.trim()), 'Account suspended.');
                }}><i className="ri-forbid-2-line" /> Suspend</Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  const r = window.prompt('Reason for restoring this account?');
                  if (r && r.trim()) act(() => adminApi.restoreUser(detail.account.id, r.trim()), 'Account restored.');
                }}><i className="ri-play-circle-line" /> Restore</Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-forge-panel-elevated px-2.5 py-2">
      <p className="text-[10px] text-forge-text-muted">{label}</p>
      <p className="text-sm font-medium text-forge-text-primary">{value}</p>
    </div>
  );
}