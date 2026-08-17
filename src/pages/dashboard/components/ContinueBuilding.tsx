import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from './LinkButton';
import { DropdownMenu, DropdownItem } from '@/components/ui/DropdownMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatRelativeTime, type DashboardProject } from '@/services/dashboardData';
import { MoreHorizontal, Clock, Layers, GitBranch, Bot, Rocket } from 'lucide-react';

type BadgeVariant = 'default' | 'amber' | 'accent' | 'success' | 'warning' | 'error' | 'agent';

function statusBadge(status: string | null): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'active':
      return { label: 'Active', variant: 'success' };
    case 'building':
      return { label: 'Building', variant: 'warning' };
    case 'previewing':
      return { label: 'Previewing', variant: 'accent' };
    case 'archived':
      return { label: 'Archived', variant: 'default' };
    default:
      return { label: 'Draft', variant: 'default' };
  }
}

function buildBadge(status: string | null): { label: string; variant: BadgeVariant } | null {
  switch (status) {
    case 'success':
      return { label: 'Built', variant: 'success' };
    case 'failed':
      return { label: 'Build failed', variant: 'error' };
    case 'running':
      return { label: 'Building', variant: 'warning' };
    case 'queued':
      return { label: 'Queued', variant: 'default' };
    default:
      return null;
  }
}

interface ContinueBuildingProps {
  projects: DashboardProject[];
}

export function ContinueBuilding({ projects }: ContinueBuildingProps) {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="continue-building-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="continue-building-heading" className="text-sm font-semibold text-forge-text-primary">
          Continue building
        </h2>
        {projects.length > 0 && (
          <Link to="/projects" className="text-xs text-forge-amber hover:text-forge-amber/80 transition-colors">
            View all projects
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="h-12 w-12 rounded-full bg-forge-amber/10 flex items-center justify-center mb-4">
            <Rocket className="h-6 w-6 text-forge-amber" />
          </div>
          <h3 className="text-sm font-medium text-forge-text-primary">Your first project starts here</h3>
          <p className="mt-1 text-sm text-forge-text-muted max-w-sm">
            Create a Forge project and turn an idea into an organised development workspace.
          </p>
          <LinkButton to="/projects/new" variant="primary" size="md" className="mt-4">
            Create first project
          </LinkButton>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((project) => {
            const status = statusBadge(project.status);
            const build = buildBadge(project.latestBuildStatus);

            return (
              <Card
                key={project.id}
                className="flex flex-col group hover:border-forge-border transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-forge-amber/10 text-forge-amber flex items-center justify-center font-semibold text-sm shrink-0">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-forge-text-primary truncate">{project.name}</h3>
                      <Badge variant={status.variant} size="sm">
                        {status.label}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-xs text-forge-text-muted mt-0.5 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-forge-text-muted">
                  {project.pageCount !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                  )}
                  {project.latestBuildVersion && (
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {project.latestBuildVersion}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-forge-border-subtle">
                  <LinkButton to={`/projects/${project.id}/overview`} variant="primary" size="sm">
                    Open Project
                  </LinkButton>
                  <LinkButton to={`/projects/${project.id}/sandbox`} variant="secondary" size="sm">
                    Open Sandbox
                  </LinkButton>

                  <div className="flex-1" />

                  {project.hasAiActivity && (
                    <Tooltip content="Recent AI activity">
                      <span className="flex items-center">
                        <Bot className="h-3.5 w-3.5 text-forge-agent" />
                      </span>
                    </Tooltip>
                  )}

                  {build && (
                    <Badge variant={build.variant} size="sm">
                      {build.label}
                    </Badge>
                  )}

                  <DropdownMenu
                    align="right"
                    trigger={
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
                        aria-label={`More actions for ${project.name}`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    }
                  >
                    <DropdownItem onClick={() => navigate(`/projects/${project.id}/overview`)}>Overview</DropdownItem>
                    <DropdownItem onClick={() => navigate(`/projects/${project.id}/files`)}>Files</DropdownItem>
                    <DropdownItem onClick={() => navigate(`/projects/${project.id}/versions`)}>Versions</DropdownItem>
                    <DropdownItem onClick={() => navigate(`/projects/${project.id}/settings`)}>Settings</DropdownItem>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}