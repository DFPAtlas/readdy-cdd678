import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Bell, Box, Check, ChevronDown, CreditCard, FileText, Folder,
  Globe, Grid2X2, HelpCircle, Layers3, LayoutTemplate, Link2, Loader2,
  RefreshCw, Rocket, ShieldCheck, Star, Tag, Users, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchPlanCatalogue, fetchUsageSummary, openBillingPortal,
  type PlanCatalogue, type PlanKey, type UsageSummary,
} from '@/pages/projects/sandbox/sandboxBilling';
import './pricing-page.css';

/* ──────────────────────────────────────────────────────────────
   Forge Pricing — approved billing contract (static display) wired
   to the server-controlled catalogue + usage summary. The browser
   never computes money from input and never sends a Stripe price ID;
   checkout is gated on the server reporting pricing configured.
   ────────────────────────────────────────────────────────────── */

type DisplayPlan = {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  credits: string;
  pages: string;
  publishing: string;
  icon: typeof Box;
  popular?: boolean;
};

/* Approved billing contract — the single source of truth for display. */
const PLANS: DisplayPlan[] = [
  { key: 'free', name: 'Free', monthlyPrice: 0, credits: '150 trial credits', pages: '3 pages per site', publishing: 'Preview only', icon: Box },
  { key: 'starter', name: 'Starter', monthlyPrice: 19, credits: '1,000 AI credits', pages: '10 pages per site', publishing: '1 published site', icon: Rocket },
  { key: 'builder', name: 'Builder', monthlyPrice: 49, credits: '3,000 AI credits', pages: '30 pages per site', publishing: '5 published sites', icon: Layers3, popular: true },
  { key: 'pro', name: 'Pro', monthlyPrice: 99, credits: '6,500 AI credits', pages: '100 pages per site', publishing: '20 published sites', icon: Star },
  { key: 'agency', name: 'Agency', monthlyPrice: 249, credits: '16,000 AI credits', pages: '250 pages per site', publishing: '100 published sites', icon: Users },
];

const METER_ICONS: Record<string, typeof Zap> = {
  ai_credits: Zap,
  projects: Folder,
  pages: FileText,
  team_members: Users,
  published_sites: Globe,
  custom_domains: Link2,
};

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'] as const;
const CONFIRM_TIMEOUT_MS = 30000;
const INTENT_KEY = 'forge_checkout_intent';

type NoticeKind = 'info' | 'success' | 'error';
type Notice = { kind: NoticeKind; text: string };
type ConfirmState = 'idle' | 'confirming' | 'confirmed' | 'timeout';

function ForgePricingLogo() {
  return <span className="forge-pricing-logo" aria-label="Forge"><i aria-hidden="true" /><b>Forge</b></span>;
}

/* Stripe's hosted pages refuse to render inside an iframe. In the readdy
   preview the app runs in an iframe, so navigate the top window instead. */
function openExternal(url: string): void {
  try {
    if (window.self !== window.top) {
      window.top.location.assign(url);
      return;
    }
  } catch {
    /* sandboxed without top-navigation — try a new tab below */
  }

  // Stripe refuses to render inside an iframe (X-Frame-Options). When the
  // preview iframe blocks top-navigation, open Stripe in a fresh top-level tab.
  const newTab = window.open(url, '_blank', 'noopener,noreferrer');
  if (newTab) return;

  // Last resort: navigate the current window.
  window.location.assign(url);
}

function percentage(used: number, limit: number | null): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'Trial';
    case 'past_due': return 'Past due';
    case 'unpaid': return 'Unpaid';
    case 'paused': return 'Paused';
    case 'canceled':
    case 'cancelled': return 'Canceled';
    case 'incomplete':
    case 'incomplete_expired': return 'Incomplete';
    default: return 'Free plan';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function readIntent(): { planKey?: PlanKey; interval?: 'month' | 'year' } | null {
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    return raw ? JSON.parse(raw) as { planKey?: PlanKey; interval?: 'month' | 'year' } : null;
  } catch {
    return null;
  }
}

