import { Activity } from 'lucide-react';
import type { AgentActivityItem } from '@/services/agentsService';

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

export function AgentActivity({ items }: { items: AgentActivityItem[] }) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-forge-amber/10 text-forge-amber">
          <Activity className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold text-forge-text-primary">Agent activity</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-forge-text-muted">No recent agent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <span
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                  item.status === 'completed' ? 'bg-forge-success' : 'bg-forge-text-muted'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-forge-text-primary truncate">
                  {item.taskLabel}
                  <span className="text-forge-text-muted"> · {item.agentLabel}</span>
                </p>
                <p className="text-[11px] text-forge-text-muted truncate">{item.projectName}</p>
              </div>
              <span className="text-[11px] text-forge-text-muted shrink-0 whitespace-nowrap">
                {relativeTime(item.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}