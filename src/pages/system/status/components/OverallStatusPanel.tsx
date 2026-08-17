import type { DerivedStatus, OverallStatus } from '@/services/systemStatusService';
import { CheckCircle2, AlertTriangle, XCircle, CircleHelp } from 'lucide-react';

const META: Record<OverallStatus, { icon: typeof CheckCircle2; colorClass: string; panelClass: string }> = {
  operational: { icon: CheckCircle2, colorClass: 'text-forge-success', panelClass: 'border-forge-success/25 bg-forge-success/5' },
  degraded: { icon: AlertTriangle, colorClass: 'text-forge-warning', panelClass: 'border-forge-warning/25 bg-forge-warning/5' },
  unavailable: { icon: XCircle, colorClass: 'text-forge-error', panelClass: 'border-forge-error/25 bg-forge-error/5' },
  action_required: { icon: AlertTriangle, colorClass: 'text-forge-amber', panelClass: 'border-forge-amber/25 bg-forge-amber/5' },
  unknown: { icon: CircleHelp, colorClass: 'text-forge-text-muted', panelClass: 'border-forge-border-subtle bg-forge-panel' },
};

export function OverallStatusPanel({ derived }: { derived: DerivedStatus }) {
  const { overall } = derived;
  const meta = META[overall.status] ?? META.unknown;
  const Icon = meta.icon;

  return (
    <div aria-live="polite" className={`rounded-lg border p-4 ${meta.panelClass}`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`h-5 w-5 shrink-0 ${meta.colorClass}`} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-forge-text-primary">{overall.title}</h2>
      </div>
      <p className="mt-1.5 text-xs text-forge-text-muted">{overall.sentence}</p>
    </div>
  );
}