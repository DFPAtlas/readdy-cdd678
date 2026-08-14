import { useSystemStore } from '@/stores/index';
import { StatusDot } from '@/components/ui/StatusChip';
import { getServiceStatuses } from '@/services/mock/demoData';
import { useEffect } from 'react';

interface StatusBarProps {
  compact?: boolean;
}

export function StatusBar({ compact }: StatusBarProps) {
  const health = useSystemStore((s) => s.health);
  const setHealth = useSystemStore((s) => s.setHealth);

  useEffect(() => {
    const svcs = getServiceStatuses();
    setHealth({
      forgeApi: { status: svcs[0].status, latency: svcs[0].latency, version: svcs[0].version },
      supabase: { status: svcs[1].status, latency: svcs[1].latency, version: svcs[1].version },
      n8n: { status: svcs[2].status, latency: svcs[2].latency, version: svcs[2].version },
      previewManager: { status: svcs[3].status, latency: svcs[3].latency, version: svcs[3].version },
      ollama: { status: svcs[4].status, latency: svcs[4].latency, version: svcs[4].version },
    });
  }, [setHealth]);

  if (compact) {
    const services = health
      ? [
          { key: 'api', label: 'API', status: health.forgeApi.status },
          { key: 'n8n', label: 'n8n', status: health.n8n.status },
          { key: 'db', label: 'DB', status: health.supabase.status },
          { key: 'prev', label: 'Preview', status: health.previewManager.status },
        ]
      : [];

    return (
      <div className="flex items-center gap-2 text-[10px] text-forge-text-muted">
        {services.map((svc) => (
          <span key={svc.key} className="flex items-center gap-1">
            <StatusDot status={svc.status} />
            <span className="hidden sm:inline">{svc.label}</span>
          </span>
        ))}
      </div>
    );
  }

  const services = health
    ? [
        { key: 'forgeApi', label: 'Forge API', status: health.forgeApi.status, latency: health.forgeApi.latency },
        { key: 'n8n', label: 'n8n', status: health.n8n.status, latency: health.n8n.latency },
        { key: 'supabase', label: 'Supabase', status: health.supabase.status, latency: health.supabase.latency },
        { key: 'previewManager', label: 'Preview', status: health.previewManager.status, latency: health.previewManager.latency },
      ]
    : [];

  return (
    <footer className="h-statusbar flex-shrink-0 bg-forge-sidebar border-t border-forge-border-subtle flex items-center px-4 gap-4 z-20">
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {services.map((svc) => (
          <span key={svc.key} className="flex items-center gap-1.5 text-[11px] text-forge-text-muted whitespace-nowrap">
            <StatusDot status={svc.status} />
            <span className="hidden sm:inline">{svc.label}</span>
            {svc.latency !== undefined && (
              <span className="text-forge-text-muted/60">{svc.latency}ms</span>
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-forge-text-muted flex-shrink-0">
        <span className="hidden md:inline">Mock Mode</span>
        <span className="hidden md:inline">v0.4.2</span>
        <span>0 tasks</span>
      </div>
    </footer>
  );
}