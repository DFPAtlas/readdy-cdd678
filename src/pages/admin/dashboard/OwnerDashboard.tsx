import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, isOwner, type OwnerSnapshot, type ActivityFeedItem, type AttentionItem, type HealthResult } from '@/pages/admin/forgeAdmin';
import { useAdmin } from '@/pages/admin/AdminGuard';
import { StatCard, StatusPill, LoadingState, ErrorState, formatDate } from '@/pages/admin/components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ACTIVITY_ICONS: Record<string, { icon: string; cls: string }> = {
  account_created: { icon: 'ri-user-add-line', cls: 'text-forge-success' },
  subscription_created: { icon: 'ri-bank-card-line', cls: 'text-forge-success' },
  subscription_cancelled: { icon: 'ri-close-circle-line', cls: 'text-forge-warning' },
  project_created: { icon: 'ri-folder-add-line', cls: 'text-forge-accent' },
  build_completed: { icon: 'ri-checkbox-circle-line', cls: 'text-forge-success' },
  build_failed: { icon: 'ri-error-warning-line', cls: 'text-forge-error' },
  deployment: { icon: 'ri-rocket-line', cls: 'text-forge-accent' },
  deployment_failed: { icon: 'ri-close-circle-line', cls: 'text-forge-error' },
  incident_opened: { icon: 'ri-alert-line', cls: 'text-forge-error' },
};

