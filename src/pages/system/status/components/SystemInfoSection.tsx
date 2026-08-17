import { useThemeStore } from '@/stores/themeStore';
import { Card } from '@/components/ui/Card';

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Unknown browser';
}

interface SystemInfoSectionProps {
  supabaseConfigured: boolean;
}

export function SystemInfoSection({ supabaseConfigured }: SystemInfoSectionProps) {
  const theme = useThemeStore((s) => s.theme);
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);

  const rows = [
    { label: 'Environment', value: import.meta.env.MODE || 'unknown' },
    { label: 'Preview build', value: __IS_PREVIEW__ ? 'Yes' : 'No' },
    { label: 'Theme', value: `${theme}${theme === 'system' ? ` (${effectiveTheme})` : ''}` },
    { label: 'Supabase connection', value: supabaseConfigured ? 'Configured' : 'Not configured' },
    { label: 'Browser', value: detectBrowser() },
  ];

  return (
    <section aria-labelledby="system-info-title">
      <h2 id="system-info-title" className="text-sm font-semibold text-forge-text-primary mb-2">
        System information
      </h2>
      <Card className="p-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-forge-border-subtle last:border-b-0 py-1.5">
              <dt className="text-xs text-forge-text-muted">{row.label}</dt>
              <dd className="text-xs font-mono text-forge-text-secondary capitalize">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}