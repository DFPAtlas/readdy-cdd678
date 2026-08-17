import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreditCard, Lock } from 'lucide-react';
import type { UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';
import { formatDate } from '../billingFormat';

interface BillingDetailsSectionProps {
  summary: UsageSummary;
  busy: string | null;
  onManagePayment: () => void;
}

export function BillingDetailsSection({ summary, busy, onManagePayment }: BillingDetailsSectionProps) {
  const hasSubscription = summary.subscriptionStatus !== null && summary.subscriptionStatus !== 'canceled';

  return (
    <section aria-labelledby="billing-details-heading">
      <h2 id="billing-details-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Billing details
      </h2>
      <Card className="p-4">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Billing email</dt>
            <dd className="text-forge-text-primary truncate max-w-[60%]">{summary.billingEmail ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Next billing date</dt>
            <dd className="text-forge-text-primary">{hasSubscription ? formatDate(summary.renewalDate) : 'No paid subscription'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">Payment method</dt>
            <dd className="text-forge-text-secondary flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Managed via Stripe
            </dd>
          </div>
        </dl>

        {hasSubscription && (
          <div className="mt-4 pt-4 border-t border-forge-border-subtle flex items-center justify-between gap-3">
            <p className="text-xs text-forge-text-muted flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Forge never stores your card details.
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'portal'}
              onClick={onManagePayment}
            >
              Manage payment methods
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}