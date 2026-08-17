import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Box, CalendarDays, CheckCircle2, HelpCircle, LockKeyhole,
  RefreshCw, ShieldCheck, Tag,
} from 'lucide-react';
import {
  createHostedCheckoutSession, fetchUsageSummary, openBillingPortal,
} from '@/pages/projects/sandbox/sandboxBilling';
import { useAuthStore } from '@/stores/authStore';
import './checkout-page.css';

type PaidPlanKey = 'starter' | 'builder' | 'pro' | 'agency';

/* Approved billing contract — the single source of truth for display.
   Prices here mirror the pricing page and the server-resolved Stripe prices. */
const PLAN_COPY: Record<PaidPlanKey, {
  name: string;
  monthlyPrice: number;
  popular?: boolean;
  credits: string;
  pages: string;
  publishing: string;
}> = {
  starter: { name: 'Starter', monthlyPrice: 19, credits: '1,000 AI credits / month', pages: '10 pages per site', publishing: '1 published site' },
  builder: { name: 'Builder', monthlyPrice: 49, popular: true, credits: '3,000 AI credits / month', pages: '30 pages per site', publishing: '5 published sites' },
  pro: { name: 'Pro', monthlyPrice: 99, credits: '6,500 AI credits / month', pages: '100 pages per site', publishing: '20 published sites' },
  agency: { name: 'Agency', monthlyPrice: 249, credits: '16,000 AI credits / month', pages: '250 pages per site', publishing: '100 published sites' },
};

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'];

function ForgeCheckoutLogo() {
  return <span className="forge-checkout-logo" aria-label="Forge"><i aria-hidden="true" /><b>Forge</b></span>;
}

