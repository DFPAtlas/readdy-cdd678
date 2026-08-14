import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { demoProviders } from '@/services/mock/demoData';
import { Cpu, CheckCircle, XCircle, AlertTriangle, Plus, X, Wifi, Globe, TestTube } from 'lucide-react';

export default function SettingsProvidersPage() {
  const [localProviders, setLocalProviders] = useState(demoProviders);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = (id: string) => {
    setTestingId(id);
    setTimeout(() => setTestingId(null), 1500);
  };

  const handleToggle = (id: string) => {
    setLocalProviders((prev) =>
      prev.map((p) => p.id === id ? { ...p, isConnected: !p.isConnected } : p)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-500">{localProviders.filter((p) => p.isConnected).length} of {localProviders.length} providers connected</p>
        <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowAddModal(true)}>Add Provider</Button>
      </div>

      {localProviders.map((provider) => (
        <Card key={provider.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                provider.isConnected ? 'bg-emerald-500/10' : 'bg-foreground-100'
              }`}>
                {provider.isLocal ? <Cpu className="h-5 w-5 text-emerald-500" /> : <Globe className="h-5 w-5 text-sky-500" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground-950">{provider.label}</h3>
                  <Badge size="sm" variant={provider.isLocal ? 'default' : 'default'}>{provider.isLocal ? 'Local' : 'Cloud'}</Badge>
                  {provider.isConnected ? (
                    <Badge size="sm" variant="success">Connected</Badge>
                  ) : (
                    <Badge size="sm" variant="default">Disconnected</Badge>
                  )}
                </div>
                {provider.baseUrl && <p className="text-xs font-mono text-foreground-400 mt-0.5">{provider.baseUrl}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-foreground-400">{provider.models.length} models</span>
                  {provider.lastCheckedAt && (
                    <span className="text-xs text-foreground-400">· Checked {new Date(provider.lastCheckedAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => handleTest(provider.id)}
                disabled={testingId === provider.id}
              >
                {testingId === provider.id ? (
                  <span className="animate-pulse">Testing...</span>
                ) : (
                  <><TestTube className="h-3 w-3 mr-1" /> Test</>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleToggle(provider.id)}>
                {provider.isConnected ? 'Disable' : 'Connect'}
              </Button>
            </div>
          </div>

          {/* Models */}
          {provider.models.length > 0 && (
            <div className="mt-3 pt-3 border-t border-background-100">
              <p className="text-xs font-medium text-foreground-500 mb-1.5">Models</p>
              <div className="flex flex-wrap gap-1">
                {provider.models.map((m) => (
                  <div key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background-50 text-xs">
                    {m.isAvailable ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-foreground-300" />}
                    <span className="font-mono text-foreground-950">{m.name}</span>
                    <span className="text-foreground-400">({(m.contextWindow / 1000).toFixed(0)}k)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Add Provider modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
              <h3 className="text-sm font-semibold text-foreground-950">Add Provider</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md hover:bg-background-100 transition-colors"><X className="h-4 w-4 text-foreground-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Provider</label>
                <select className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg bg-white text-foreground-950 focus:outline-none focus:ring-1 focus:ring-amber-500" defaultValue="openai">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="ollama">Local Ollama</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Display Name</label>
                <input className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" placeholder="My Provider" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">API Key</label>
                <input type="password" className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" placeholder="sk-..." />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-700 mb-1.5 block">Base URL (optional)</label>
                <input className="w-full h-9 px-3 text-sm border border-background-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-foreground-950" placeholder="https://api.openai.com/v1" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-background-300 text-amber-500 focus:ring-amber-500" />
                <span className="text-xs text-foreground-600">Local provider</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={() => setShowAddModal(false)}>Test & Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}