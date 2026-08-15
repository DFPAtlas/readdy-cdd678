import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import {
  ArrowLeft, Box, CalendarDays, CheckCircle2, HelpCircle, LockKeyhole,
  RefreshCw, ShieldCheck, Tag,
} from 'lucide-react';
import {
  createEmbeddedCheckoutSession,
  type EmbeddedCheckoutSession,
  type PlanKey,
} from '@/pages/projects/sandbox/sandboxBilling';
import { useAuthStore } from '@/stores/authStore';
import './checkout-page.css';

type PaidPlanKey = Exclude<PlanKey, 'free'>;

const PLAN_COPY: Record<PaidPlanKey, { name: string; popular?: boolean }> = {
  starter: { name: 'Starter' },
  builder: { name: 'Builder', popular: true },
  pro: { name: 'Pro' },
  agency: { name: 'Agency' },
};

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function ForgeCheckoutLogo() {
  return <span className="forge-checkout-logo" aria-label="Forge"><i aria-hidden="true" /><b>Forge</b></span>;
}

function entitlementLabel(value: number | null | undefined, singular: string, plural: string) {
  if (value === null) return `Unlimited ${plural}`;
  if (typeof value !== 'number') return null;
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function CheckoutBody({ session }: { session: EmbeddedCheckoutSession }) {
  const navigate = useNavigate();
  const checkoutState = useCheckoutElements();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const plan = PLAN_COPY[session.planKey];
  const entitlements = session.entitlements;

  const confirm = async () => {
    if (checkoutState.type !== 'success' || !checkoutState.checkout.canConfirm || !agreed || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await checkoutState.checkout.confirm({
        returnUrl: `${window.location.origin}/checkout/complete`,
      });
      if (result.type === 'error') setMessage(result.error.message);
    } catch {
      setMessage('We could not confirm the payment. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void confirm();
  };

  if (checkoutState.type === 'loading') {
    return <div className="forge-checkout-state"><RefreshCw className="forge-checkout-spin" /><h1>Loading secure payment fields</h1><p>Connecting to Stripe…</p></div>;
  }
  if (checkoutState.type === 'error') {
    return <div className="forge-checkout-state error"><ShieldCheck /><h1>Checkout could not load</h1><p>{checkoutState.error.message}</p><button onClick={() => navigate('/pricing')}>Back to pricing</button></div>;
  }

  const { checkout } = checkoutState;
  const stripeTotal = checkout.total.total.amount;
  const displayPrice = stripeTotal || new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(session.amount / 100);
  const credits = entitlementLabel(entitlements.monthly_ai_credits, 'AI credit each month', 'AI credits each month');
  const pages = entitlementLabel(entitlements.max_pages_per_project, 'page per site', 'pages per site');
  const published = entitlementLabel(entitlements.published_sites, 'published site', 'published sites');
  const domains = entitlementLabel(entitlements.custom_domains, 'custom domain', 'custom domains');

  return (
    <main className="forge-checkout-shell">
      <section className="forge-checkout-summary" aria-labelledby="checkout-summary-title">
        <h1 id="checkout-summary-title">Complete your upgrade</h1>
        <article className="forge-checkout-plan-card">
          <header>
            <span className="forge-plan-cube"><Box /></span>
            <div><h2>{plan.name}</h2><p><strong>{displayPrice}</strong> / {session.billingInterval === 'year' ? 'year' : 'month'}</p></div>
            {plan.popular && <span className="forge-plan-popular">Most popular</span>}
          </header>
          {session.billingInterval === 'year' && <div className="forge-plan-saving"><CalendarDays />Pay yearly — save 2 months</div>}
          <ul>
            {credits && <li><CheckCircle2 />{credits}</li>}
            {pages && <li><CheckCircle2 />{pages}</li>}
            {published && <li><CheckCircle2 />{published}</li>}
            {domains && <li><CheckCircle2 />{domains}</li>}
            <li><CheckCircle2 />Cancel anytime</li>
          </ul>
          <button type="button" className="forge-change-plan" onClick={() => navigate('/pricing')}>Change plan <ArrowLeft /></button>
          <footer><span>Today’s total</span><strong>{displayPrice}</strong></footer>
        </article>
        <div className="forge-checkout-trust">
          <div><ShieldCheck /><span><b>Secure checkout</b><small>Your payment details are encrypted</small></span></div>
          <div><Tag /><span><b>No setup fees</b><small>Start your plan immediately</small></span></div>
          <div><RefreshCw /><span><b>Manage or cancel anytime</b><small>Full control from your workspace</small></span></div>
        </div>
      </section>

      <section className="forge-checkout-payment" aria-labelledby="payment-details-title">
        <h1 id="payment-details-title">Payment details</h1>
        <div className="forge-checkout-steps"><span>Plan</span><i>›</i><strong>Details</strong><i>›</i><span>Confirm</span></div>
        <div className="forge-checkout-email"><label>Email address</label><div>{session.email || 'Your Forge account email'}</div></div>
        <form onSubmit={submit}>
          <div className="forge-payment-label"><LockKeyhole />Express checkout</div>
          <ExpressCheckoutElement
            options={{
              buttonHeight: 46,
              buttonTheme: undefined,
              buttonType: undefined,
              layout: { maxColumns: 2, maxRows: 1, overflow: 'auto' },
              paymentMethodOrder: undefined,
              paymentMethods: undefined,
            }}
            onConfirm={() => void confirm()}
          />
          <div className="forge-checkout-divider"><span>or pay another way</span></div>
          <div className="forge-payment-label"><LockKeyhole />Secure payment method</div>
          <PaymentElement />
          <label className="forge-checkout-consent">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>I agree to the <a href="/help?topic=terms" target="_blank" rel="noreferrer">Terms</a> and <a href="/help?topic=privacy" target="_blank" rel="noreferrer">Privacy Policy</a></span>
          </label>
          {message && <div className="forge-checkout-error" role="alert">{message}</div>}
          <button className="forge-checkout-submit" type="submit" disabled={!agreed || !checkout.canConfirm || submitting}>
            {submitting ? <><RefreshCw className="forge-checkout-spin" />Processing securely…</> : `Start ${plan.name} plan — ${displayPrice}`}
          </button>
        </form>
        <p className="forge-stripe-note"><LockKeyhole />Secure payment fields provided by Stripe. Forge never sees or stores your card details.</p>
        <p className="forge-stripe-powered">Powered by <b>stripe</b></p>
        <button type="button" className="forge-back-pricing" onClick={() => navigate('/pricing')}><ArrowLeft />Back to pricing</button>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [session, setSession] = useState<EmbeddedCheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requested = useMemo(() => {
    const plan = searchParams.get('plan');
    const interval = searchParams.get('interval');
    const paidPlans: PaidPlanKey[] = ['starter', 'builder', 'pro', 'agency'];
    return {
      plan: paidPlans.includes(plan as PaidPlanKey) ? plan as PaidPlanKey : null,
      interval: interval === 'year' ? 'year' as const : 'month' as const,
    };
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!isAuthenticated) {
      navigate('/login', { replace: true, state: { returnTo: window.location.pathname + window.location.search } });
      return;
    }
    if (!stripeKey) {
      setError('Stripe’s publishable key has not been configured for Forge.');
      return;
    }
    if (!requested.plan) {
      setError('Choose a paid Forge plan before opening checkout.');
      return;
    }
    let active = true;
    const requestKey = crypto.randomUUID();
    void createEmbeddedCheckoutSession(requested.plan, requested.interval, requestKey).then((result) => {
      if (!active) return;
      if (result.ok) setSession(result.session);
      else setError('message' in result ? result.message : 'Checkout unavailable.');
    });
    return () => { active = false; };
  }, [isAuthenticated, navigate, requested.interval, requested.plan]);

  return (
    <div className="forge-checkout-page">
      <header className="forge-checkout-header">
        <button type="button" onClick={() => navigate('/')}><ForgeCheckoutLogo /></button>
        <nav><button onClick={() => navigate('/dashboard')}>Workspace</button><button onClick={() => navigate('/projects')}>Projects</button><button onClick={() => navigate('/templates')}>Templates</button><button onClick={() => navigate('/help')}>How it works</button><button onClick={() => navigate('/pricing')}>Pricing</button></nav>
        <div><button onClick={() => navigate('/help')}><HelpCircle />Help</button><span><LockKeyhole />Secure checkout</span></div>
      </header>
      {!session && !error && <div className="forge-checkout-state"><RefreshCw className="forge-checkout-spin" /><h1>Preparing your secure checkout</h1><p>Confirming your Forge plan with Stripe…</p></div>}
      {error && <div className="forge-checkout-state error"><ShieldCheck /><h1>Checkout unavailable</h1><p>{error}</p><button onClick={() => navigate('/pricing')}>Back to pricing</button></div>}
      {session && stripePromise && (
        <CheckoutElementsProvider
          stripe={stripePromise}
          options={{
            clientSecret: session.clientSecret,
            elementsOptions: {
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#ff7a00',
                  colorBackground: '#0f1820',
                  colorText: '#f5f7f8',
                  colorDanger: '#ff6464',
                  colorTextSecondary: '#9aa6b2',
                  borderRadius: '7px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  spacingUnit: '4px',
                },
              },
              loader: 'auto',
            },
          }}
        >
          <CheckoutBody session={session} />
        </CheckoutElementsProvider>
      )}
    </div>
  );
}
