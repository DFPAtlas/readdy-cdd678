import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BillingEventRow } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SubRow = { id: string; user_id: string; plan_key: string; status: string; stripe_subscription_id: string | null; current_period_end: string | null };

export function BillingSection() {
  const admin = useAdmin();
  const canOperate = hasPermission(admin, 'billing.operate');
  const [tab, setTab] = useState<'subscriptions' | 'events'>('subscriptions');
  const [subs, setSubs] = useState<SubRow[] | null>(null);
  const [events, setEvents] = useState<BillingEventRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [s, e] = await Promise.all([adminApi.billingList(), adminApi.billingEvents()]);
    if (s.ok) setSubs(s.data.subscriptions as SubRow[]);
    else setError(s.message);
    if (e.ok) setEvents(e.data.events);
    else if (!error) setError(e.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ ok: boolean; message?: string }>, label: string) => {
    setBusy(label);
    setFeedback('');
    const res = await fn();
    setBusy('');
    setFeedback(res.ok ? 'Done.' : res.message ?? 'Action failed.');
    load();
  };

  return (
    <div>
      <SectionTitle title="Billing Operations" description="Stripe remains the source of payment truth. Forge never rewrites it." />
      <div className="flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1 w-fit mb-5">
        <button onClick={() => setTab('subscriptions')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'subscriptions' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>Subscriptions</button>
        <button onClick={() => setTab('events')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === 'events' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>Webhook Events</button>
      </div>

      {feedback && <p className="mb-3 text-xs text-forge-success">{feedback}</p>}

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : (
        tab === 'subscriptions' ? (
          subs && subs.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">User</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Plan</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Renews</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Stripe</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2 text-xs text-forge-text-muted font-mono">{s.user_id?.slice(0, 8)}…</td>
                      <td className="px-3 py-2 text-sm text-forge-text-primary capitalize">{s.plan_key}</td>
                      <td className="px-3 py-2"><StatusPill status={s.status} /></td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary">{formatDate(s.current_period_end)}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted font-mono">{s.stripe_subscription_id ? s.stripe_subscription_id.slice(0, 12) + '…' : '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {canOperate && <Button size="sm" variant="ghost" disabled={busy === s.id} onClick={() => act(() => adminApi.billingRefresh(s.user_id), s.id)}><i className="ri-refresh-line" /> Refresh</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : <EmptyState message="No subscriptions yet." />
        ) : (
          events && events.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Type</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Attempts</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Received</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2 text-xs text-forge-text-primary">{String(ev.event_type ?? '—')}</td>
                      <td className="px-3 py-2"><StatusPill status={String(ev.processing_status ?? '')} /></td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary">{String(ev.attempt_count ?? 0)}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(String(ev.received_at ?? ''))}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {canOperate && String(ev.processing_status) === 'failed' && (
                            <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.billingReplay(ev.id), ev.id)}><i className="ri-history-line" /> Replay</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : <EmptyState message="No billing events received yet." />
        )
      )}

      {canOperate && <GrantCredits onDone={load} />}
    </div>
  );
}

function GrantCredits({ onDone }: { onDone: () => void }) {
  const [userId, setUserId] = useState('');
  const [credits, setCredits] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId || !credits || !reason) { setFeedback('All fields are required.'); return; }
    setBusy(true);
    const res = await adminApi.grantCredits(userId, Number(credits), reason);
    setBusy(false);
    setFeedback(res.ok ? 'Credits granted.' : res.message);
    if (res.ok) { setUserId(''); setCredits(''); setReason(''); onDone(); }
  };

  return (
    <Card className="mt-6">
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Grant promotional AI credits</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (uuid)" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
        <input value={credits} onChange={(e) => setCredits(e.target.value)} type="number" min={1} placeholder="Credits" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" loading={busy} onClick={submit} icon={<i className="ri-gift-line" />}>Grant credits</Button>
        {feedback && <span className="text-xs text-forge-text-secondary">{feedback}</span>}
      </div>
    </Card>
  );
}