/* Stripe's hosted checkout refuses to render inside an iframe (it sends
   X-Frame-Options / frame-ancestors). In the readdy preview the app runs in an
   iframe, so navigating the current window makes the payment page appear blank.
   Navigate the top-level window instead, falling back to the current window. */
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  const [checking, setChecking] = useState(true);
  const [activeSubscription, setActiveSubscription] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const requested = useMemo(() => {
    const plan = searchParams.get('plan');
    const interval = searchParams.get('interval');
    const paidPlans: PaidPlanKey[] = ['starter', 'builder', 'pro', 'agency'];
    const validPlan = paidPlans.includes(plan as PaidPlanKey) ? (plan as PaidPlanKey) : null;
    const validInterval = interval === 'year' ? 'year' as const : interval === 'month' ? 'month' as const : null;
    return { plan: validPlan, interval: validInterval };
  }, [searchParams]);

  const plan = requested.plan ? PLAN_COPY[requested.plan] : null;
  const interval = requested.interval;
  const total = plan ? (interval === 'year' ? plan.monthlyPrice * 10 : plan.monthlyPrice) : 0;
  const totalLabel = `£${total.toLocaleString()}`;
  const perLabel = interval === 'year' ? '/year' : '/month';
  const email = user?.email ?? '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Wait for the session to resolve before deciding to redirect — avoids
    // bouncing an authenticated user to /login on a hard refresh.
    if (!initialized) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }
    if (!requested.plan || !requested.interval) {
      navigate('/pricing?billing=invalid', { replace: true });
      return;
    }

    let active = true;
    void fetchUsageSummary()
      .then((summary) => {
        if (!active) return;
        const status = summary?.subscriptionStatus;
        if (status && ACTIVE_SUB_STATUSES.includes(status as string)) {
          setActiveSubscription(true);
        }
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setChecking(false);
      });
    return () => { active = false; };
  }, [initialized, isAuthenticated, navigate, requested.interval, requested.plan]);

  async function handleContinue(): Promise<void> {
    if (!requested.plan || !requested.interval || redirecting) return;
    setRedirecting(true);
    setError(null);
    const requestKey = crypto.randomUUID();
    const result = await createHostedCheckoutSession(requested.plan, requested.interval, requestKey);
    if (result.ok) {
      openExternal(result.url);
      return;
    }
    setRedirecting(false);
    setError(result.message);
    setDiagnostic(result.diagnostic ?? null);
  }

  async function handleManageBilling(): Promise<void> {
    if (portalBusy) return;
    setPortalBusy(true);
    setError(null);
    const result = await openBillingPortal();
    setPortalBusy(false);
    if (result.ok) {
      openExternal(result.url);
      return;
    }
    setError(result.message);
  }

  const loading = !initialized || checking;

  return (
    <div className="forge-checkout-page">
      <header className="forge-checkout-header">
        <button type="button" onClick={() => navigate('/')}><ForgeCheckoutLogo /></button>
        <nav>
          <button type="button" onClick={() => navigate('/dashboard')}>Workspace</button>
          <button type="button" onClick={() => navigate('/projects')}>Projects</button>
          <button type="button" onClick={() => navigate('/templates')}>Templates</button>
          <button type="button" onClick={() => navigate('/help')}>How it works</button>
          <button type="button" onClick={() => navigate('/pricing')}>Pricing</button>
        </nav>
        <div>
          <button type="button" onClick={() => navigate('/help')}><HelpCircle />Help</button>
          <span><LockKeyhole />Secure checkout</span>
        </div>
      </header>

      {loading && (
        <div className="forge-checkout-state"><RefreshCw className="forge-checkout-spin" /><h1>Preparing your order</h1><p>Confirming your Forge plan…</p></div>
      )}

      {!loading && activeSubscription && (
        <div className="forge-checkout-state">
          <ShieldCheck />
          <h1>You already have an active subscription</h1>
          <p>Your Forge plan is already active. Use Manage billing to change or cancel it.</p>
          {error && <div className="forge-checkout-error" role="alert">{error}</div>}
          <button type="button" onClick={() => void handleManageBilling()} disabled={portalBusy}>
            {portalBusy ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      )}

      {!loading && !activeSubscription && plan && interval && (
        <main className="forge-checkout-shell">
          <section className="forge-checkout-summary" aria-labelledby="checkout-summary-title">
            <h1 id="checkout-summary-title">Review your plan</h1>
            <article className="forge-checkout-plan-card">
              <header>
                <span className="forge-plan-cube"><Box /></span>
                <div><h2>{plan.name}</h2><p><strong>{totalLabel}</strong> {perLabel}</p></div>
                {plan.popular && <span className="forge-plan-popular">Most popular</span>}
              </header>
              {interval === 'year' && <div className="forge-plan-saving"><CalendarDays />Pay yearly — save 2 months</div>}
              <ul>
                <li><CheckCircle2 />{plan.credits}</li>
                <li><CheckCircle2 />{plan.pages}</li>
                <li><CheckCircle2 />{plan.publishing}</li>
                <li><CheckCircle2 />Cancel anytime</li>
              </ul>
              <button type="button" className="forge-change-plan" onClick={() => navigate('/pricing')}>Change plan <ArrowLeft /></button>
              <footer><span>Recurring total</span><strong>{totalLabel}{perLabel}</strong></footer>
            </article>
            <div className="forge-checkout-trust">
              <div><ShieldCheck /><span><b>Secure checkout</b><small>Your payment details are encrypted</small></span></div>
              <div><Tag /><span><b>No setup fees</b><small>Start your plan immediately</small></span></div>
              <div><RefreshCw /><span><b>Manage or cancel anytime</b><small>Full control from your workspace</small></span></div>
            </div>
          </section>

          <section className="forge-checkout-payment" aria-labelledby="order-review-title">
            <h1 id="order-review-title">Order review</h1>
            <div className="forge-checkout-steps"><span>Plan</span><i>›</i><strong>Details</strong><i>›</i><span>Confirm</span></div>
            <div className="forge-checkout-email"><label>Email address</label><div>{email || 'Your Forge account email'}</div></div>

            <div className="forge-order-review">
              <div className="forge-order-row"><span>Plan</span><strong>{plan.name}</strong></div>
              <div className="forge-order-row"><span>Billing interval</span><strong>{interval === 'year' ? 'Yearly' : 'Monthly'}</strong></div>
              <div className="forge-order-total"><span>Recurring total</span><strong>{totalLabel} {perLabel}</strong></div>
            </div>

            <div className="forge-secure-badge"><ShieldCheck />Payments are securely processed by Stripe. Forge never sees or stores your card details.</div>

            {error && <div className="forge-checkout-error" role="alert">{error}</div>}
            {diagnostic && (
              <div className="forge-checkout-error" role="note" style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.85 }}>
                Diagnostic: {diagnostic}
              </div>
            )}

            <button className="forge-checkout-submit" type="button" onClick={() => void handleContinue()} disabled={redirecting}>
              {redirecting ? <><RefreshCw className="forge-checkout-spin" />Redirecting to Stripe…</> : 'Continue to secure payment'}
            </button>

            <p className="forge-stripe-note"><LockKeyhole />Secure checkout hosted by Stripe.</p>
            <p className="forge-stripe-powered">Powered by <b>stripe</b></p>
            <button type="button" className="forge-back-pricing" onClick={() => navigate('/pricing')}><ArrowLeft />Back to pricing</button>
          </section>
        </main>
      )}
    </div>
  );
}