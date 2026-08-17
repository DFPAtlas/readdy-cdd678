import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { BuildStatusBadge } from '@/pages/projects/components/ProjectStatusBadge';
import {
  formatOverviewRelativeTime,
  providerLabel,
  versionShortLabel,
  type ProjectOverviewData,
} from '@/services/projectOverviewService';
import { Code, FileText, Hammer, GitBranch, Bot } from 'lucide-react';

interface ContinueBuildingProps {
  data: ProjectOverviewData;
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-forge-border-subtle last:border-b-0">
      <span className="flex items-center gap-2 text-xs text-forge-text-muted">
        <span className="text-forge-text-muted">{icon}</span>
        {label}
      </span>
      <span className="text-xs text-forge-text-primary font-medium text-right">{children}</span>
    </div>
  );
}

export function ContinueBuilding({ data }: ContinueBuildingProps) {
  const project = data.project!;
  const versionLabel = versionShortLabel(data.latestVersion);
  const provider = data.configuredProviders[0];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-forge-text-primary">Continue building</h2>
        <LinkButton to={`/projects/${project.id}/sandbox`}>
          <Code className="h-3.5 w-3.5" />
          Open Sandbox
        </LinkButton>
      </div>

      <div>
        <MetaRow icon={<GitBranch className="h-3.5 w-3.5" />} label="Latest version">
          {versionLabel ? (
            <span className="font-mono">{versionLabel}</span>
          ) : (
            <span className="text-forge-text-muted">—</span>
          )}
        </MetaRow>

        <MetaRow icon={<Hammer className="h-3.5 w-3.5" />} label="Last build">
          {data.latestBuild ? (
            <span className="inline-flex items-center gap-1.5">
              <BuildStatusBadge status={data.latestBuild.status} />
              {data.latestBuild.version && (
                <span className="font-mono">{data.latestBuild.version}</span>
              )}
            </span>
          ) : (
            <span className="text-forge-text-muted">No builds yet</span>
          )}
        </MetaRow>

        <MetaRow icon={<Bot className="h-3.5 w-3.5" />} label="AI provider">
          {provider ? (
            <span>{providerLabel(provider)}</span>
          ) : (
            <span className="text-forge-text-muted">Not configured</span>
          )}
        </MetaRow>

        <MetaRow icon={<FileText className="h-3.5 w-3.5" />} label="Pages">
          {project.pageCount != null ? (
            <span>{project.pageCount}</span>
          ) : (
            <span className="text-forge-text-muted">—</span>
          )}
        </MetaRow>

        <MetaRow icon={<Code className="h-3.5 w-3.5" />} label="Last updated">
          {formatOverviewRelativeTime(project.updatedAt)}
        </MetaRow>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Link
          to={`/projects/${project.id}/files`}
          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Files
        </Link>
        <Link
          to={`/projects/${project.id}/builds`}
          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors"
        >
          <Hammer className="h-3.5 w-3.5" />
          Builds
        </Link>
        <Link
          to={`/projects/${project.id}/versions`}
          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Versions
        </Link>
      </div>
    </Card>
  );
}