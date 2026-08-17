import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { formatRelativeTime, type DashboardActivity } from '@/services/dashboardData';
import { FolderPlus, Hammer, Bot, type LucideIcon } from 'lucide-react';

const iconByKind: Record<DashboardActivity['kind'], LucideIcon> = {
  project: FolderPlus,
  build: Hammer,
  ai: Bot,
};

const tintByKind: Record<DashboardActivity['kind'], string> = {
  project: 'text-forge-amber',
  build: 'text-forge-accent',
  ai: 'text-forge-agent',
};

interface RecentActivityProps {
  activity: DashboardActivity[];
}

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <section aria-labelledby="recent-activity-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="recent-activity-heading" className="text-sm font-semibold text-forge-text-primary">
          Recent activity
        </h2>
        {activity.length > 0 && (
          <Link to="/activity" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
            View all
          </Link>
        )}
      </div>

      {activity.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-forge-text-muted">No recent activity yet.</p>
        </Card>
      ) : (
        <Card className="p-1 divide-y divide-forge-border-subtle">
          {activity.map((item) => {
            const Icon = iconByKind[item.kind];
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className={`h-7 w-7 rounded-md bg-forge-hover flex items-center justify-center shrink-0 ${tintByKind[item.kind]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-forge-text-primary truncate">
                    {item.description}
                    {item.projectName && (
                      <span className="text-forge-text-muted"> — {item.projectName}</span>
                    )}
                  </p>
                  <p className="text-xs text-forge-text-muted mt-0.5">{formatRelativeTime(item.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}