function clearIntent(): void {
  try { window.sessionStorage.removeItem(INTENT_KEY); } catch { /* best-effort */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConfirmedSummary(summary: UsageSummary): boolean {
  const active = summary.subscriptionStatus === 'active' || summary.subscriptionStatus === 'trialing';
  if (!active || summary.planKey === 'free') return false;
  const intent = readIntent();
  if (intent?.planKey && intent.planKey !== summary.planKey) return false;
  return true;
}

async function pollForConfirmation(): Promise<UsageSummary | null> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  let delay = 750;
  while (Date.now() < deadline) {
    await sleep(delay);
    const summary = await fetchUsageSummary();
    if (summary && isConfirmedSummary(summary)) return summary;
    delay = Math.min(delay * 2, 4000);
  }
  return null;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [interval, setIntervalState] = useState<'month' | 'year'>('month');
  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');

  const pricingConfigured = catalogue?.pricingConfigured === true;
  const hasActiveSubscription = !!summary?.subscriptionStatus
    && (ACTIVE_SUB_STATUSES as readonly string[]).includes(summary.subscriptionStatus as string);
  const currentPlanKey: PlanKey = summary?.planKey ?? 'free';
  const subscriptionStatus = summary?.subscriptionStatus ?? null;
  const renewalDate = summary?.renewalDate ?? null;

  async function loadData(): Promise<UsageSummary | null> {
    const [cat, sum] = await Promise.all([fetchPlanCatalogue(), fetchUsageSummary()]);
    setCatalogue(cat);
    setSummary(sum);
    return sum;
  }

  async function runConfirmation(): Promise<void> {
    setConfirmState('confirming');
    setNotice(null);
    const confirmed = await pollForConfirmation();
    if (confirmed) {
      setSummary(confirmed);
      setConfirmState('confirmed');
      clearIntent();
      setNotice({ kind: 'success', text: 'Subscription confirmed. Your Forge limits have been updated.' });
    } else {
      setConfirmState('timeout');
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const intent = readIntent();
    if (intent?.interval === 'month' || intent?.interval === 'year') setIntervalState(intent.interval);

    void loadData();

    const billing = searchParams.get('billing');
    if (billing === 'success') {
      void runConfirmation();
    } else if (billing === 'cancelled') {
      clearIntent();
      setNotice({ kind: 'info', text: 'Checkout cancelled. Your current plan has not changed.' });
    } else if (billing === 'invalid') {
      clearIntent();
      setNotice({ kind: 'error', text: 'That plan or billing interval is not available. Please choose a plan below.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManageBilling(): Promise<void> {
    if (busy) return;
    setBusy('portal');
    setNotice(null);
    try {
      const result = await openBillingPortal();
      if (result.ok) {
        openExternal(result.url);
        return;
      }
      setNotice({ kind: 'error', text: result.message });
    } finally {
      setBusy(null);
    }
  }

  function onPlanClick(plan: DisplayPlan): void {
    if (busy) return;

    if (hasActiveSubscription) {
      void handleManageBilling();
      return;
    }

    if (plan.key === 'free') {
      if (!isAuthenticated) navigate('/login?redirect=/pricing');
      return;
    }

    // Paid plan — store only the safe intended plan + interval (never a price
    // ID or Stripe object), then hand off through real auth where needed.
    if (!isAuthenticated) {
      try { window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({ planKey: plan.key, interval })); } catch { /* best-effort */ }
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?plan=${plan.key}&interval=${interval}`)}`);
      return;
    }

    if (!pricingConfigured) {
      setNotice({ kind: 'error', text: 'Billing temporarily unavailable. Please try again shortly.' });
      return;
    }

    // Checkout re-validates plan/interval and resolves the Stripe price
    // server-side from a fixed lookup key — the browser only ever sends these two.
    navigate(`/checkout?plan=${plan.key}&interval=${interval}`);
  }

  const NoticeIcon = notice?.kind === 'error' ? AlertTriangle : ShieldCheck;

  return (
    <div className="forge-pricing-page">
      <noscript>
        <div className="forge-pricing-notice">Forge billing requires JavaScript. Please enable JavaScript to manage your subscription.</div>
      </noscript>

      <header className="forge-pricing-header">
        <button type="button" className="forge-pricing-home" onClick={() => navigate('/')}><ForgePricingLogo /></button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => navigate('/dashboard')}><Grid2X2 />Workspace</button>
          <button type="button" onClick={() => navigate('/projects')}><Folder />Projects</button>
          <button type="button" onClick={() => navigate('/templates')}><LayoutTemplate />Templates</button>
          <button type="button" className="active"><Tag />Pricing</button>
        </nav>
        <div className="forge-pricing-tools"><button type="button" onClick={() => navigate('/help')} aria-label="Help"><HelpCircle /></button><button type="button" aria-label="Notifications"><Bell /></button><span>A</span><ChevronDown /></div>
      </header>

      <main>
        <section className="forge-pricing-hero">
          <p className="forge-pricing-kicker">SIMPLE, CONTROLLED AI PRICING</p>
          <h1>Build more. Pay only for the AI you use.</h1>
          <p>Every plan includes the visual Forge workspace. Upgrade for more AI credits, pages and published websites.</p>
          <div className="forge-billing-toggle" role="group" aria-label="Billing interval">
            <button type="button" aria-pressed={interval === 'month'} className={interval === 'month' ? 'active' : ''} onClick={() => setIntervalState('month')}>Monthly</button>
            <button type="button" aria-pressed={interval === 'year'} className={interval === 'year' ? 'active' : ''} onClick={() => setIntervalState('year')}>Yearly — Save 2 months</button>
          </div>
        </section>

        {confirmState === 'confirming' && (
          <div className="forge-pricing-notice" role="status" aria-live="polite"><Loader2 className="spin" />Confirming your subscription…</div>
        )}

        {confirmState === 'timeout' && (
          <div className="forge-pricing-notice forge-pricing-notice--warn" role="status" aria-live="polite">
            <AlertTriangle />
            <span><strong>Payment received; subscription confirmation is still processing.</strong> It can take a moment after checkout.</span>
            <span className="forge-confirm-actions">
              <button type="button" onClick={() => void runConfirmation()}><RefreshCw />Refresh</button>
              <button type="button" onClick={() => void handleManageBilling()}>Manage billing</button>
            </span>
          </div>
        )}

        {notice && confirmState !== 'confirming' && confirmState !== 'timeout' && (
          <div className={`forge-pricing-notice${notice.kind === 'error' ? ' forge-pricing-notice--error' : ''}`} role="status" aria-live="polite">
            <NoticeIcon />{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button>
          </div>
        )}

        {isAuthenticated && catalogue && !pricingConfigured && (
          <div className="forge-pricing-notice forge-pricing-notice--error" role="status" aria-live="polite">
            <AlertTriangle />Billing temporarily unavailable. Paid plans will be available here shortly.
          </div>
        )}

        <section className="forge-plan-grid" aria-label="Forge subscription plans" aria-busy={busy !== null}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = interval === 'year' ? plan.monthlyPrice * 10 : plan.monthlyPrice;
            const current = currentPlanKey === plan.key;

            let label: string;
            let disabled = false;
            let loading = false;

            if (hasActiveSubscription) {
              label = 'Manage billing';
              disabled = busy !== null;
              loading = busy === 'portal';
            } else if (plan.key === 'free') {
              if (!isAuthenticated) { label = 'Start free'; disabled = busy !== null; }
              else { label = 'Current plan'; disabled = true; }
            } else if (!isAuthenticated) {
              label = `Choose ${plan.name}`;
              disabled = busy !== null;
            } else if (!pricingConfigured) {
              label = 'Unavailable';
              disabled = true;
            } else {
              label = `Choose ${plan.name}`;
              disabled = busy !== null;
              loading = busy === plan.key;
            }

            return (
              <article key={plan.key} className={`${plan.popular ? 'popular' : ''}${current ? ' current' : ''}`}>
                {plan.popular && <span className="forge-popular-tag">MOST POPULAR</span>}
                {current && <span className="forge-current-plan">CURRENT PLAN</span>}
                <Icon className="forge-plan-icon" />
                <h2>{plan.name}</h2>
                <div className="forge-plan-price"><strong>£{price}</strong>{plan.monthlyPrice > 0 && <span>/{interval === 'year' ? 'yr' : 'mo'}</span>}</div>
                {interval === 'year' && plan.monthlyPrice > 0 && <p className="forge-plan-saving">Equivalent to £{Math.round((price / 12) * 100) / 100}/month</p>}
                <ul><li><Check />{plan.credits}</li><li><Check />{plan.pages}</li><li><Check />{plan.publishing}</li></ul>
                <button
                  type="button"
                  className={plan.popular ? 'primary' : ''}
                  disabled={disabled}
                  aria-label={`${label} — ${plan.name} plan`}
                  onClick={() => onPlanClick(plan)}
                >
                  {loading ? <Loader2 className="spin" /> : label}
                </button>
              </article>
            );
          })}
        </section>

        <section className="forge-pricing-summary">
          <article className="forge-credit-card">
            <div className="forge-credit-icon"><Zap /></div><div><h2>Need more power?</h2><p>Buy extra AI credits anytime — they never interrupt your build.</p><button type="button" onClick={() => navigate('/dashboard')}>Buy AI credits</button></div>
          </article>

          <article className="forge-live-usage">
            <div className="forge-usage-header">
              <h3>Your live usage</h3>
              {(subscriptionStatus || renewalDate) && (
                <div className="forge-usage-status" aria-label="Subscription status">
                  <span className={`dot${subscriptionStatus === 'past_due' ? ' past-due' : ''}`} aria-hidden="true" />
                  <span>{statusLabel(subscriptionStatus)}</span>
                  {renewalDate && <span>· renews {formatDate(renewalDate)}</span>}
                </div>
              )}
            </div>

            {summary && summary.meters.length > 0 ? (
              <div className="forge-usage-grid">
                {summary.meters.map((meter) => {
                  const MeterIcon = METER_ICONS[meter.key] ?? Zap;
                  const remaining = meter.limit == null ? meter.used : Math.max(0, meter.limit - meter.used);
                  const pct = percentage(meter.used, meter.limit);
                  return (
                    <div className="forge-usage-tile" key={meter.key}>
                      <div className="forge-usage-tile-head">
                        <span className={meter.key === 'ai_credits' ? 'green' : ''}><MeterIcon /></span>
                        <div>
                          <strong>{remaining.toLocaleString()}</strong>
                          <p>{meter.label}</p>
                        </div>
                      </div>
                      <div className="forge-meter-track" role="progressbar" aria-label={meter.label} aria-valuemin={0} aria-valuemax={meter.limit ?? 100} aria-valuenow={meter.used}>
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <footer>
                        <span>{meter.used.toLocaleString()} used</span>
                        <span>{meter.limit == null ? 'Unlimited' : `${meter.limit.toLocaleString()} ${meter.unit}`}</span>
                      </footer>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="forge-usage-empty"><CreditCard /><div><h3>Your live usage</h3><p>Sign in and connect billing to see remaining credits, projects, pages and domains here.</p><button type="button" onClick={() => navigate('/login')}>View my account</button></div></div>
            )}
          </article>
        </section>

        <div className="forge-pricing-footnote"><ShieldCheck />AI usage protected by spend controls <button type="button" onClick={() => void handleManageBilling()} disabled={busy !== null || !hasActiveSubscription}>{busy === 'portal' ? 'Opening…' : 'Manage billing'}</button></div>
      </main>
    </div>
  );
}