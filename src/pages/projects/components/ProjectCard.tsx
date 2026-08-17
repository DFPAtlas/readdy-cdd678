import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { DropdownMenu, DropdownItem } from '@/components/ui/DropdownMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatRelativeTime } from '@/services/dashboardData';
import type { ProjectsProject } from '@/services/projectsService';
import { ProjectStatusBadge, buildStatusMeta } from './ProjectStatusBadge';
import { Clock, Layers, GitBranch, Bot, MoreHorizontal } from 'lucide-react';

export function ProjectCard({ project }: { project: ProjectsProject }) {
  const navigate = useNavigate();
  const build = buildStatusMeta(project.latestBuildStatus);

  return (
    <Card className="flex flex-col group hover:border-forge-border transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-forge-amber/10 text-forge-amber flex items-center justify-center font-semibold text-sm shrink-0">
          {project.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-forge-text-primary truncate">{project.name}</h3>
            <ProjectStatusBadge status={project.status} />
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

        {build && <Badge variant={build.variant} size="sm">{build.label}</Badge>}

        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
              aria-label={`More actions for ${project.name}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          }
        >
          <DropdownItem onClick={() => navigate(`/projects/${project.id}/overview`)}>Overview</DropdownItem>
          <DropdownItem onClick={() => navigate(`/projects/${project.id}/sandbox`)}>Sandbox</DropdownItem>
          <DropdownItem onClick={() => navigate(`/projects/${project.id}/files`)}>Files</DropdownItem>
          <DropdownItem onClick={() => navigate(`/projects/${project.id}/versions`)}>Versions</DropdownItem>
          <DropdownItem onClick={() => navigate(`/projects/${project.id}/settings`)}>Settings</DropdownItem>
        </DropdownMenu>
      </div>
    </Card>
  );
}