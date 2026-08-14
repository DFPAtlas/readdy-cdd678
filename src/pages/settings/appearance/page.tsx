import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/stores/index';
import { Palette, Monitor, Moon, Sun, Type } from 'lucide-react';

export default function SettingsAppearancePage() {
  const { mode, setMode } = useThemeStore();
  const [density, setDensity] = useState('comfortable');
  const [codeFont, setCodeFont] = useState('JetBrains Mono');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [sidebarDefault, setSidebarDefault] = useState('expanded');
  const [saved, setSaved] = useState(true);

  const handleSetMode = (m: 'dark' | 'light' | 'system') => {
    setMode(m);
    setSaved(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'dark' as const, label: 'Dark', icon: <Moon className="h-4 w-4" /> },
            { value: 'light' as const, label: 'Light', icon: <Sun className="h-4 w-4" /> },
            { value: 'system' as const, label: 'System', icon: <Monitor className="h-4 w-4" /> },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSetMode(opt.value)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                mode === opt.value ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
              }`}
            >
              <div className="flex justify-center mb-1">{opt.icon}</div>
              <p className="text-xs font-medium text-foreground-950">{opt.label}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Density</h3>
        <div className="grid grid-cols-2 gap-2">
          {['compact', 'comfortable'].map((d) => (
            <button
              key={d}
              onClick={() => { setDensity(d); setSaved(false); }}
              className={`p-3 rounded-lg border-2 text-left transition-colors capitalize ${
                density === d ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
              }`}
            >
              <p className="text-xs font-medium text-foreground-950">{d}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Code Font</h3>
        <div className="grid grid-cols-2 gap-2">
          {['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro'].map((f) => (
            <button
              key={f}
              onClick={() => { setCodeFont(f); setSaved(false); }}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                codeFont === f ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
              }`}
            >
              <Type className="h-4 w-4 text-foreground-500 mb-1" />
              <p className="text-xs font-mono font-medium text-foreground-950">{f}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Accessibility</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={reducedMotion} onChange={(e) => { setReducedMotion(e.target.checked); setSaved(false); }} className="h-4 w-4 rounded border-background-300 text-amber-500 focus:ring-amber-500" />
            <span className="text-xs text-foreground-600">Reduced motion</span>
          </label>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground-950 mb-3">Sidebar Default</h3>
        <div className="grid grid-cols-2 gap-2">
          {['expanded', 'collapsed'].map((s) => (
            <button
              key={s}
              onClick={() => { setSidebarDefault(s); setSaved(false); }}
              className={`p-3 rounded-lg border-2 text-left transition-colors capitalize ${
                sidebarDefault === s ? 'border-amber-500 bg-amber-500/5' : 'border-background-200 hover:border-background-300'
              }`}
            >
              <p className="text-xs font-medium text-foreground-950">{s}</p>
            </button>
          ))}
        </div>
      </Card>

      <Button size="sm" onClick={() => setSaved(true)} disabled={saved}>{saved ? 'Saved' : 'Save Preferences'}</Button>
    </div>
  );
}