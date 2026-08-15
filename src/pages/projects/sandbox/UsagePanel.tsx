import { useCallback, useEffect, useState } from 'react';
import {
  CreditCard, Gauge, RefreshCw, ArrowUpRight, AlertTriangle, Shield, Zap,
  Check, Sparkles, Settings2, Wallet,
} from 'lucide-react';
import {
  fetchUsageSummary, fetchPlanCatalogue, startCheckout, openBillingPortal,
  adminGrantCredits, adminUpdateEntitlement,
  type UsageSummary, type PlanCatalogue, type PlanKey, type Meter,
} from './sandboxBilling';

type UsagePanelProps = { onNotify: (message: string) => void };

const PLAN_BADGES: Record<PlanKey, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency',
};

const ENTITLEMENT_KEYS = [
  'max_active_projects', 'max_pages_per_project', 'max_team_members',
  'monthly_ai_credits', 'asset_storage_mb', 'monthly_form_submissions',
  'custom_domains', 'published_sites', 'version_history_retention_days',
];

function formatPrice(price: { amount: number; currency: string; interval: 'month' | 'year' } | null): string {
  if (!price) return '—';
  try {
    const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency, minimumFractionDigits: 0 }).format(price.amount / 100);
    return `${formatted} / ${price.interval}`;
  } catch {
    return `${price.amount / 100} / ${price.interval}`;
  }
}

function meterPercent(meter: Meter): number {
  if (meter.limit === null || meter.limit <= 0) return 0;
  return Math.min(100, Math.round((meter.used / meter.limit) * 100));
}

function meterLevel(percent: number): 'ok' | 'caution' | 'warning' | 'danger' {
  if (percent >= 100) return 'danger';
  if (percent >= 90) return 'warning';
  if (percent >= 75) return 'caution';
  return 'ok';
}

