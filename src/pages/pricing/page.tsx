import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Box, Check, ChevronDown, CreditCard, FileText, Folder, Grid2X2,
  HelpCircle, Layers3, LayoutTemplate, Loader2, Rocket, ShieldCheck, Star,
  Tag, Users, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchUsageSummary, openBillingPortal, startCheckout,
  type PlanKey, type UsageSummary,
} from '@/pages/projects/sandbox/sandboxBilling';
import './pricing-page.css';

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

const PLANS: DisplayPlan[] = [
  { key: 'free', name: 'Free', monthlyPrice: 0, credits: '150 trial credits', pages: '3 pages per site', publishing: 'Preview only', icon: Box },
  { key: 'starter', name: 'Starter', monthlyPrice: 19, credits: '1,000 AI credits', pages: '10 pages per site', publishing: '1 published site', icon: Rocket },
  { key: 'builder', name: 'Builder', monthlyPrice: 49, credits: '3,000 AI credits', pages: '30 pages per site', publishing: '5 published sites', icon: Layers3, popular: true },
  { key: 'pro', name: 'Pro', monthlyPrice: 99, credits: '6,500 AI credits', pages: '100 pages per site', publishing: '20 published sites', icon: Star },
  { key: 'agency', name: 'Agency', monthlyPrice: 249, credits: '16,000 AI credits', pages: '250 pages per site', publishing: '100 published sites', icon: Users },
];

function ForgePricingLogo() {
  return <span className="forge-pricing-logo" aria-label="Forge"><i aria-hidden="true" /><b>Forge</b></span>;
}

function percentage(used: number, limit: number | null): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function PricingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [busy, setBusy] = useState<PlanKey | 'portal' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const billingResult = new URLSearchParams(window.location.search).get('billing');
    if (billingResult === 'success') setNotice('Subscription confirmed. Your Forge limits are being refreshed.');
    if (billingResult === 'cancelled') setNotice('Checkout cancelled. Your current plan has not changed.');
    void fetchUsageSummary().then(setUsage);
  }, []);

  const creditMeter = useMemo(() => usage?.meters.find((meter) => meter.key === 'ai_credits') ?? null, [usage]);
  const pageMeter = useMemo(() => usage?.meters.find((meter) => meter.key === 'pages') ?? null, [usage]);

  const choosePlan = async (plan: DisplayPlan) => {
    if (plan.key === 'free') {
      navigate(isAuthenticated ? '/projects/new' : '/login');
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setBusy(plan.key);
    setNotice(null);
    const result = await startCheckout(plan.key, interval);
    setBusy(null);
    if (result.ok) window.location.assign(result.url);
    else setNotice(result.message);
  };

  const manageBilling = async () => {
    setBusy('portal');
    const result = await openBillingPortal();
    setBusy(null);
    if (result.ok) window.location.assign(result.url);
    else setNotice(result.message);
  };

  return (
    <div className="forge-pricing-page">
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
            <button type="button" className={interval === 'month' ? 'active' : ''} onClick={() => setInterval('month')}>Monthly</button>
            <button type="button" className={interval === 'year' ? 'active' : ''} onClick={() => setInterval('year')}>Yearly — Save 2 months</button>
          </div>
        </section>

        {notice && <div className="forge-pricing-notice" role="status"><ShieldCheck />{notice}<button type="button" onClick={() => setNotice(null)}>×</button></div>}

        <section className="forge-plan-grid" aria-label="Forge subscription plans">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = interval === 'year' ? plan.monthlyPrice * 10 : plan.monthlyPrice;
            const current = usage?.planKey === plan.key;
            return (
              <article key={plan.key} className={`${plan.popular ? 'popular' : ''}${current ? ' current' : ''}`}>
                {plan.popular && <span className="forge-popular-tag">MOST POPULAR</span>}
                {current && <span className="forge-current-plan">CURRENT PLAN</span>}
                <Icon className="forge-plan-icon" />
                <h2>{plan.name}</h2>
                <div className="forge-plan-price"><strong>£{price}</strong>{plan.monthlyPrice > 0 && <span>/{interval === 'year' ? 'yr' : 'mo'}</span>}</div>
                {interval === 'year' && plan.monthlyPrice > 0 && <p className="forge-plan-saving">Equivalent to £{Math.round((price / 12) * 100) / 100}/month</p>}
                <ul><li><Check />{plan.credits}</li><li><Check />{plan.pages}</li><li><Check />{plan.publishing}</li></ul>
                <button type="button" className={plan.popular ? 'primary' : ''} disabled={busy !== null || current} onClick={() => void choosePlan(plan)}>
                  {busy === plan.key ? <Loader2 className="spin" /> : current ? 'Current plan' : plan.key === 'free' ? 'Start free' : `Choose ${plan.name}`}
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
            {creditMeter && pageMeter ? (
              <>
                <div className="forge-usage-meter"><div><span className="green"><Zap /></span><strong>{Math.max(0, (creditMeter.limit ?? creditMeter.used) - creditMeter.used).toLocaleString()}</strong><p>credits remaining</p></div><div className="forge-meter-track"><span style={{ width: `${percentage(creditMeter.used, creditMeter.limit)}%` }} /></div><footer><span>0</span><span>{creditMeter.limit?.toLocaleString() ?? 'Unlimited'}</span></footer></div>
                <div className="forge-usage-meter"><div><span><FileText /></span><strong>{pageMeter.used}</strong><p>of {pageMeter.limit ?? '∞'} pages used</p></div><div className="forge-meter-track"><span style={{ width: `${percentage(pageMeter.used, pageMeter.limit)}%` }} /></div><footer><span>0</span><span>{pageMeter.limit ?? 'Unlimited'}</span></footer></div>
              </>
            ) : (
              <div className="forge-usage-empty"><CreditCard /><div><h3>Your live usage</h3><p>Sign in and connect billing to see remaining credits and page usage here.</p><button type="button" onClick={() => navigate('/login')}>View my account</button></div></div>
            )}
          </article>
        </section>

        <div className="forge-pricing-footnote"><ShieldCheck />AI usage protected by spend controls <button type="button" onClick={() => void manageBilling()} disabled={busy !== null}>{busy === 'portal' ? 'Opening…' : 'Manage billing'}</button></div>
      </main>
    </div>
  );
}
