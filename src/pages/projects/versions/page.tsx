import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects, demoVersions, getBuildsForProject } from '@/services/mock/demoData';
import type { ProjectVersion } from '@/types';
import { GitBranch, CheckCircle, Clock, ArrowLeftRight, RotateCcw, Download, X, AlertTriangle } from 'lucide-react';

export default function VersionsPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('list');
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [showRestore, setShowRestore] = useState<ProjectVersion | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [localVersions, setLocalVersions] = useState(demoVersions);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const versions = projectId === 'proj-001' ? localVersions : [];
  const builds = getBuildsForProject(project.id);
  const currentVersion = versions[0];

  const handleRestore = (version: ProjectVersion) => {
    const newVersion: ProjectVersion = {
      ...version,
      id: `ver-restore-${Date.now()}`,
      label: `${version.label} (restored)`,
      description: `Restored from ${version.label}`,
      createdAt: new Date().toISOString(),
      isCheckpoint: false,
    };
    setLocalVersions([newVersion, ...localVersions]);
    setShowRestore(null);
  };

  return (
    <>
      <PageHeader
        title="Versions"
        description={`${versions.length} versions in ${project.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}>
              {viewMode === 'list' ? 'Timeline' : 'List'}
            </Button>
            <Button size="sm" icon={<GitBranch className="h-3.5 w-3.5" />}>Create Checkpoint</Button>
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}/overview` },
          { label: 'Versions' },
        ]}
      />

      {versions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No versions yet</p>
          <p className="text-xs text-foreground-500 mt-1">Versions are created when you run builds</p>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && versions.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-background-100 bg-background-50">
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Version</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Build</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Created</th>
                <th className="text-right px-4 py-2.5 font-medium text-foreground-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-50">
              {versions.map((v, i) => {
                const build = builds.find((b) => b.id === v.buildId);
                return (
                  <tr key={v.id} className={`hover:bg-background-50 transition-colors ${i === 0 ? 'bg-amber-500/[0.02]' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {i === 0 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-foreground-300" />}
                        <span className="font-mono font-medium text-foreground-950">{v.label}</span>
                        {i === 0 && <Badge size="sm" variant="success">Current</Badge>}
                        {v.isCheckpoint && <Badge size="sm" variant="amber">Checkpoint</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-foreground-600 max-w-xs truncate">{v.description || '—'}</td>
                    <td className="px-4 py-2.5">
                      {build ? (
                        <span className="font-mono text-foreground-500">#{build.id.split('-').pop()}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-foreground-500">
                      {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowCompare(true)}>
                          <ArrowLeftRight className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">Export</Button>
                        {i > 0 && (
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowRestore(v)}>
                            <RotateCcw className="h-3 w-3" /> Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Timeline view */}
      {viewMode === 'timeline' && versions.length > 0 && (
        <div className="relative pl-8 border-l-2 border-background-200 ml-4 space-y-6">
          {versions.map((v, i) => (
            <div key={v.id} className="relative">
              <div className={`absolute -left-[calc(2rem+5px)] top-1 h-3 w-3 rounded-full border-2 ${
                i === 0 ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-background-300'
              }`} />
              <Card className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-foreground-950">{v.label}</span>
                      {i === 0 && <Badge size="sm" variant="success">Current</Badge>}
                      {v.isCheckpoint && <Badge size="sm" variant="amber">Checkpoint</Badge>}
                    </div>
                    <p className="text-xs text-foreground-400 mt-0.5">
                      {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {i > 0 && <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowRestore(v)}>Restore</Button>}
                  </div>
                </div>
                {v.description && <p className="text-xs text-foreground-600 mt-1">{v.description}</p>}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Restore confirmation */}
      {showRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowRestore(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <RotateCcw className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">Restore Version</h3>
            <p className="text-xs text-foreground-500 mb-4">
              Restoring <strong>{showRestore.label}</strong> will create a new version from this checkpoint. Your current files will be preserved and a new version record will be created.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowRestore(null)}>Cancel</Button>
              <Button size="sm" onClick={() => handleRestore(showRestore)}>Restore</Button>
            </div>
          </div>
        </div>
      )}

      {/* Compare modal */}
      {showCompare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCompare(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
              <h3 className="text-sm font-semibold text-foreground-950">Compare Versions</h3>
              <button onClick={() => setShowCompare(false)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-foreground-500">Changed Files</p>
                  <p className="text-lg font-semibold text-foreground-950">8</p>
                </div>
                <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-foreground-500">Added Files</p>
                  <p className="text-lg font-semibold text-emerald-600">3</p>
                </div>
                <div className="bg-rose-500/5 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-foreground-500">Removed Files</p>
                  <p className="text-lg font-semibold text-rose-600">1</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-700 mb-1">Changed Files</p>
                {['src/components/Pricing.tsx', 'src/pages/Pricing.tsx', 'src/components/Docs.tsx', 'tailwind.config.ts', 'package.json'].map((f) => (
                  <div key={f} className="flex items-center gap-2 py-1 px-2 rounded text-xs hover:bg-background-50">
                    <Badge size="sm" variant="warning">M</Badge>
                    <span className="font-mono text-foreground-950">{f}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-700 mb-1">Added Files</p>
                {['src/components/PricingTable.tsx', 'src/pages/Docs.tsx', 'src/data/pricing.ts'].map((f) => (
                  <div key={f} className="flex items-center gap-2 py-1 px-2 rounded text-xs hover:bg-background-50">
                    <Badge size="sm" variant="success">A</Badge>
                    <span className="font-mono text-foreground-950">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}