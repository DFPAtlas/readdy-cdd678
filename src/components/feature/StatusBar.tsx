import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSystemStore } from '@/stores/index';
import { StatusDot } from '@/components/ui/StatusChip';
import { fetchSystemStatus, toServiceHealth } from '@/services/systemStatusService';

interface StatusBarProps {
  compact?: boolean;
}

const REFRESH_MS = 60_000;

/**
 * Bottom status bar. Polls the real system status checks (auth, database,
 * AI gateway) once a minute and publishes them to the system store, which
 * the sidebar and top bar read from. Nothing here is simulated.
 */
export function StatusBar({ compact }: StatusBarProps) {
  const navigate = useNavigate();
  const health = useSystemStore((s) => s.health);
  const setHealth = useSystemStore((s) => s.setHealth);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchSystemStatus()
        .then((snapshot) => {
          if (!cancelled) setHealth(toServiceHealth(snapshot));
        })
        .catch(() => {
          // Keep the last known state; the status page shows full detail.
        });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [setHealth]);

  const services = health
    ? [
        { key: 'auth', label: 'Auth', status: health.auth.status, message: health.auth.message },
        { key: 'database', label: 'Database', status: health.database.status, message: health.database.message },
        { key: 'aiGateway', label: 'AI', status: health.aiGateway.status, message: health.aiGateway.message },
      ]
    : [];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-forge-text-muted">
        {services.map((svc) => (
          <span key={svc.key} className="flex items-center gap-1" title={svc.message}>
            <StatusDot status={svc.status} />
            <span className="hidden sm:inline">{svc.label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <footer className="h-statusbar flex-shrink-0 bg-forge-sidebar border-t border-forge-border-subtle flex items-center px-4 gap-4 z-20">
      <button
        type="button"
        onClick={() => navigate('/system/status')}
        className="flex items-center gap-3 flex-1 overflow-hidden text-left"
        aria-label="Open system status"
      >
        {services.map((svc) => (
          <span
            key={svc.key}
            className="flex items-center gap-1.5 text-[11px] text-forge-text-muted whitespace-nowrap"
            title={svc.message}
          >
            <StatusDot status={svc.status} />
            <span className="hidden sm:inline">{svc.label}</span>
          </span>
        ))}
      </button>
    </footer>
  );
}
