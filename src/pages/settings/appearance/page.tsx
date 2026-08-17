import { useThemeStore } from '@/stores/themeStore';
import { Card } from '@/components/ui/Card';
import { Monitor, Moon, Sun } from 'lucide-react';

type ThemeOption = 'dark' | 'light' | 'system';

function ThemePreview({ variant }: { variant: ThemeOption }) {
  if (variant === 'system') {
    return (
      <div className="h-16 rounded-md overflow-hidden border border-forge-border grid grid-cols-2" aria-hidden="true">
        <div className="bg-forge-bg" />
        <div className="bg-white" />
      </div>
    );
  }

  const light = variant === 'light';
  return (
    <div
      className={`h-16 rounded-md overflow-hidden border p-2 ${
        light ? 'bg-gray-50 border-gray-200' : 'bg-forge-bg border-forge-border'
      }`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className={`h-1.5 w-1.5 rounded-full ${light ? 'bg-gray-300' : 'bg-forge-border'}`} />
        <span className={`h-1.5 w-1.5 rounded-full ${light ? 'bg-gray-300' : 'bg-forge-border'}`} />
        <span className="h-1.5 w-1.5 rounded-full bg-forge-amber" />
      </div>
      <div className={`h-2 w-3/4 rounded mb-1 ${light ? 'bg-gray-200' : 'bg-forge-panel'}`} />
      <div className={`h-2 w-1/2 rounded ${light ? 'bg-gray-100' : 'bg-forge-border'}`} />
    </div>
  );
}

const OPTIONS: { value: ThemeOption; label: string; description: string; icon: typeof Moon }[] = [
  { value: 'dark', label: 'Dark', description: 'Low-light developer theme', icon: Moon },
  { value: 'light', label: 'Light', description: 'Bright, high-contrast theme', icon: Sun },
  { value: 'system', label: 'System', description: 'Follow your OS preference', icon: Monitor },
];

export default function SettingsAppearancePage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-forge-text-primary">Appearance</h2>
        <p className="text-sm text-forge-text-muted mt-0.5">
          Choose how Forge looks. Changes apply immediately and are remembered for next time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                active
                  ? 'border-forge-amber bg-forge-amber/5'
                  : 'border-forge-border hover:border-forge-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${active ? 'text-forge-amber' : 'text-forge-text-muted'}`} />
                {active && <span className="h-2 w-2 rounded-full bg-forge-amber" />}
              </div>
              <p className="text-sm font-medium text-forge-text-primary">{opt.label}</p>
              <p className="text-xs text-forge-text-muted mt-0.5">{opt.description}</p>
              <div className="mt-3">
                <ThemePreview variant={opt.value} />
              </div>
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <p className="text-xs text-forge-text-muted leading-relaxed">
          Theme preference is stored on this device only. The System option reads your operating system's
          light/dark setting automatically.
        </p>
      </Card>
    </div>
  );
}