import { Link } from 'react-router-dom';
import { FolderKanban, Hammer, Bot, Database, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { DashboardData } from '@/services/dashboardData';

interface MetricDef {
  key: string;
  label: string;
  value: number | null;
  sublabel: string;
  icon: LucideIcon;
  tint: string;
  href: string;
  hrefLabel: string;
}

interface WorkspaceOverviewProps {
  data: DashboardData;
}

export function WorkspaceOverview({ data }: WorkspaceOverviewProps) {
  const metrics: MetricDef[] = [
    {
      key: 'projects',
      label: 'Active Projects',
      value: data.activeProjectCount,
      sublabel: 'in your workspace',
      icon: FolderKanban,
      tint: 'bg-forge-amber/10 text-forge-amber',
      href: '/projects',
      hrefLabel: 'View all',
    },
    {
      key: 'builds',
      label: 'Builds',
      value: data.totalBuildCount,
      sublabel: data.runningBuildCount > 0 ? `${data.runningBuildCount} running` : 'none running',
      icon: Hammer,
      tint: 'bg-forge-accent/10 text-forge-accent',
      href: '/activity',
      hrefLabel: 'View activity',
    },
    {
      key: 'ai',
      label: 'AI Activity',
      value: data.recentAiCount,
      sublabel: data.recentAiCount > 0 ? 'AI tasks recorded' : 'No recent AI activity',
      icon: Bot,
      tint: 'bg-forge-agent/10 text-forge-agent',
      href: '/activity',
      hrefLabel: 'View activity',
    },
    {
      key: 'storage',
      label: 'Storage / Usage',
      value: null,
      sublabel: 'Unavailable',
      icon: Database,
      tint: 'bg-forge-text-muted/10 text-forge-text-secondary',
      href: '/settings',
      hrefLabel: 'Check settings',
    },
  ];

  return (
    <section aria-label="Workspace overview" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      {metrics.map((m) => (
        <Card key={m.key} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.tint}`}>
              <m.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-none text-forge-text-primary">
                {m.value === null ? '—' : m.value}
              </p>
              <p className="text-xs text-forge-text-muted mt-1.5">{m.label}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-forge-text-muted truncate">{m.sublabel}</span>
            <Link
              to={m.href}
              className="text-forge-amber hover:text-forge-amber/80 transition-colors whitespace-nowrap"
            >
              {m.hrefLabel}
            </Link>
          </div>
        </Card>
      ))}
    </section>
  );
}