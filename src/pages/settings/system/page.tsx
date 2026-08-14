import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Settings2, ExternalLink, AlertTriangle } from 'lucide-react';

export default function SettingsSystemPage() {
  const [forgeApiUrl, setForgeApiUrl] = useState('http://localhost:3000');
  const [supabaseUrl, setSupabaseUrl] = useState('http://localhost:54321');
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:4173');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [updateChannel, setUpdateChannel] = useState('stable');
  const [saved, setSaved] = useState(true);

  const handleChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setSaved(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Service URLs</h3>
        <div className="space-y-3">
          {[
            { label: 'Forge API', value: forgeApiUrl, setter: setForgeApiUrl },
            { label: 'Supabase', value: supabaseUrl, setter: setSupabaseUrl },
            { label: 'n8n', value: n8nUrl, setter: setN8nUrl },
            { label: 'Preview Manager', value: previewUrl, setter: setPreviewUrl },
            { label: 'Ollama', value: ollamaUrl, setter: setOllamaUrl },
          ].map((svc) => (
            <div key={svc.label}>
              <label className="text-xs font-medium text-foreground-700 mb-1 block">{svc.label}</label>
              <input
                value={svc.value}
                onChange={(e) => handleChange(svc.setter, e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Workspace</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-foreground-500">Project location</span>
            <span className="text-foreground-950 font-mono">~/forge/workspaces</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-foreground-500">Export location</span>
            <span className="text-foreground-950 font-mono">~/forge/exports</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-foreground-500">Backup status</span>
            <Badge size="sm" variant="success">Latest: 2 hours ago</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Update Channel</h3>
        <div className="grid grid-cols-2 gap-2">
          {['stable', 'beta', 'nightly'].map((c) => (
            <button
              key={c}
              onClick={() => { setUpdateChannel(c); setSaved(false); }}
              className={`p-3 rounded-lg border-2 text-left transition-colors capitalize ${
                updateChannel === c ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
              }`}
            >
              <p className="text-xs font-medium text-foreground-950">{c}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-600">Forge v0.4.3 is available. Update from the CLI: <code className="font-mono bg-amber-500/10 px-1 rounded">forge update</code></p>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Maintenance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground-950">Maintenance Mode</p>
            <p className="text-xs text-foreground-400">Prevents new builds and exports</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-9 h-5 bg-background-200 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
          </label>
        </div>
      </Card>

      <Button size="sm" onClick={() => setSaved(true)} disabled={saved}>{saved ? 'Saved' : 'Save Changes'}</Button>
    </div>
  );
}