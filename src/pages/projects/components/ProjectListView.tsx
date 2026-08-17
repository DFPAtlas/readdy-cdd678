import type { ProjectsProject } from '@/services/projectsService';
import { ProjectListRow } from './ProjectListRow';

export function ProjectListView({ projects }: { projects: ProjectsProject[] }) {
  return (
    <div className="hidden lg:block overflow-hidden rounded-lg border border-forge-border-subtle bg-forge-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-forge-border-subtle text-left">
            <th className="px-4 py-2.5 text-xs font-medium text-forge-text-muted">Project</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted">Status</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted">Updated</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted">Pages</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted">Version</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted">Build</th>
            <th className="px-3 py-2.5 text-xs font-medium text-forge-text-muted text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forge-border-subtle">
          {projects.map((p) => (
            <ProjectListRow key={p.id} project={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}