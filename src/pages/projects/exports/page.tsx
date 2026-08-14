import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects, demoExports } from '@/services/mock/demoData';
import type { ExportRecord } from '@/types';
import { Download, Package, FileArchive, Globe, GitBranch, FolderOpen, X, CheckCircle, AlertTriangle, Loader2, Clock, ExternalLink } from 'lucide-react';

const formatIcons: Record<string, React.ReactNode> = {
  zip: <FileArchive className="h-5 w-5 text-amber-500" />,
  static: <Globe className="h-5 w-5 text-sky-500" />,
  docker: <Package className="h-5 w-5 text-violet-500" />,
};

const statusColorMap: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  completed: 'success',
  failed: 'danger',
  pending: 'warning',
  building: 'warning',
};

export default function ExportsPage() {
  const { projectId } = useParams();
  const project = demoProjects.find((p) => p.id === projectId);
  const [localExports, setLocalExports] = useState(demoExports);
  const [exportStep, setExportStep] = useState<'idle' | 'configuring' | 'running' | 'ready'>('idle');
  const [exportConfig, setExportConfig] = useState({ format: 'zip', version: 'latest', validate: true });
  const [showExportModal, setShowExportModal] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Download className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const startExport = () => {
    setExportStep('configuring');
  };

  const runExport = () => {
    setExportStep('running');
    // Simulate stages
    setTimeout(() => {
      const newExport: ExportRecord = {
        id: `exp-00${localExports.length + 1}`,
        projectId: projectId!,
        format: exportConfig.format as 'zip' | 'static' | 'docker',
        status: 'completed',
        fileSize: 2500000,
        downloadUrl: '#',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      setLocalExports([newExport, ...localExports]);
      setExportStep('ready');
    }, 4000);
  };

  const handleDownload = (exp: ExportRecord) => {
    alert(`Downloading ${exp.format} export (demo)`);
  };

  const allExports = projectId === 'proj-001' ? localExports : [];

  return (
    <>
      <PageHeader
        title="Exports"
        description={`${allExports.length} exports in ${project.name}`}
        actions={
          <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={startExport}>New Export</Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}/overview` },
          { label: 'Exports' },
        ]}
      />

      {/* Export format cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { format: 'zip', name: 'React/Vite ZIP', desc: 'Full project source with dependencies', icon: <FileArchive className="h-5 w-5 text-amber-500" /> },
          { format: 'static', name: 'Static Web ZIP', desc: 'Built static HTML/CSS/JS output', icon: <Globe className="h-5 w-5 text-sky-500" /> },
          { format: 'source', name: 'Source-only ZIP', desc: 'Source code without node_modules', icon: <FolderOpen className="h-5 w-5 text-emerald-500" /> },
          { format: 'git', name: 'Git-ready Archive', desc: 'Archive with .git history preserved', icon: <GitBranch className="h-5 w-5 text-violet-500" /> },
        ].map((fmt) => (
          <Card key={fmt.format} hoverable className="p-4 cursor-pointer" onClick={startExport}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-background-100 flex items-center justify-center">
                {fmt.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-950">{fmt.name}</p>
                <p className="text-xs text-foreground-400">{fmt.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Export history */}
      {allExports.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-background-100 bg-background-50">
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Export</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Format</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Size</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground-500">Date</th>
                <th className="text-right px-4 py-2.5 font-medium text-foreground-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-50">
              {allExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-background-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-foreground-950">{exp.id.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge size="sm" variant="default">{exp.format}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusColorMap[exp.status] || 'default'} size="sm">{exp.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-foreground-600 font-mono">
                    {exp.fileSize ? `${(exp.fileSize / 1048576).toFixed(1)} MB` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-foreground-500">
                    {new Date(exp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {exp.status === 'completed' && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDownload(exp)}>
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    )}
                    {exp.status === 'failed' && (
                      <Button variant="ghost" size="sm" className="text-xs">Retry</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-foreground-300 mb-3" />
          <p className="text-sm font-medium text-foreground-950">No exports yet</p>
          <p className="text-xs text-foreground-500 mt-1">Create your first export to download your project</p>
          <Button size="sm" className="mt-3" onClick={startExport}>Create Export</Button>
        </div>
      )}

      {/* Export workflow modal */}
      {exportStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setExportStep('idle'); }}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {exportStep === 'configuring' && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
                  <h3 className="text-sm font-semibold text-foreground-950">New Export</h3>
                  <button onClick={() => setExportStep('idle')} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                    <X className="h-4 w-4 text-foreground-500" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['zip', 'static', 'source', 'git'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setExportConfig({ ...exportConfig, format: f })}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${
                            exportConfig.format === f ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
                          }`}
                        >
                          <p className="text-xs font-medium text-foreground-950 capitalize">{f}</p>
                          <p className="text-xs text-foreground-400">
                            {f === 'zip' ? 'Full source' : f === 'static' ? 'Built output' : f === 'source' ? 'Code only' : 'With git'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="validate"
                      checked={exportConfig.validate}
                      onChange={(e) => setExportConfig({ ...exportConfig, validate: e.target.checked })}
                      className="h-4 w-4 rounded border-background-300 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="validate" className="text-xs text-foreground-600">Run validation checks before export</label>
                  </div>
                  <Button className="w-full" onClick={runExport}>Start Export</Button>
                </div>
              </>
            )}

            {exportStep === 'running' && (
              <div className="p-5 flex flex-col items-center py-10">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground-950">Exporting project...</p>
                <div className="w-full max-w-xs mt-4 space-y-2">
                  {['Validating', 'Building', 'Packaging', 'Finalizing'].map((stage, i) => (
                    <div key={stage} className="flex items-center gap-2 text-xs">
                      {i < 3 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> :
                       <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />}
                      <span className={i < 3 ? 'text-emerald-600' : 'text-amber-600'}>{stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exportStep === 'ready' && (
              <div className="p-5 flex flex-col items-center py-10 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm font-semibold text-foreground-950">Export Ready!</p>
                <p className="text-xs text-foreground-400 mt-1 mb-4">
                  Your {exportConfig.format.toUpperCase()} export has been created successfully.
                </p>
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setExportStep('idle')}>Close</Button>
                  <Button size="sm" className="flex-1" onClick={() => setExportStep('idle')}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}