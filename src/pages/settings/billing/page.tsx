import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  fetchPlanCatalogue, fetchUsageSummary, openBillingPortal,
  type PlanCatalogue, type PlanCatalogueEntry, type UsageSummary,
} from '@/pages/projects/sandbox/sandboxBilling';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { CurrentPlanCard } from './components/CurrentPlanCard';
import { UsageSection } from './components/UsageSection';
import { PlanFeaturesSection } from './components/PlanFeaturesSection';
import { BillingDetailsSection } from './components/BillingDetailsSection';
import { SubscriptionActionsSection } from './components/SubscriptionActionsSection';
import { capitalize } from './billingFormat';

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

function BillingSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

export default function SettingsBillingPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [catalogue, setCatalogue] = useState<PlanCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, cat] = await Promise.all([fetchUsageSummary(), fetchPlanCatalogue()]);
      setSummary(sum);
      setCatalogue(cat);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleManageBilling = useCallback(async () => {
    if (busy) return;
    setBusy('portal');
    setPortalError(null);
    try {
      const result = await openBillingPortal();
      if (result.ok) {
        openExternal(result.url);
        return;
      }
      setPortalError(result.message);
    } finally {
      setBusy(null);
    }
  }, [busy]);

  if (loading) return <BillingSkeleton />;

  if (!summary) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view billing"
        description="You need to be signed in to view your plan, usage and billing actions."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  const planEntry: PlanCatalogueEntry | null =
    catalogue?.plans.find((p) => p.key === summary.planKey) ?? null;
  const planName = planEntry?.name ?? capitalize(summary.planKey);
  const planDescription = planEntry?.description ?? null;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-forge-text-primary">Billing</h2>
        <p className="text-sm text-forge-text-muted mt-0.5">
          Your plan, usage and billing actions. Payments and subscription changes are managed securely through Stripe.
        </p>
      </div>

      <CurrentPlanCard
        summary={summary}
        planName={planName}
        planDescription={planDescription}
        busy={busy}
        portalError={portalError}
        onManageBilling={handleManageBilling}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <UsageSection meters={summary.meters} />
        <PlanFeaturesSection features={planEntry?.features ?? []} entitlements={planEntry?.entitlements ?? {}} />
      </div>

      <BillingDetailsSection summary={summary} busy={busy} onManagePayment={handleManageBilling} />

      <SubscriptionActionsSection summary={summary} busy={busy} onManageBilling={handleManageBilling} />
    </div>
  );
}