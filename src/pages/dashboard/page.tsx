import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects, demoNotifications, demoActivityFeed } from '@/services/mock/demoData';
import { useNotificationStore, useProjectStore } from '@/stores/index';
import { FolderKanban, Code, Hammer, Layers, Plus, ArrowRight, Clock, Play, Download, MoreHorizontal } from 'lucide-react';

const statusColorMap: Record<string, 'success' | 'warning' | 'amber' | 'default'> = {
  active: 'success',
  building: 'amber',
  draft: 'warning',
  archived: 'default',
};

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { notifications } = useNotificationStore();
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  const activeProjects = demoProjects.filter((p) => p.status !== 'archived');
  const archivedCount = demoProjects.filter((p) => p.status === 'archived').length;
  const activeBuildCount = demoProjects.filter((p) => p.status === 'building').length;
  const totalFiles = demoProjects.reduce((s, p) => s + p.stats.fileCount, 0);
  const totalBuilds = demoProjects.reduce((s, p) => s + p.stats.buildCount, 0);

  const recentActivity = demoActivityFeed.slice(0, 6);

  const unreadNotifications = notifications.filter((n) => !n.isRead).slice(0, 3);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, Martin. Here's what's happening in Forge Workshop.`}
        actions={
          <Link to="/projects/new">
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>New Project</Button>
          </Link>
        }
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground-950">{activeProjects.length}</p>
              <p className="text-xs text-foreground-600">Active Projects</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Code className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground-950">{totalFiles}</p>
              <p className="text-xs text-foreground-600">Total Files</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Hammer className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground-950">{totalBuilds}</p>
              <p className="text-xs text-foreground-600">Total Builds</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${activeBuildCount > 0 ? 'bg-amber-500/10' : 'bg-foreground-100'}`}>
              <Layers className={`h-4 w-4 ${activeBuildCount > 0 ? 'text-amber-500' : 'text-foreground-500'}`} />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground-950">{activeBuildCount}</p>
              <p className="text-xs text-foreground-600">Active Builds</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground-950">Recent Projects</h2>
            <div className="flex items-center gap-1 bg-background-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-foreground-950' : 'text-foreground-500 hover:text-foreground-700'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-foreground-950' : 'text-foreground-500 hover:text-foreground-700'}`}
              >
                List
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}/overview`}
                  onClick={() => setActiveProject(project)}
                >
                  <Card hoverable className="h-full group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-medium text-foreground-950 whitespace-nowrap">{project.name}</h3>
                        <p className="text-xs text-foreground-500 mt-0.5">
                          {project.blueprint?.type ? project.blueprint.type.charAt(0).toUpperCase() + project.blueprint.type.slice(1) : 'Project'}
                          {project.status === 'building' && ' · Building'}
                        </p>
                      </div>
                      <Badge variant={statusColorMap[project.status] || 'default'} size="sm">
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-foreground-400">
                      <span>{project.stats.fileCount} files</span>
                      <span>{project.stats.buildCount} builds</span>
                      <span>v{project.stats.versionCount}</span>
                    </div>
                  </Card>
                </Link>
              ))}
              {archivedCount > 0 && (
                <Link to="/projects">
                  <Card hoverable className="h-full flex items-center justify-center border-dashed border-foreground-200">
                    <div className="text-center">
                      <p className="text-sm text-foreground-500">+{archivedCount} archived</p>
                      <p className="text-xs text-foreground-400 mt-1">View all projects</p>
                    </div>
                  </Card>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}/overview`}
                  onClick={() => setActiveProject(project)}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-background-100 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-950 truncate">{project.name}</p>
                        <p className="text-xs text-foreground-500">{project.stats.fileCount} files · {project.stats.buildCount} builds · v{project.stats.versionCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={statusColorMap[project.status] || 'default'} size="sm">{project.status}</Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-foreground-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Activity + Notifications */}
        <div className="space-y-4">
          {/* Notifications */}
          {unreadNotifications.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-foreground-950">Notifications</h3>
                <span className="text-xs text-amber-500">{unreadNotifications.length} new</span>
              </div>
              <div className="space-y-2">
                {unreadNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      n.type === 'error' ? 'bg-rose-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground-950">{n.title}</p>
                      <p className="text-xs text-foreground-500 truncate">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold text-foreground-950 mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'build' ? 'bg-amber-500' : act.type === 'export' ? 'bg-sky-500' : act.type === 'system' ? 'bg-foreground-400' : 'bg-emerald-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground-950">
                      <span className="font-medium">{act.action}</span>
                      {act.projectName && <span className="text-foreground-500"> — {act.projectName}</span>}
                    </p>
                    <p className="text-xs text-foreground-400 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(act.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/activity" className="block mt-3 text-xs text-amber-500 hover:text-amber-400 transition-colors">
              View all activity →
            </Link>
          </Card>

          {/* System Health Summary */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold text-foreground-950 mb-2">System Health</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-foreground-600">All services online</span>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Storage', value: '7.2 GB / 10 GB', pct: 72 },
                { label: 'Memory', value: '6.8 GB / 16 GB', pct: 42 },
                { label: 'CPU', value: '23%', pct: 23 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-foreground-500 w-14 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-background-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.pct > 80 ? 'bg-rose-500' : item.pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground-400 w-20 text-right flex-shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Start Templates */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground-950">Start from a Template</h2>
          <Link to="/templates" className="text-xs text-amber-500 hover:text-amber-400 transition-colors">Browse all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'SaaS Landing', desc: 'Product marketing site', icon: 'ri-rocket-line' },
            { name: 'Portfolio', desc: 'Creative showcase', icon: 'ri-palette-line' },
            { name: 'Marketplace', desc: 'Two-sided platform', icon: 'ri-store-2-line' },
            { name: 'Business Site', desc: 'Service business', icon: 'ri-building-line' },
          ].map((tpl) => (
            <Link key={tpl.name} to="/templates">
              <Card hoverable className="h-full text-center p-4">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <i className={`${tpl.icon} text-amber-500 text-lg`} />
                </div>
                <p className="text-sm font-medium text-foreground-950">{tpl.name}</p>
                <p className="text-xs text-foreground-500 mt-0.5">{tpl.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}