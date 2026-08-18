import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, Sparkles, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  createCreditTopupSession, fetchCreditBalance, fetchCreditPacks,
  type CreditBalance, type CreditPack,
} from '@/pages/projects/sandbox/sandboxBilling';

const BASELINE_KEY = 'forge_credit_purchase_baseline';
const POLL_TIMEOUT_MS = 45000;

type ConfirmState = 'idle' | 'processing' | 'confirmed' | 'delayed';
type Notice = { kind: 'info' | 'success' | 'error'; text: string } | null;

/* Stripe's hosted checkout refuses to render inside an iframe. Navigate the
   top-level window, falling back to the current window. */
function openExternal(url: string): void {
  try {
    if (window.self !== window.top) {
      window.top.location.assign(url);
      return;
    }
  } catch {
    /* sandboxed without top-navigation — try a new tab below */
  }
  const newTab = window.open(url, '_blank', 'noopener,noreferrer');
  if (newTab) return;
  window.location.assign(url);
}

function formatPounds(pricePence: number): string {
  const pounds = pricePence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

function formatCostPerCredit(pack: CreditPack): string {
  return `£${(pack.pricePence / pack.credits / 100).toFixed(3)}`;
}

function readBaseline(): number | null {
  try {
    const raw = window.sessionStorage.getItem(BASELINE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function clearBaseline(): void {
  try { window.sessionStorage.removeItem(BASELINE_KEY); } catch { /* best-effort */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CreditsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, pk] = await Promise.all([fetchCreditBalance(), fetchCreditPacks()]);
      setBalance(bal);
      setPacks(pk);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    void load();
  }, [load]);

  // Purchase confirmation flow after returning from Stripe.
  useEffect(() => {
    const purchase = searchParams.get('purchase');
    if (purchase === 'cancelled') {
      clearBaseline();
      setNotice({ kind: 'info', text: 'Checkout cancelled. No credits were added.' });
      return;
    }
    if (purchase !== 'processing') return;

    const baseline = readBaseline();
    if (baseline === null) {
      setConfirmState('delayed');
      return;
    }

    let cancelled = false;
    setConfirmState('processing');
    (async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let delay = 1000;
      while (Date.now() < deadline && !cancelled) {
        await sleep(delay);
        const bal = await fetchCreditBalance();
        if (bal && (bal.purchased_credits_total ?? 0) > baseline) {
          if (!cancelled) {
            setBalance(bal);
            setConfirmState('confirmed');
            clearBaseline();
            setNotice({ kind: 'success', text: 'Credits added successfully.' });
          }
          return;
        }
        delay = Math.min(delay * 2, 4000);
      }
      if (!cancelled) setConfirmState('delayed');
    })();

    return () => { cancelled = true; };
  }, [searchParams]);

  async function handleBuy(pack: CreditPack): Promise<void> {
    if (busy) return;
    setBusy(pack.key);
    setNotice(null);
    try {
      // Capture a transient baseline so the confirmation screen can detect the
      // purchased-balance increase. This is NOT an authoritative balance.
      const bal = await fetchCreditBalance();
      if (bal) {
        try { window.sessionStorage.setItem(BASELINE_KEY, String(bal.purchased_credits_total ?? 0)); } catch { /* best-effort */ }
      }
      const requestKey = crypto.randomUUID();
      const result = await createCreditTopupSession(pack.key, requestKey);
      if (result.ok) {
        openExternal(result.url);
        return;
      }
      clearBaseline();
      setNotice({ kind: 'error', text: result.message });
      setBusy(null);
    } catch {
      clearBaseline();
      setNotice({ kind: 'error', text: 'We couldn\u2019t start the credit checkout. Please try again.' });
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl space-y-5">
        <div className="h-8 w-56 rounded-md bg-forge-border" />
        <div className="h-4 w-96 max-w-full rounded-md bg-forge-border" />
        <div className="h-32 rounded-lg bg-forge-panel" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 rounded-lg bg-forge-panel" />)}
        </div>
      </div>
    );
  }

  const monthlyRemaining = balance?.monthly_credits_remaining ?? 0;
  const purchasedRemaining = balance?.purchased_credits_remaining ?? 0;
  const totalRemaining = balance?.total_credits_remaining ?? 0;

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-forge-text-primary">AI Credit Top-Ups</h1>
        <p className="mt-1 text-sm text-forge-text-muted">
          Need extra capacity without changing your plan? Add AI credits whenever you need them.
        </p>
      </header>

      {confirmState === 'processing' && (
        <div className="flex items-center gap-3 rounded-lg border border-forge-border bg-forge-panel p-4" role="status" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin text-forge-amber" />
          <div>
            <p className="text-sm font-medium text-forge-text-primary">Confirming your credit purchase…</p>
            <p className="text-xs text-forge-text-muted">We\u2019re verifying your payment with Stripe.</p>
          </div>
        </div>
      )}

      {confirmState === 'delayed' && (
        <div className="rounded-lg border border-forge-border bg-forge-panel p-4" role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-forge-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-forge-text-primary">Payment may be complete, but Forge is still confirming the purchase.</p>
              <p className="text-xs text-forge-text-muted mt-0.5">Please do not pay again.</p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setConfirmState('idle'); void load(); }} icon={<RefreshCw className="h-3.5 w-3.5" />}>Check again</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Return to workspace</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmState === 'confirmed' && (
        <div className="flex items-center gap-3 rounded-lg border border-forge-success/30 bg-forge-success/10 p-4" role="status" aria-live="polite">
          <Check className="h-5 w-5 text-forge-success" />
          <p className="text-sm font-medium text-forge-success">Credits added successfully.</p>
        </div>
      )}

      {notice && confirmState !== 'processing' && confirmState !== 'delayed' && (
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${notice.kind === 'error' ? 'border-forge-error/30 bg-forge-error/10' : 'border-forge-border bg-forge-panel'}`} role="status" aria-live="polite">
          {notice.kind === 'error' ? <AlertTriangle className="h-5 w-5 text-forge-error shrink-0" /> : <Sparkles className="h-5 w-5 text-forge-amber shrink-0" />}
          <p className={`text-sm ${notice.kind === 'error' ? 'text-forge-error' : 'text-forge-text-primary'}`}>{notice.text}</p>
        </div>
      )}

      {balance && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-forge-text-primary">Your credit balance</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <dt className="text-xs text-forge-text-muted">Monthly allowance</dt>
              <dd className="mt-0.5 text-sm text-forge-text-primary">{(balance.monthly_credit_limit ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-forge-text-muted">Monthly used</dt>
              <dd className="mt-0.5 text-sm text-forge-text-primary">{(balance.monthly_credits_used ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-forge-text-muted">Monthly remaining</dt>
              <dd className="mt-0.5 text-sm text-forge-text-primary">{monthlyRemaining.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-forge-text-muted">Purchased remaining</dt>
              <dd className="mt-0.5 text-sm text-forge-text-primary">{purchasedRemaining.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-forge-amber">Total available</dt>
              <dd className="mt-0.5 text-sm font-semibold text-forge-amber">{totalRemaining.toLocaleString()}</dd>
            </div>
          </dl>
        </Card>
      )}

      <section aria-labelledby="packs-heading">
        <h2 id="packs-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
          One-time credit packs
        </h2>
        {packs && packs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map((pack) => (
              <Card key={pack.key} className={`relative flex flex-col p-5 ${pack.bestValue ? 'border-forge-amber/40' : ''}`}>
                {pack.bestValue && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-forge-amber px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-forge-text-inverse whitespace-nowrap">
                    BEST VALUE
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 flex items-center justify-center rounded-md bg-forge-border text-forge-amber">
                    <Zap className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-forge-text-primary">{pack.credits.toLocaleString()}</p>
                <p className="text-xs text-forge-text-muted">AI credits</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold text-forge-text-primary">{formatPounds(pack.pricePence)}</span>
                  <span className="text-xs text-forge-text-muted">one-time</span>
                </div>
                <p className="mt-1 text-xs text-forge-text-secondary">{formatCostPerCredit(pack)} / credit</p>
                <Button
                  className="mt-4 w-full"
                  variant={pack.bestValue ? 'primary' : 'secondary'}
                  size="md"
                  loading={busy === pack.key}
                  disabled={busy !== null}
                  onClick={() => void handleBuy(pack)}
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Buy credits
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5">
            <p className="text-sm text-forge-text-muted">Credit packs are temporarily unavailable. Please try again shortly.</p>
          </Card>
        )}
      </section>

      <p className="text-xs text-forge-text-muted">
        Credits are one-time and never expire. They are used only after your monthly allowance is exhausted, and never change your plan, limits or subscription.
      </p>
    </div>
  );
}