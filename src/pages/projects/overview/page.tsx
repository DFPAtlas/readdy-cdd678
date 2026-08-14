import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects, getBuildsForProject, demoActivityFeed } from '@/services/mock/demoData';
import { Code, FileText, Image, Hammer, GitBranch, Download, ExternalLink, Clock, Layers, CheckCircle, AlertTriangle } from 'lucide-react';

const statusColorMap: Record<string, 'success' | 'warning' | 'amber' | 'default'> = {
  active: 'success',
  building: 'amber',
  draft: 'warning',
  archived: 'default',
};

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);
  const [blueprintApproved, setBlueprintApproved] = useState(projectId === 'proj-001' || projectId === 'proj-002' || projectId === 'proj-003');

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <p className="text-xs text-foreground-500 mt-1">The project you're looking for doesn't exist or has been removed.</p>
        <Link to="/projects" className="mt-4">
          <Button variant="ghost" size="sm">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const builds = getBuildsForProject(project.id);
  const latestBuild = builds.length > 0 ? builds[0] : null;
  const projectActivity = demoActivityFeed.filter((a) => a.projectId === project.id).slice(0, 5);

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.description || 'No description'}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/projects/${project.id}/sandbox`}>
              <Button size="sm" icon={<Code className="h-3.5 w-3.5" />}>Open Sandbox</Button>
            </Link>
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
      />

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {[
          { label: 'Files', value: project.stats.fileCount, icon: <FileText className="h-4 w-4" />, color: 'text-amber-500', href: 'files' },
          { label: 'Assets', value: project.stats.assetCount, icon: <Image className="h-4 w-4" />, color: 'text-emerald-500', href: 'assets' },
          { label: 'Builds', value: project.stats.buildCount, icon: <Hammer className="h-4 w-4" />, color: 'text-rose-500', href: 'builds' },
          { label: 'Versions', value: project.stats.versionCount, icon: <GitBranch className="h-4 w-4" />, color: 'text-sky-500', href: 'versions' },
          { label: 'Exports', value: project.stats.buildCount > 0 ? Math.max(1, project.stats.buildCount - 8) : 0, icon: <Download className="h-4 w-4" />, color: 'text-violet-500', href: 'exports' },
          { label: 'Status', value: null, icon: null, color: '', href: null, badge: <Badge variant={statusColorMap[project.status] || 'default'} size="sm">{project.status}</Badge> },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            {stat.href ? (
              <Link to={`/projects/${projectId}/${stat.href}`} className="block">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-foreground-500">{stat.label}</span>
                </div>
                <div className="text-lg font-semibold text-foreground-950">{stat.value}</div>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-foreground-500">{stat.label}</span>
                </div>
                <div>{stat.badge}</div>
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Blueprint section */}
        <div className="lg:col-span-2">
          {project.blueprint ? (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground-950">Blueprint: {project.blueprint.name}</h3>
                </div>
                {blueprintApproved ? (
                  <Badge variant="success" size="sm"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-xs">Request Revision</Button>
                    <Button size="sm" className="text-xs" onClick={() => setBlueprintApproved(true)}>Approve Blueprint</Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pages */}
                <div>
                  <p className="text-xs font-medium text-foreground-500 mb-2">Pages ({project.blueprint.pages.length})</p>
                  <div className="space-y-1.5">
                    {project.blueprint.pages.map((page) => (
                      <div key={page.path} className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-background-50">
                        <span className="font-mono text-amber-500">{page.path}</span>
                        <span className="text-foreground-400">—</span>
                        <span className="text-foreground-600">{page.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-foreground-500 mb-1">Tech Stack</p>
                    <div className="flex gap-1.5">
                      <Badge size="sm" variant="amber">{project.blueprint.techStack.framework}</Badge>
                      <Badge size="sm" variant="amber">{project.blueprint.techStack.css}</Badge>
                      {project.blueprint.techStack.database && <Badge size="sm">{project.blueprint.techStack.database}</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-500 mb-1">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {project.blueprint.features.map((f) => (
                        <Badge key={f} size="sm" variant="default">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-500 mb-1">Target Users</p>
                    <p className="text-xs text-foreground-600">
                      {project.blueprint.type === 'saas' ? 'Product teams and developers' : project.blueprint.type === 'ecommerce' ? 'Online sellers and buyers' : 'Content creators and professionals'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 text-center">
              <Layers className="h-6 w-6 text-foreground-300 mx-auto mb-2" />
              <p className="text-sm text-foreground-500">No blueprint defined</p>
              <p className="text-xs text-foreground-400 mt-1">Open the sandbox to create a project blueprint</p>
            </Card>
          )}

          {/* Dependencies / Quick Actions */}
          <Card className="p-4 mt-3">
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link to={`/projects/${project.id}/sandbox`}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-background-50 hover:bg-amber-500/5 transition-colors cursor-pointer">
                  <Code className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-foreground-600">Sandbox</span>
                </div>
              </Link>
              <Link to={`/projects/${project.id}/builds`}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-background-50 hover:bg-amber-500/5 transition-colors cursor-pointer">
                  <Hammer className="h-4 w-4 text-rose-500" />
                  <span className="text-xs text-foreground-600">New Build</span>
                </div>
              </Link>
              <Link to={`/projects/${project.id}/versions`}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-background-50 hover:bg-amber-500/5 transition-colors cursor-pointer">
                  <GitBranch className="h-4 w-4 text-sky-500" />
                  <span className="text-xs text-foreground-600">Versions</span>
                </div>
              </Link>
              <Link to={`/projects/${project.id}/exports`}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-background-50 hover:bg-amber-500/5 transition-colors cursor-pointer">
                  <Download className="h-4 w-4 text-violet-500" />
                  <span className="text-xs text-foreground-600">Export</span>
                </div>
              </Link>
            </div>
          </Card>
        </div>

        {/* Sidebar: Build + Activity */}
        <div className="space-y-3">
          {/* Latest Build */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold text-foreground-950 mb-2 flex items-center gap-1.5">
              <Hammer className="h-3.5 w-3.5 text-amber-500" /> Latest Build
            </h3>
            {latestBuild ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground-950">{latestBuild.version}</span>
                  <Badge size="sm" variant={
                    latestBuild.status === 'success' ? 'success' :
                    latestBuild.status === 'running' ? 'amber' :
                    latestBuild.status === 'failed' ? 'danger' : 'default'
                  }>{latestBuild.status}</Badge>
                </div>
                <p className="text-xs text-foreground-400">
                  {latestBuild.completedAt
                    ? `Completed ${new Date(latestBuild.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : 'In progress...'}
                </p>
                <Link to={`/projects/${project.id}/builds`} className="text-xs text-amber-500 hover:text-amber-400 mt-1.5 inline-block">
                  View all builds →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-foreground-400">No builds yet</p>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold text-foreground-950 mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-foreground-400" /> Recent Activity
            </h3>
            {projectActivity.length > 0 ? (
              <div className="space-y-2">
                {projectActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      act.type === 'build' ? 'bg-amber-500' : act.type === 'export' ? 'bg-sky-500' : 'bg-emerald-500'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground-950">{act.action}</p>
                      <p className="text-xs text-foreground-400">{new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground-400">No recent activity</p>
            )}
          </Card>

          {/* Project Info */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold text-foreground-950 mb-2">Project Info</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground-500">Created</span>
                <span className="text-foreground-950">{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-500">Updated</span>
                <span className="text-foreground-950">{new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-500">Framework</span>
                <span className="text-foreground-950 capitalize">{project.settings.framework}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-500">Styling</span>
                <span className="text-foreground-950 capitalize">{project.settings.styling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-500">Preview Port</span>
                <span className="text-foreground-950 font-mono">{project.settings.previewPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-500">Total Size</span>
                <span className="text-foreground-950 font-mono">{(project.stats.totalSizeBytes / 1048576).toFixed(1)} MB</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}