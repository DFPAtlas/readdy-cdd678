import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import type { UsageSummary } from '@/pages/projects/sandbox/sandboxBilling';

interface AiCreditBalanceSectionProps {
  summary: UsageSummary;
}

export function AiCreditBalanceSection({ summary }: AiCreditBalanceSectionProps) {
  const included = summary.monthlyCreditsLimit ?? 0;
  const includedRemaining = summary.monthlyCreditsRemaining ?? 0;
  const purchasedRemaining = summary.purchasedCreditsRemaining ?? 0;
  const total = summary.totalCreditsRemaining ?? 0;

  const rows = [
    { label: 'Included this period', value: included },
    { label: 'Included remaining', value: includedRemaining },
    { label: 'Purchased remaining', value: purchasedRemaining },
    { label: 'Total available', value: total, highlight: true },
  ];

  return (
    <section aria-labelledby="ai-credit-balance-heading">
      <h2 id="ai-credit-balance-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        AI Credit Balance
      </h2>
      <Card className="p-4 border-forge-border">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-forge-text-muted">{row.label}</dt>
              <dd className={`mt-0.5 text-base font-semibold ${row.highlight ? 'text-forge-amber' : 'text-forge-text-primary'}`}>
                {row.value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <LinkButton to="/credits" variant="primary" size="sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Buy more credits
          </LinkButton>
          <LinkButton to="/activity" variant="secondary" size="sm">
            <BarChart3 className="h-3.5 w-3.5" />
            View usage
          </LinkButton>
        </div>
      </Card>
    </section>
  );
}