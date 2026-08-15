import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchUsageSummary, type UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';
import '../checkout-page.css';

type ConfirmationState = 'checking' | 'confirmed' | 'delayed';

export default function CheckoutCompletePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmationState>('checking');
  const [summary, setSummary] = useState<UsageSummary | null>(null);

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
        {state === 'confirmed' && <><CheckCircle2 /><h1>Your {summary?.planKey} plan is active</h1><p>Your Forge limits and AI credit allowance have been refreshed.</p><button onClick={() => navigate('/dashboard')}>Continue to workspace</button></>}
        {state === 'delayed' && <><Clock3 /><h1>Subscription confirmation is processing</h1><p>Your payment may be complete, but Forge has not received the final signed webhook yet. No second payment is needed.</p><button onClick={() => window.location.reload()}>Check again</button><button onClick={() => navigate('/pricing')}>Return to pricing</button></>}
        <p className="forge-stripe-note"><ShieldCheck />Access is granted only after server-side Stripe confirmation.</p>
      </div>
    </div>
  );
}
