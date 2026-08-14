import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects, getBuildsForProject } from '@/services/mock/demoData';
import type { Build } from '@/types';
import { Hammer, AlertTriangle, CheckCircle, XCircle, Clock, RotateCcw, X, ArrowRight } from 'lucide-react';

const statusColorMap: Record<string, 'success' | 'warning' | 'danger' | 'amber' | 'default'> = {
  success: 'success',
  failed: 'danger',
  cancelled: 'default',
  running: 'amber',
  queued: 'warning',
};

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-rose-500" />,
  cancelled: <XCircle className="h-4 w-4 text-foreground-400" />,
  running: <Clock className="h-4 w-4 text-amber-500 animate-pulse" />,
  queued: <Clock className="h-4 w-4 text-amber-500" />,
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function BuildsPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Hammer className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const builds = getBuildsForProject(project.id);
  const filtered = statusFilter === 'all' ? builds : builds.filter((b) => b.status === statusFilter);

  const stages = ['Planning', 'Creating tasks', 'Generating UI', 'Writing content', 'Preparing assets', 'Building', 'Testing', 'Starting preview'];

  return (
    <>
      <PageHeader
        title="Builds"
        description={`${builds.length} builds in ${project.name}`}
        actions={
          <Button size="sm" icon={<Hammer className="h-3.5 w-3.5" />}>Run Build</Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}/overview` },
          { label: 'Builds' },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {['all', 'success', 'running', 'failed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap capitalize ${
              statusFilter === s ? 'bg-amber-500 text-white' : 'bg-background-100 text-foreground-600 hover:bg-background-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Hammer className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No builds found</p>
          <p className="text-xs text-foreground-500 mt-1">Run your first build from the sandbox</p>
        </div>
      )}

      {/* Build table */}
      {filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-background-100 bg-background-50">
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Build</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Version</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Duration</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Started</th>
                <th className="text-right px-4 py-2.5 font-medium text-foreground-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-50">
              {filtered.map((build) => (
                <tr key={build.id} className="hover:bg-background-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {statusIcons[build.status]}
                      <span className="font-mono text-foreground-950">{build.id.split('-').pop()?.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link to={`/projects/${projectId}/versions`} className="font-mono text-amber-500 hover:text-amber-400">{build.version}</Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusColorMap[build.status] || 'default'} size="sm">{build.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-foreground-600 font-mono">{formatDuration(build.duration)}</td>
                  <td className="px-4 py-2.5 text-foreground-500">
                    {new Date(build.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedBuild(build)}>Details</Button>
                      {build.status === 'failed' && (
                        <Button variant="ghost" size="sm" className="text-xs"><RotateCcw className="h-3 w-3" /> Retry</Button>
                      )}
                      {build.status === 'running' && (
                        <Button variant="danger" size="sm" className="text-xs">Cancel</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Build detail drawer */}
      {selectedBuild && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedBuild(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-background-100 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground-950">Build {selectedBuild.id.split('-').pop()?.toUpperCase()}</h3>
                <Badge variant={statusColorMap[selectedBuild.status] || 'default'} size="sm">{selectedBuild.status}</Badge>
              </div>
              <button onClick={() => setSelectedBuild(null)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Version</p>
                  <p className="text-sm font-mono font-medium text-foreground-950">{selectedBuild.version}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Duration</p>
                  <p className="text-sm font-mono font-medium text-foreground-950">{formatDuration(selectedBuild.duration)}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Started</p>
                  <p className="text-sm text-foreground-950">{new Date(selectedBuild.startedAt).toLocaleString()}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Completed</p>
                  <p className="text-sm text-foreground-950">{selectedBuild.completedAt ? new Date(selectedBuild.completedAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              {/* Stage timeline */}
              <div>
                <p className="text-xs font-semibold text-foreground-950 mb-2">Build Stages</p>
                <div className="space-y-1.5">
                  {stages.map((stage, i) => {
                    const isComplete = selectedBuild.status === 'success' || (selectedBuild.status !== 'running' && i < stages.length - 1);
                    const isActive = selectedBuild.status === 'running' && i === Math.floor(stages.length * 0.4);
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isComplete ? 'bg-emerald-500/10' : isActive ? 'bg-amber-500/10' : 'bg-background-100'
                        }`}>
                          {isComplete ? <CheckCircle className="h-3 w-3 text-emerald-500" /> :
                           isActive ? <Clock className="h-3 w-3 text-amber-500 animate-pulse" /> :
                           <span className="text-xs text-foreground-300">{i + 1}</span>}
                        </div>
                        <span className={`text-xs ${isComplete ? 'text-foreground-950' : isActive ? 'text-amber-600 font-medium' : 'text-foreground-400'}`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agents */}
              <div>
                <p className="text-xs font-semibold text-foreground-950 mb-2">Agents Used</p>
                <div className="flex flex-wrap gap-1">
                  {['Master Agent', 'UI Builder', 'Layout Agent', 'Content Agent', 'QA Agent'].map((a) => (
                    <Badge key={a} size="sm" variant="default">{a}</Badge>
                  ))}
                </div>
              </div>

              {selectedBuild.status === 'failed' && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <p className="text-xs font-semibold text-rose-600">Build Failed</p>
                  </div>
                  <p className="text-xs text-rose-600/80">Asset /images/hero-bg.jpg not found. Build Repair Agent automatically patched this in a subsequent build.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}