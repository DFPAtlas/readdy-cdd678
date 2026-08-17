import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { AlertTriangle, ArrowUpRight, ExternalLink } from 'lucide-react';
import type { UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';
import { statusLabel, statusTone, isProblemStatus, intervalLabel, formatDate, type StatusTone } from '../billingFormat';

const toneDot: Record<StatusTone, string> = {
  success: 'bg-forge-success',
  warning: 'bg-forge-warning',
  error: 'bg-forge-error',
  muted: 'bg-forge-text-muted',
};

const toneText: Record<StatusTone, string> = {
  success: 'text-forge-success',
  warning: 'text-forge-warning',
  error: 'text-forge-error',
  muted: 'text-forge-text-muted',
};

interface CurrentPlanCardProps {
  summary: UsageSummary;
  planName: string;
  planDescription: string | null;
  busy: string | null;
  portalError: string | null;
  onManageBilling: () => void;
}

export function CurrentPlanCard({
  summary,
  planName,
  planDescription,
  busy,
  portalError,
  onManageBilling,
}: CurrentPlanCardProps) {
  const status = summary.subscriptionStatus;
  const tone = statusTone(status);
  const hasSubscription = status !== null;
  const isCanceled = status === 'canceled';
  const problem = isProblemStatus(status);

  return (
    <Card className="p-5 border-forge-amber/25">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-forge-amber">Current plan</p>
          <h2 className="mt-1 text-xl font-semibold text-forge-text-primary">{planName}</h2>
          {planDescription && <p className="mt-1 text-sm text-forge-text-muted">{planDescription}</p>}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-forge-panel-elevated border border-forge-border ${toneText[tone]} whitespace-nowrap`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
          {statusLabel(status)}
        </span>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-forge-text-muted">Billing</dt>
          <dd className="text-forge-text-primary">{intervalLabel(summary.billingInterval)}</dd>
        </div>
        <div>
          <dt className="text-xs text-forge-text-muted">{hasSubscription && !isCanceled ? 'Renews' : 'Status'}</dt>
          <dd className="text-forge-text-primary">
            {hasSubscription && !isCanceled ? formatDate(summary.renewalDate) : isCanceled ? 'Subscription ended' : 'No paid subscription'}
          </dd>
        </div>
        {summary.cancelAtPeriodEnd && hasSubscription && !isCanceled && (
          <div>
            <dt className="text-xs text-forge-text-muted">Scheduled to end</dt>
            <dd className="text-forge-warning">{formatDate(summary.renewalDate)}</dd>
          </div>
        )}
      </dl>

      {problem && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-forge-error/30 bg-forge-error/10 p-3" role="alert">
          <AlertTriangle className="h-4 w-4 text-forge-error shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-forge-error">Payment action required</p>
            <p className="text-xs text-forge-text-secondary mt-0.5">
              Your subscription has a payment issue. Update your payment method to keep your plan active.
            </p>
          </div>
        </div>
      )}

      {portalError && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-forge-error/30 bg-forge-error/10 p-3" role="alert">
          <AlertTriangle className="h-4 w-4 text-forge-error shrink-0 mt-0.5" />
          <p className="text-sm text-forge-error">{portalError}</p>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {hasSubscription && !isCanceled ? (
          <Button
            variant={problem ? 'primary' : 'secondary'}
            size="sm"
            loading={busy === 'portal'}
            onClick={onManageBilling}
            icon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            Manage subscription
          </Button>
        ) : (
          <LinkButton to="/pricing" variant="primary" size="sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {isCanceled ? 'Choose a plan' : 'Upgrade plan'}
          </LinkButton>
        )}
        <span className="text-xs text-forge-text-muted">Billing is managed securely via Stripe.</span>
      </div>
    </Card>
  );
}