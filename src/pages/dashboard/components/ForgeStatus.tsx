import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import type { DashboardData } from '@/services/dashboardData';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function prettifyPlan(key: string | null, status: string | null): string {
  if (!key) return 'Unable to verify';
  const pretty = capitalize(key);
  if (status === 'trialing') return `${pretty} plan (trial)`;
  if (status === 'past_due') return `${pretty} plan (past due)`;
  if (status === 'canceled') return `${pretty} plan (canceled)`;
  return `${pretty} plan`;
}

interface ForgeStatusProps {
  data: DashboardData;
}

export function ForgeStatus({ data }: ForgeStatusProps) {
  const hasProvider = data.configuredProviders.length > 0;
  const providerValue = hasProvider
    ? data.configuredProviders.map(capitalize).join(', ')
    : 'AI provider not configured';
  const plan = prettifyPlan(data.planKey, data.subscriptionStatus);

  return (
    <section aria-labelledby="forge-status-heading">
      <h2 id="forge-status-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Forge status
      </h2>

      <Card className="p-4">
        <dl className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-forge-text-muted">AI Provider</dt>
            <dd className="text-xs text-forge-text-primary text-right flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${hasProvider ? 'bg-forge-success' : 'bg-forge-text-muted'}`} />
              <span className={hasProvider ? '' : 'text-forge-text-secondary'}>{providerValue}</span>
            </dd>
          </div>

          {!hasProvider && (
            <div className="flex items-center justify-end">
              <Link to="/settings/providers" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
                Configure provider
              </Link>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-forge-text-muted">Project Storage</dt>
            <dd className="text-xs text-forge-text-secondary text-right flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forge-text-muted" />
              Unavailable
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-forge-text-muted">System</dt>
            <dd className="text-xs text-right">
              <Link to="/system/status" className="text-forge-amber hover:text-forge-amber/80 transition-colors">
                View status
              </Link>
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-forge-text-muted">Account Plan</dt>
            <dd className="text-xs text-forge-text-primary text-right flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${data.subscriptionStatus === 'active' ? 'bg-forge-success' : 'bg-forge-text-muted'}`} />
              {plan}
            </dd>
          </div>

          {data.billingConflict && (
            <div className="flex items-start justify-between gap-3">
              <dt className="text-xs text-forge-text-muted">Billing</dt>
              <dd className="text-xs text-forge-amber text-right">Billing conflict</dd>
            </div>
          )}

          <div className="flex items-center justify-end">
            {data.planKey === null ? (
              <Link to="/settings/billing" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
                Billing settings
              </Link>
            ) : data.paidAccess ? (
              <Link to="/settings/billing" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
                Manage billing
              </Link>
            ) : (
              <Link to="/pricing" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
                View pricing
              </Link>
            )}
          </div>
        </dl>
      </Card>
    </section>
  );
}