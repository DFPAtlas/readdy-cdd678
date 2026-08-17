import { Card } from '@/components/ui/Card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function NeedsAttentionSection({ issues }: { issues: string[] }) {
  return (
    <section aria-labelledby="needs-attention-title">
      <h2 id="needs-attention-title" className="text-sm font-semibold text-forge-text-primary mb-2">
        Needs attention
      </h2>

      <Card className="p-4">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-forge-success shrink-0" aria-hidden="true" />
            <p className="text-xs text-forge-text-secondary">No configuration issues detected.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-forge-amber shrink-0 mt-px" aria-hidden="true" />
                <span className="text-xs text-forge-text-secondary leading-relaxed">{issue}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}