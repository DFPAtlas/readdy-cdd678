import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { BuildStatusBadge } from '@/pages/projects/components/ProjectStatusBadge';
import {
  buildStatusLabel,
  providerLabel,
  versionShortLabel,
  type ProjectOverviewData,
} from '@/services/projectOverviewService';
import { Hammer, GitBranch, Files, Bot } from 'lucide-react';

interface ProjectHealthProps {
  data: ProjectOverviewData;
}

export function ProjectHealth({ data }: ProjectHealthProps) {
  const project = data.project!;
  const buildLabel = buildStatusLabel(data.latestBuild?.status ?? null);
  const versionLabel = versionShortLabel(data.latestVersion);
  const provider = data.configuredProviders[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* Build status */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="h-7 w-7 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center">
            <Hammer className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-forge-text-secondary">Build status</span>
        </div>
        {data.latestBuild ? (
          <div className="flex items-center gap-2">
            <BuildStatusBadge status={data.latestBuild.status} />
            {buildLabel && (
              <span className="text-sm font-semibold text-forge-text-primary">{buildLabel}</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-forge-text-muted">No builds yet</p>
        )}
      </Card>

      {/* Current version */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="h-7 w-7 rounded-md bg-forge-accent/10 text-forge-accent flex items-center justify-center">
            <GitBranch className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-forge-text-secondary">Current version</span>
        </div>
        {versionLabel ? (
          <span className="text-sm font-semibold text-forge-text-primary font-mono">{versionLabel}</span>
        ) : (
          <p className="text-sm text-forge-text-muted">No version created yet</p>
        )}
      </Card>

      {/* Pages */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="h-7 w-7 rounded-md bg-forge-success/10 text-forge-success flex items-center justify-center">
            <Files className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-forge-text-secondary">Pages</span>
        </div>
        {project.pageCount != null ? (
          <span className="text-sm font-semibold text-forge-text-primary">{project.pageCount}</span>
        ) : (
          <p className="text-sm text-forge-text-muted">Not planned yet</p>
        )}
      </Card>

      {/* AI configuration */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="h-7 w-7 rounded-md bg-forge-agent/10 text-forge-agent flex items-center justify-center">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-forge-text-secondary">AI configuration</span>
        </div>
        {provider ? (
          <span className="text-sm font-semibold text-forge-text-primary">{providerLabel(provider)}</span>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-forge-text-muted">Not configured</p>
            <Link
              to="/settings/providers"
              className="text-xs text-forge-amber hover:text-forge-amber-dim font-medium whitespace-nowrap"
            >
              Configure
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}