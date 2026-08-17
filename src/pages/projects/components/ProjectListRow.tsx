import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { DropdownMenu, DropdownItem } from '@/components/ui/DropdownMenu';
import { formatRelativeTime } from '@/services/dashboardData';
import type { ProjectsProject } from '@/services/projectsService';
import { ProjectStatusBadge, buildStatusMeta } from './ProjectStatusBadge';
import { MoreHorizontal } from 'lucide-react';

export function ProjectListRow({ project }: { project: ProjectsProject }) {
  const navigate = useNavigate();
  const build = buildStatusMeta(project.latestBuildStatus);

  return (
    <tr className="hover:bg-forge-hover/50 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/projects/${project.id}/overview`} className="flex items-center gap-3 min-w-0">
          <div className="h-7 w-7 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center font-semibold text-xs shrink-0">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-forge-text-primary truncate">{project.name}</div>
            {project.description && (
              <div className="text-xs text-forge-text-muted truncate">{project.description}</div>
            )}
          </div>
        </Link>
      </td>
      <td className="px-3 py-3">
        <ProjectStatusBadge status={project.status} />
      </td>
      <td className="px-3 py-3 text-xs text-forge-text-muted whitespace-nowrap">
        {formatRelativeTime(project.updatedAt)}
      </td>
      <td className="px-3 py-3 text-xs text-forge-text-secondary whitespace-nowrap">
        {project.pageCount ?? '—'}
      </td>
      <td className="px-3 py-3 text-xs text-forge-text-secondary whitespace-nowrap">
        {project.latestBuildVersion ?? '—'}
      </td>
      <td className="px-3 py-3">
        {build ? (
          <Badge variant={build.variant} size="sm">{build.label}</Badge>
        ) : (
          <span className="text-xs text-forge-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <LinkButton to={`/projects/${project.id}/sandbox`} variant="ghost" size="sm">
            Sandbox
          </LinkButton>
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
      </td>
    </tr>
  );
}