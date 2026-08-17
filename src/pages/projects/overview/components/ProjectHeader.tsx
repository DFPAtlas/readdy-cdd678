import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ProjectStatusBadge, BuildStatusBadge } from '@/pages/projects/components/ProjectStatusBadge';
import { providerLabel } from '@/services/projectOverviewService';
import type { ProjectOverviewData } from '@/services/projectOverviewService';
import { Code, Settings, Bot } from 'lucide-react';

interface ProjectHeaderProps {
  data: ProjectOverviewData;
}

export function ProjectHeader({ data }: ProjectHeaderProps) {
  const project = data.project!;
  const provider = data.configuredProviders[0];

  return (
    <div className="mb-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        className="mb-3"
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-semibold text-forge-text-primary">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-forge-text-muted max-w-2xl">{project.description}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-forge-text-secondary flex-wrap">
            {data.latestBuild && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-forge-text-muted">Build</span>
                <BuildStatusBadge status={data.latestBuild.status} />
              </span>
            )}
            {data.latestVersion && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-forge-text-muted">Version</span>
                <span className="font-mono text-forge-text-primary">
                  {data.latestVersion.versionNumber != null
                    ? `v${data.latestVersion.versionNumber}`
                    : data.latestVersion.label}
                </span>
              </span>
            )}
            {provider ? (
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-forge-text-muted" />
                <span className="text-forge-text-primary">{providerLabel(provider)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-forge-text-muted" />
                <span className="text-forge-text-muted">AI not configured</span>
              </span>
            )}
            {project.updatedAt && (
              <span className="text-forge-text-muted">
                Updated {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <LinkButton variant="secondary" to={`/projects/${project.id}/settings`}>
            <Settings className="h-3.5 w-3.5" />
            Settings
          </LinkButton>
          <LinkButton to={`/projects/${project.id}/sandbox`}>
            <Code className="h-3.5 w-3.5" />
            Open Sandbox
          </LinkButton>
        </div>
      </div>
    </div>
  );
}