import { type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-forge-text-primary">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-forge-text-muted">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-forge-text-muted">
      <div className="h-4 w-4 rounded-full border-2 border-forge-border border-t-forge-amber animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-10 flex flex-col items-center text-center">
      <i className="ri-error-warning-line text-forge-error text-2xl" />
      <p className="mt-2 text-sm text-forge-text-secondary">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 flex flex-col items-center text-center">
      <i className="ri-inbox-line text-forge-text-muted text-2xl" />
      <p className="mt-2 text-sm text-forge-text-muted">{message}</p>
    </div>
  );
}

const TONES: Record<string, string> = {
  amber: 'bg-forge-amber/10 text-forge-amber',
  success: 'bg-forge-success/10 text-forge-success',
  error: 'bg-forge-error/10 text-forge-error',
  warning: 'bg-forge-warning/10 text-forge-warning',
  accent: 'bg-forge-accent/10 text-forge-accent',
  agent: 'bg-forge-agent/10 text-forge-agent',
  muted: 'bg-forge-border text-forge-text-secondary',
};

export function StatCard({ label, value, icon, tone = 'amber', hint }: { label: string; value: ReactNode; icon: string; tone?: keyof typeof TONES; hint?: string }) {
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${TONES[tone] ?? TONES.amber}`}>
          <i className={`${icon} text-base`} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-forge-text-primary leading-tight">{value}</p>
          <p className="text-xs text-forge-text-muted">{label}</p>
          {hint && <p className="text-[10px] text-forge-text-muted mt-0.5">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const s = (status ?? 'unknown').toLowerCase();
  const map: Record<string, { cls: string; label: string }> = {
    healthy: { cls: 'bg-forge-success/10 text-forge-success', label: 'Healthy' },
    active: { cls: 'bg-forge-success/10 text-forge-success', label: 'Active' },
    degraded: { cls: 'bg-forge-warning/10 text-forge-warning', label: 'Degraded' },
    down: { cls: 'bg-forge-error/10 text-forge-error', label: 'Down' },
    failed: { cls: 'bg-forge-error/10 text-forge-error', label: 'Failed' },
    unknown: { cls: 'bg-forge-border text-forge-text-muted', label: 'Unknown' },
    disabled: { cls: 'bg-forge-border text-forge-text-muted', label: 'Disabled' },
    investigating: { cls: 'bg-forge-error/10 text-forge-error', label: 'Investigating' },
    identified: { cls: 'bg-forge-warning/10 text-forge-warning', label: 'Identified' },
    monitoring: { cls: 'bg-forge-accent/10 text-forge-accent', label: 'Monitoring' },
    resolved: { cls: 'bg-forge-success/10 text-forge-success', label: 'Resolved' },
    closed: { cls: 'bg-forge-border text-forge-text-secondary', label: 'Closed' },
    critical: { cls: 'bg-forge-error/10 text-forge-error', label: 'Critical' },
    major: { cls: 'bg-forge-warning/10 text-forge-warning', label: 'Major' },
    minor: { cls: 'bg-forge-accent/10 text-forge-accent', label: 'Minor' },
  };
  const m = map[s] ?? { cls: 'bg-forge-border text-forge-text-secondary', label: status ?? '—' };
  return <span className={`inline-flex items-center rounded px-1.5 py-0 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}