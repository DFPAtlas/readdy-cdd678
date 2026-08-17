import { Card } from '@/components/ui/Card';
import {
  formatOverviewRelativeTime,
  type OverviewActivity,
} from '@/services/projectOverviewService';
import { Hammer, GitBranch, Bot, FolderOpen, Clock } from 'lucide-react';

interface RecentActivityProps {
  activity: OverviewActivity[];
}

function activityIcon(kind: OverviewActivity['kind']) {
  switch (kind) {
    case 'build':
      return <Hammer className="h-3.5 w-3.5 text-forge-amber" />;
    case 'version':
      return <GitBranch className="h-3.5 w-3.5 text-forge-accent" />;
    case 'ai':
      return <Bot className="h-3.5 w-3.5 text-forge-agent" />;
    case 'project':
      return <FolderOpen className="h-3.5 w-3.5 text-forge-success" />;
  }
}

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-forge-text-muted" />
        <h2 className="text-sm font-semibold text-forge-text-primary">Recent activity</h2>
      </div>

      {activity.length > 0 ? (
        <ul className="space-y-1">
          {activity.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-forge-hover transition-colors"
            >
              <span className="h-6 w-6 rounded-md bg-forge-panel-elevated border border-forge-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                {activityIcon(item.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-forge-text-primary">{item.description}</p>
                {item.area && (
                  <p className="text-xs text-forge-text-muted mt-0.5 truncate">{item.area}</p>
                )}
              </div>
              <span className="text-xs text-forge-text-muted flex-shrink-0">
                {formatOverviewRelativeTime(item.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-forge-text-muted">No project activity yet.</p>
      )}
    </Card>
  );
}