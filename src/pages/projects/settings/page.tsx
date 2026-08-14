import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProjects } from '@/services/mock/demoData';
import { Settings2, AlertTriangle, Save, RotateCcw } from 'lucide-react';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = demoProjects.find((p) => p.id === projectId);
  const [activeSection, setActiveSection] = useState('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState({
    name: project?.name || '',
    description: project?.description || '',
    framework: project?.settings.framework || 'react',
    styling: project?.settings.styling || 'tailwind',
    previewPort: project?.settings.previewPort || 5173,
    autoSave: project?.settings.autoSave ?? true,
    autoPreview: project?.settings.autoPreview ?? true,
    gitEnabled: project?.settings.gitEnabled ?? false,
    aiRouting: 'automatic',
    privacy: 'standard',
    defaultViewport: 'desktop',
    defaultExportFormat: 'zip',
    runValidation: true,
  });
  const [saved, setSaved] = useState(true);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Settings2 className="h-10 w-10 text-foreground-300 mb-3" />
        <p className="text-sm font-medium text-foreground-950">Project not found</p>
        <Link to="/projects" className="mt-4"><Button variant="ghost" size="sm">Back to Projects</Button></Link>
      </div>
    );
  }

  const sections = [
    { id: 'general', label: 'General' },
    { id: 'technical', label: 'Technical' },
    { id: 'ai-routing', label: 'AI Routing' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'preview', label: 'Preview' },
    { id: 'export-defaults', label: 'Export Defaults' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  const handleChange = (key: string, value: string | boolean | number) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Project Name</label>
              <input
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Description</label>
              <textarea
                value={settings.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full h-20 px-3 py-2 text-sm border border-background-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Default Route</label>
              <input
                defaultValue="/"
                className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950 font-mono"
              />
            </div>
          </div>
        );
      case 'technical':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Framework</label>
                <select value={settings.framework} onChange={(e) => handleChange('framework', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Styling</label>
                <select value={settings.styling} onChange={(e) => handleChange('styling', e.target.value)} className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="tailwind">Tailwind CSS</option>
                  <option value="css">CSS Modules</option>
                  <option value="styled">Styled Components</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Preview Port</label>
              <input type="number" value={settings.previewPort} onChange={(e) => handleChange('previewPort', parseInt(e.target.value))} className="w-32 h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950 font-mono" />
            </div>
            <div className="space-y-2">
              {[
                { key: 'autoSave', label: 'Auto-save files' },
                { key: 'autoPreview', label: 'Auto-start preview on build' },
                { key: 'gitEnabled', label: 'Enable Git version control' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={(e) => handleChange(item.key, e.target.checked)}
                    className="h-4 w-4 rounded border-background-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-foreground-600">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'ai-routing':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Routing Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['automatic', 'local-preferred', 'local-only', 'quality-priority', 'cost-saver'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleChange('aiRouting', mode)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      settings.aiRouting === mode ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground-950 capitalize">{mode.replace('-', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Privacy Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['standard', 'local-preferred', 'local-only', 'restricted'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleChange('privacy', mode)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      settings.privacy === mode ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground-950 capitalize">{mode.replace('-', ' ')}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'preview':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Default Viewport</label>
              <div className="grid grid-cols-3 gap-2">
                {['desktop', 'tablet', 'mobile'].map((vp) => (
                  <button
                    key={vp}
                    onClick={() => handleChange('defaultViewport', vp)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors capitalize ${
                      settings.defaultViewport === vp ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground-950">{vp}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'export-defaults':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Default Export Format</label>
              <div className="grid grid-cols-2 gap-2">
                {['zip', 'static', 'source', 'git'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleChange('defaultExportFormat', fmt)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors capitalize ${
                      settings.defaultExportFormat === fmt ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-foreground-950">{fmt}</p>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.runValidation} onChange={(e) => handleChange('runValidation', e.target.checked)} className="h-4 w-4 rounded border-background-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-xs text-foreground-600">Run validation before export</span>
            </label>
          </div>
        );
      case 'danger':
        return (
          <div className="space-y-4">
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <p className="text-sm font-semibold text-rose-600">Archive Project</p>
              </div>
              <p className="text-xs text-rose-600/80 mb-3">Archived projects are hidden from the main view but can be restored later.</p>
              <Button variant="danger" size="sm">Archive Project</Button>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <p className="text-sm font-semibold text-rose-600">Delete Project</p>
              </div>
              <p className="text-xs text-rose-600/80 mb-3">Permanently delete this project and all its files, builds, versions, and exports. This action cannot be undone.</p>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete Project</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <PageHeader
        title="Project Settings"
        description={`Configure ${project.name}`}
        actions={
          <Button size="sm" onClick={handleSave} disabled={saved} icon={<Save className="h-3.5 w-3.5" />}>
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${projectId}/overview` },
          { label: 'Settings' },
        ]}
      />

      <div className="flex gap-4">
        {/* Section nav */}
        <div className="w-44 flex-shrink-0 space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                activeSection === s.id
                  ? 'bg-amber-500/10 text-amber-600 font-medium'
                  : 'text-foreground-500 hover:bg-background-100 hover:text-foreground-700'
              } ${s.id === 'danger' ? 'text-rose-500 hover:text-rose-600' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card className="flex-1 p-4">
          <h3 className="text-sm font-semibold text-foreground-950 mb-4">{sections.find((s) => s.id === activeSection)?.label}</h3>
          {renderSection()}
        </Card>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground-950 mb-2">Delete Project Permanently?</h3>
            <p className="text-xs text-foreground-500 mb-4">
              This will permanently delete <strong>{project.name}</strong> and all associated files, builds, versions, and exports. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(false)}>Delete Forever</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}