export default function UsagePanel({ onNotify }: UsagePanelProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);

  // Admin form state
  const [grantUserId, setGrantUserId] = useState('');
  const [grantCredits, setGrantCredits] = useState('100');
  const [grantReason, setGrantReason] = useState('');
  const [entPlan, setEntPlan] = useState<PlanKey>('starter');
  const [entKey, setEntKey] = useState('monthly_ai_credits');
  const [entValue, setEntValue] = useState('');
  const [entReason, setEntReason] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [sum, cat] = await Promise.all([fetchUsageSummary(), fetchPlanCatalogue()]);
    setSummary(sum);
    setCatalogue(cat);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const goExternal = (url: string) => { window.open(url, '_self', 'noopener'); };

  const upgrade = async (planKey: PlanKey) => {
    if (planKey === 'free' || busy) return;
    setBusy(planKey);
    const result = await startCheckout(planKey);
    setBusy(null);
    if (result.ok) goExternal(result.url);
    else onNotify(result.message);
  };

  const manageBilling = async () => {
    if (busy) return;
    setBusy('portal');
    const result = await openBillingPortal();
    setBusy(null);
    if (result.ok) goExternal(result.url);
    else onNotify(result.message);
  };

  const doGrant = async () => {
    if (!grantUserId.trim() || Number(grantCredits) <= 0) return onNotify('Enter a user ID and positive credits');
    const result = await adminGrantCredits(grantUserId.trim(), Number(grantCredits), grantReason.trim());
    onNotify(result.message);
    if (result.ok) { setGrantUserId(''); setGrantCredits('100'); setGrantReason(''); void refresh(); }
  };

  const doEntitlement = async () => {
    if (!entReason.trim()) return onNotify('A reason is required for entitlement changes');
    const result = await adminUpdateEntitlement({
      planKey: entPlan,
      entitlementKey: entKey as typeof ENTITLEMENT_KEYS[number],
      limitValue: entValue.trim() === '' || entValue.trim() === 'null' ? null : Number(entValue),
      reason: entReason.trim(),
    });
    onNotify(result.message);
    if (result.ok) { setEntReason(''); void refresh(); }
  };

  if (loading) {
    return <div className="usage-empty"><RefreshCw className="spin" size={20} /><p>Loading usage…</p></div>;
  }

  const planKey = summary?.planKey ?? 'free';
  const pricingConfigured = summary?.pricingConfigured ?? false;
  const subscriptionStatus = summary?.subscriptionStatus ?? null;
  const renewalDate = summary?.renewalDate ?? null;

  return (
    <div className="usage-panel">
      {/* Current plan header */}
      <div className="usage-plan-header">
        <div className="usage-plan-badge">{PLAN_BADGES[planKey]}</div>
        <div className="usage-plan-meta">
          {subscriptionStatus && <span className="usage-status"><i className={subscriptionStatus} />{subscriptionStatus.replace('_', ' ')}</span>}
          {renewalDate && <span className="usage-renewal">Renews {new Date(renewalDate).toLocaleDateString()}</span>}
        </div>
        <button className="usage-manage" onClick={() => void manageBilling()} disabled={busy !== null || !pricingConfigured}>
          {busy === 'portal' ? <RefreshCw className="spin" size={13} /> : <CreditCard size={13} />} Manage billing
        </button>
      </div>

      {!pricingConfigured && (
        <div className="usage-notice">
          <AlertTriangle size={14} />
          <span>Billing is not configured. Upgrades are disabled until Stripe is connected — your current usage is still tracked accurately.</span>
        </div>
      )}

      {/* Usage meters */}
      <div className="usage-section">
        <h4>Usage</h4>
        {(summary?.meters ?? []).map((meter) => {
          const percent = meterPercent(meter);
          const level = meterLevel(percent);
          return (
            <div key={meter.key} className="usage-meter">
              <div className="usage-meter-head">
                <span>{meter.label}</span>
                <b className={level}>{meter.used.toLocaleString()}{meter.limit !== null ? ` / ${meter.limit.toLocaleString()} ${meter.unit}` : ` ${meter.unit} · unlimited`}</b>
              </div>
              <div className="usage-meter-track">
                <span className={`usage-meter-fill ${level}`} style={{ width: `${meter.limit === null ? 0 : percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Plans */}
      <div className="usage-section">
        <h4>Plans</h4>
        <div className="usage-plans">
          {(catalogue?.plans ?? []).map((plan) => {
            const current = plan.key === planKey;
            return (
              <div key={plan.key} className={`usage-plan-card ${current ? 'current' : ''}`}>
                <div className="usage-plan-card-head">
                  <span>{plan.name}</span>
                  {current && <em className="usage-current-tag"><Check size={11} /> Current</em>}
                </div>
                <p className="usage-plan-price">{formatPrice(plan.price)}</p>
                <p className="usage-plan-desc">{plan.description}</p>
                <ul className="usage-plan-features">
                  {plan.features.map((feature) => <li key={feature}><Sparkles size={11} />{feature}</li>)}
                </ul>
                {!current && (
                  <button
                    className={`usage-upgrade ${plan.key === 'agency' ? 'accent' : ''}`}
                    disabled={busy !== null || !pricingConfigured}
                    onClick={() => void upgrade(plan.key)}
                  >
                    {busy === plan.key ? <RefreshCw className="spin" size={13} /> : <ArrowUpRight size={13} />}
                    {plan.key === 'free' ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin */}
      {summary?.isAdmin && (
        <div className="usage-section">
          <button className="usage-admin-toggle" onClick={() => setAdminOpen((open) => !open)}>
            <Shield size={14} /> Admin controls
          </button>
          {adminOpen && (
            <div className="usage-admin">
              <div className="usage-admin-block">
                <h5><Wallet size={13} /> Grant promotional credits</h5>
                <label className="fb-label">User ID<input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="00000000-…" /></label>
                <label className="fb-label">Credits<input type="number" min="1" value={grantCredits} onChange={(e) => setGrantCredits(e.target.value)} /></label>
                <label className="fb-label">Reason<input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="Promotion, refund, etc." /></label>
                <button className="usage-admin-action" onClick={() => void doGrant()}>Grant credits</button>
              </div>

              <div className="usage-admin-block">
                <h5><Settings2 size={13} /> Adjust entitlement</h5>
                <div className="fb-row">
                  <label className="fb-label">Plan
                    <select value={entPlan} onChange={(e) => setEntPlan(e.target.value as PlanKey)}>
                      <option value="free">Free</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="agency">Agency</option>
                    </select>
                  </label>
                  <label className="fb-label">Entitlement
                    <select value={entKey} onChange={(e) => setEntKey(e.target.value)}>
                      {ENTITLEMENT_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>
                </div>
                <label className="fb-label">Limit (empty or "null" for unlimited)<input value={entValue} onChange={(e) => setEntValue(e.target.value)} placeholder="1000" /></label>
                <label className="fb-label">Reason<input value={entReason} onChange={(e) => setEntReason(e.target.value)} placeholder="Required for audit" /></label>
                <button className="usage-admin-action" onClick={() => void doEntitlement()}>Update entitlement</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="usage-footnote">
        <Zap size={12} /> Prices and limits are controlled server-side and reflect your active Stripe plan. Taxes are applied by Stripe when configured.
      </p>
    </div>
  );
}