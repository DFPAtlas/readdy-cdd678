import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import type { DashboardAttentionItem } from '@/services/dashboardData';
import { AlertTriangle, Cpu, CheckCircle2, ChevronRight } from 'lucide-react';

interface NeedsAttentionProps {
  items: DashboardAttentionItem[];
}

function actionFor(item: DashboardAttentionItem): { label: string; href: string } | null {
  if (item.kind === 'provider') {
    return { label: 'Configure', href: '/settings/providers' };
  }
  if (item.kind === 'build' && item.projectId) {
    return { label: 'View builds', href: `/projects/${item.projectId}/builds` };
  }
  return null;
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  return (
    <section aria-labelledby="needs-attention-heading">
      <h2 id="needs-attention-heading" className="text-sm font-semibold text-forge-text-primary mb-3">
        Needs attention
      </h2>

      {items.length === 0 ? (
        <Card className="flex items-center gap-2.5 py-3.5 px-4">
          <CheckCircle2 className="h-4 w-4 text-forge-success shrink-0" />
          <span className="text-xs text-forge-text-secondary">You&apos;re all caught up</span>
        </Card>
      ) : (
        <Card className="p-1 divide-y divide-forge-border-subtle">
          {items.map((item) => {
            const action = actionFor(item);
            const Icon = item.kind === 'provider' ? Cpu : AlertTriangle;
            return (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="h-7 w-7 rounded-md bg-forge-warning/10 text-forge-warning flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-forge-text-primary truncate">{item.description}</p>
                  {item.projectName && (
                    <p className="text-xs text-forge-text-muted truncate mt-0.5">{item.projectName}</p>
                  )}
                </div>
                {action && (
                  <Link
                    to={action.href}
                    className="inline-flex items-center gap-0.5 text-xs text-forge-amber hover:text-forge-amber/80 transition-colors whitespace-nowrap shrink-0"
                  >
                    {action.label}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}