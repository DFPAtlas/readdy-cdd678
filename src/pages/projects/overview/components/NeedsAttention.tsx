import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import type { OverviewAttention } from '@/services/projectOverviewService';
import { CheckCircle, AlertTriangle, Hammer, Bot, Settings } from 'lucide-react';

interface NeedsAttentionProps {
  items: OverviewAttention[];
  projectId: string;
}

function attentionIcon(kind: OverviewAttention['kind']) {
  switch (kind) {
    case 'build':
      return <Hammer className="h-3.5 w-3.5 text-forge-error" />;
    case 'ai':
      return <Bot className="h-3.5 w-3.5 text-forge-error" />;
    case 'provider':
      return <Settings className="h-3.5 w-3.5 text-forge-error" />;
  }
}

export function NeedsAttention({ items, projectId }: NeedsAttentionProps) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-forge-text-primary mb-3">Needs attention</h2>

      {items.length === 0 ? (
        <div className="flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 text-forge-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-forge-text-primary">Project looks ready</p>
            <p className="text-xs text-forge-text-muted mt-0.5">No current issues need your attention.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 py-2 px-2.5 rounded-md bg-forge-error/5 border border-forge-error/15"
            >
              <span className="mt-0.5 flex-shrink-0">{attentionIcon(item.kind)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-forge-text-primary">{item.description}</p>
                {item.kind === 'provider' && (
                  <Link
                    to="/settings/providers"
                    className="text-xs text-forge-amber hover:text-forge-amber-dim font-medium mt-0.5 inline-block"
                  >
                    Configure provider
                  </Link>
                )}
                {item.kind === 'build' && (
                  <Link
                    to={`/projects/${projectId}/builds`}
                    className="text-xs text-forge-amber hover:text-forge-amber-dim font-medium mt-0.5 inline-block"
                  >
                    View builds
                  </Link>
                )}
              </div>
              <AlertTriangle className="h-3.5 w-3.5 text-forge-error flex-shrink-0 mt-0.5" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}