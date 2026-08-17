import {
  formatVersionRelative,
  versionLabel,
  type ProjectVersionRecord,
} from '@/services/projectVersionsService';
import { Layers, Clock, CheckCircle2 } from 'lucide-react';

interface VersionStatsProps {
  versions: ProjectVersionRecord[];
  currentVersion: ProjectVersionRecord | null;
  latestCreatedAt: string | null;
}

export function VersionStats({ versions, currentVersion, latestCreatedAt }: VersionStatsProps) {
  const stats = [
    {
      label: 'Total versions',
      value: String(versions.length),
      icon: <Layers className="h-4 w-4" />,
    },
    {
      label: 'Latest created',
      value: latestCreatedAt ? formatVersionRelative(latestCreatedAt) : '—',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: 'Current version',
      value: currentVersion ? versionLabel(currentVersion) : '—',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4"
        >
          <div className="flex items-center gap-2 text-forge-text-muted">
            {stat.icon}
            <p className="text-[11px] font-semibold uppercase tracking-wider">{stat.label}</p>
          </div>
          <p className="mt-2 text-lg font-semibold text-forge-text-primary font-mono">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}