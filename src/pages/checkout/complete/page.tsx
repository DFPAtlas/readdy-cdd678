import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchUsageSummary, type UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';
import '../checkout-page.css';

type ConfirmationState = 'checking' | 'confirmed' | 'delayed';

const INTENT_KEY = 'forge_checkout_intent';

/* Clears only the temporary checkout-intent state set during the abandoned or
   completed checkout journey. Never touches auth/subscription/customer state. */
function clearCheckoutIntent(): void {
  try { window.sessionStorage.removeItem(INTENT_KEY); } catch { /* best-effort */ }
}

export default function CheckoutCompletePage() {
  const [state, setState] = useState<ConfirmationState>('checking');
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [checking, setChecking] = useState(false);

  /* In-page retry of the trusted billing-summary check. No full browser reload,
     and never creates another Stripe Checkout Session. */
  async function runCheck(): Promise<void> {
    if (checking) return;
    setChecking(true);
    setState('checking');

    const deadline = Date.now() + 8_000;
    let delay = 1000;
    let confirmed: UsageSummary | null = null;

    while (Date.now() < deadline) {
      const next = await fetchUsageSummary();
      if (next?.subscriptionStatus === 'active' || next?.subscriptionStatus === 'trialing') {
        confirmed = next;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 2000);
    }

    if (confirmed) {
      setSummary(confirmed);
      setState('confirmed');
    } else {
      setState('delayed');
    }
    setChecking(false);
  }

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const check = async () => {
      const next = await fetchUsageSummary();
      if (cancelled) return;
      if (next?.subscriptionStatus === 'active' || next?.subscriptionStatus === 'trialing') {
        setSummary(next);
        setState('confirmed');
        return;
      }
      if (Date.now() - started >= 30_000) {
        setState('delayed');
        return;
      }
      window.setTimeout(() => void check(), 1800);
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="forge-checkout-page">
      <div className="forge-checkout-state">
        {state === 'checking' && <><RefreshCw className="forge-checkout-spin" /><h1>Confirming your subscription</h1><p>Stripe has returned you to Forge. We’re waiting for the signed webhook before enabling your plan.</p></>}
        {state === 'confirmed' && (
          <>
            <CheckCircle2 />
            <h1>Your {summary?.planKey} plan is active</h1>
            <p>Your Forge limits and AI credit allowance have been refreshed.</p>
            <Link to="/dashboard" className="forge-checkout-link-btn primary">Continue to workspace</Link>
          </>
        )}
        {state === 'delayed' && (
          <>
            <Clock3 />
            <h1>Subscription confirmation is processing</h1>
            <p>Your payment may be complete, but Forge has not received the final signed webhook yet. No second payment is needed.</p>
            <div className="forge-checkout-actions">
              <button type="button" className="primary" onClick={() => void runCheck()} disabled={checking}>
                {checking ? <><RefreshCw className="forge-checkout-spin" />Checking…</> : 'Check again'}
              </button>
              <Link to="/pricing" className="forge-checkout-link-btn" onClick={clearCheckoutIntent}>Return to pricing</Link>
            </div>
          </>
        )}
        <p className="forge-stripe-note"><ShieldCheck />Access is granted only after server-side Stripe confirmation.</p>
      </div>
    </div>
  );
}