// Health statuses honest to what the backend actually probes.
function fmtMoney(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function healthLabel(status: string, safeError: string | null): { label: string; tone: 'success' | 'warning' | 'error' | 'muted' } {
  if (status === 'healthy') return { label: 'Operational', tone: 'success' };
  if (status === 'degraded') return { label: 'Degraded', tone: 'warning' };
  if (status === 'down') return { label: 'Action Required', tone: 'error' };
  if (safeError?.toLowerCase().includes('not configured')) return { label: 'Not configured', tone: 'muted' };
  return { label: 'Unknown', tone: 'muted' };
}

const HEALTH_KEYS: { key: string; label: string }[] = [
  { key: 'web_app', label: 'Application' },
  { key: 'database', label: 'Supabase' },
  { key: 'stripe', label: 'Stripe' },
  { key: 'ai_providers', label: 'AI' },
  { key: 'deployment_workers', label: 'Build service' },
  { key: 'storage', label: 'Storage' },
];

export default function OwnerDashboard() {
  const admin = useAdmin();
  const owner = isOwner(admin);

  const [snapshot, setSnapshot] = useState<OwnerSnapshot | null>(null);
  const [attention, setAttention] = useState<AttentionItem[] | null>(null);
  const [attentionCheckedAt, setAttentionCheckedAt] = useState<string | null>(null);
  const [customers, setCustomers] = useState<ActivityFeedItem[]>([]);
  const [platform, setPlatform] = useState<ActivityFeedItem[]>([]);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [mrr, setMrr] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [s, a, act, h, bs] = await Promise.all([
      adminApi.ownerSnapshot(),
      adminApi.attention(),
      adminApi.ownerActivity(),
      adminApi.health(),
      adminApi.billingSummary(),
    ]);
    if (s.ok) setSnapshot(s.data); else setError(s.message);
    if (a.ok) { setAttention(a.data.items); setAttentionCheckedAt(a.data.checkedAt); }
    if (act.ok) { setCustomers(act.data.customers); setPlatform(act.data.platform); }
    if (h.ok) setHealth(h.data); else if (!error) setError(h.message);
    if (bs.ok) setMrr(bs.data.summary.mrr); else setMrr(null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading owner command centre…" />;
  if (error && !snapshot) return <ErrorState message={error} onRetry={load} />;

  const b = snapshot?.business;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-forge-text-primary">Forge Owner Command Centre</h2>
          <p className="mt-0.5 text-sm text-forge-text-muted">Monitor customers, revenue, usage, builds and platform health.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>
      </div>

      {/* 1 — Business snapshot */}
      <section className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Business Snapshot</h4>
        {b && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard label="Total customers" value={b.customers} icon="ri-user-3-line" tone="amber" />
            <StatCard label="Active subscriptions" value={b.activeSubscriptions} icon="ri-bank-card-line" tone="success" />
            <StatCard label="Monthly recurring revenue" value={mrr !== null ? <span className="text-2xl font-semibold">{fmtMoney(mrr)}</span> : <span className="text-forge-text-muted text-base font-normal">Unavailable</span>} icon="ri-money-dollar-circle-line" tone={mrr !== null ? 'amber' : 'muted'} hint={mrr !== null ? 'Normalized monthly, from active + past-due recurring subs' : 'No billing access or no price mapping'} />
            <StatCard label="Active projects" value={b.activeProjects} icon="ri-folder-3-line" tone="accent" />
            <StatCard label="Builds today" value={b.buildsToday} icon="ri-hammer-line" tone="accent" />
            <StatCard label="AI jobs queued" value={b.aiJobsQueued} icon="ri-robot-line" tone="agent" hint="AI cost unavailable — no provider pricing mapped" />
          </div>
        )}
      </section>

      {/* 2 — Needs attention (most important) */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted">Needs Attention</h4>
          {attentionCheckedAt && <span className="text-xs text-forge-text-muted">Checked {formatDate(attentionCheckedAt)}</span>}
        </div>
        <Card>
          {attention === null ? (
            <p className="text-sm text-forge-text-muted">Checking operational state…</p>
          ) : attention.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-forge-text-muted py-1">
              <i className="ri-checkbox-circle-line text-forge-success text-base" />
              No active issues detected from currently monitored systems.
            </div>
          ) : (
            <div className="divide-y divide-forge-border-subtle">
              {attention.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5"><StatusPill status={item.severity} /></div>
                    <div className="min-w-0">
                      <p className="text-sm text-forge-text-primary">{item.title}</p>
                      <p className="text-xs text-forge-text-muted">{item.detail}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-forge-text-primary flex-shrink-0">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* 3 + 4 — Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ActivityCard title="Customer Activity" items={customers} empty="No recent customer activity tracked in the last 7 days." />
        <ActivityCard title="Platform Activity" items={platform} empty="No recent platform activity recorded." />
      </div>

      {/* 5 — Revenue snapshot */}
      <section className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Revenue Snapshot</h4>
        <Card>
          {b ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RevenueMetric label="Current MRR" value={mrr !== null ? fmtMoney(mrr) : 'Unavailable'} note={mrr !== null ? 'Normalized monthly recurring revenue' : 'No billing access or no price mapping'} />
              <RevenueMetric label="Active subscriptions" value={String(b.activeSubscriptions)} />
              <RevenueMetric label="Past due subscriptions" value={String(b.pastDueSubscriptions)} tone={b.pastDueSubscriptions > 0 ? 'warning' : undefined} />
              <RevenueMetric label="Cancelled this period" value="Not tracked" note={`${b.scheduledCancellations} scheduled to cancel`} />
            </div>
          ) : (
            <p className="text-sm text-forge-text-muted">No billing data available.</p>
          )}
        </Card>
      </section>

      {/* 6 — Platform health */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted">Platform Health</h4>
          <Link to="/forge-admin/system" className="text-xs text-forge-amber hover:text-forge-amber-dim transition-colors">
            Open System Health <i className="ri-arrow-right-line" />
          </Link>
        </div>
        <Card>
          {health ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
              {HEALTH_KEYS.map(({ key, label }) => {
                const svc = health.services[key];
                const st = svc ? healthLabel(svc.status, svc.safeError) : { label: 'Unknown', tone: 'muted' as const };
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-forge-border-subtle">
                    <span className="text-xs text-forge-text-secondary">{label}</span>
                    <StatusPill status={st.tone === 'success' ? 'healthy' : st.tone === 'warning' ? 'degraded' : st.tone === 'error' ? 'down' : 'unknown'} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-forge-text-muted">No health data yet.</p>
          )}
        </Card>
      </section>

      {/* 7 — Quick actions */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <QuickAction to="/forge-admin/customers" icon="ri-team-line" label="View Customers" />
          <QuickAction to="/forge-admin/billing" icon="ri-bank-card-line" label="Review Failed Payments" />
          <QuickAction to="/forge-admin/builds" icon="ri-hammer-line" label="Review Failed Builds" />
          <QuickAction to="/forge-admin/incidents" icon="ri-alert-line" label="Open Incidents" />
          <QuickAction to="/forge-admin/system" icon="ri-pulse-line" label="Open System Health" />
          {owner && <QuickAction to="/forge-admin/admins" icon="ri-shield-user-line" label="Manage Admin Team" />}
        </div>
      </section>

      {admin && <span className="sr-only">{admin.role}</span>}
    </div>
  );
}

function ActivityCard({ title, items, empty }: { title: string; items: ActivityFeedItem[]; empty: string }) {
  return (
    <Card>
      <h4 className="text-sm font-semibold text-forge-text-primary mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-forge-text-muted">{empty}</p>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {items.map((item) => {
            const meta = ACTIVITY_ICONS[item.type] ?? { icon: 'ri-record-circle-line', cls: 'text-forge-text-muted' };
            return (
              <div key={item.id} className="flex items-start gap-2.5 py-1.5 border-b border-forge-border-subtle last:border-0">
                <i className={`${meta.icon} ${meta.cls} text-base mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-forge-text-primary">{item.title}</p>
                  <p className="text-xs text-forge-text-muted truncate">{item.detail}</p>
                </div>
                <span className="text-[10px] text-forge-text-muted flex-shrink-0">{formatDate(item.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RevenueMetric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'warning' }) {
  return (
    <div>
      <p className="text-xs text-forge-text-muted">{label}</p>
      <p className={`text-lg font-semibold ${tone === 'warning' ? 'text-forge-warning' : 'text-forge-text-primary'}`}>{value}</p>
      {note && <p className="text-[10px] text-forge-text-muted mt-0.5">{note}</p>}
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-secondary hover:text-forge-text-primary hover:border-forge-amber/40 transition-colors"
    >
      <i className={`${icon} text-base`} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}