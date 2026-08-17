import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';
import { formatDate } from '../billingFormat';

interface SubscriptionActionsSectionProps {
  summary: UsageSummary;
  busy: string | null;
  onManageBilling: () => void;
}

export function SubscriptionActionsSection({ summary, busy, onManageBilling }: SubscriptionActionsSectionProps) {
  const status = summary.subscriptionStatus;
  const hasSubscription = status !== null && status !== 'canceled';
  if (!hasSubscription) return null;

  const scheduledToCancel = summary.cancelAtPeriodEnd === true;

  return (
    <section aria-labelledby="subscription-actions-heading">
      <h2 id="subscription-actions-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Subscription actions
      </h2>
      <Card className="p-4 border-forge-border">
        {scheduledToCancel ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-forge-text-primary">Subscription scheduled to end</p>
              <p className="text-xs text-forge-text-muted mt-0.5">
                Your plan stays active until {formatDate(summary.renewalDate)}. You can resume it anytime before then.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'portal'}
              onClick={onManageBilling}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Resume subscription
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-forge-text-primary">Cancel or change your plan</p>
              <p className="text-xs text-forge-text-muted mt-0.5">
                Cancellation and plan changes are handled from the secure Stripe billing portal.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'portal'}
              onClick={onManageBilling}
              icon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Manage billing
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}