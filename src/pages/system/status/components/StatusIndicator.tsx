import type { CheckStatus, OverallStatus } from '@/services/systemStatusService';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, CircleHelp } from 'lucide-react';

type IndicatorStatus = CheckStatus | OverallStatus;

const STATUS_META: Record<IndicatorStatus, { label: string; icon: typeof CheckCircle2; colorClass: string }> = {
  operational: { label: 'Operational', icon: CheckCircle2, colorClass: 'text-forge-success' },
  degraded: { label: 'Degraded', icon: AlertTriangle, colorClass: 'text-forge-warning' },
  unavailable: { label: 'Unavailable', icon: XCircle, colorClass: 'text-forge-error' },
  not_configured: { label: 'Not configured', icon: MinusCircle, colorClass: 'text-forge-text-muted' },
  unknown: { label: 'Not verified', icon: CircleHelp, colorClass: 'text-forge-text-muted' },
  action_required: { label: 'Action required', icon: AlertTriangle, colorClass: 'text-forge-amber' },
};

interface StatusIndicatorProps {
  status: IndicatorStatus;
  label?: string;
  className?: string;
}

export function statusLabel(status: IndicatorStatus): string {
  return STATUS_META[status]?.label ?? status;
}

export function StatusIndicator({ status, label, className = '' }: StatusIndicatorProps) {
  const meta = STATUS_META[status];
  const Icon = meta?.icon ?? CircleHelp;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta?.colorClass ?? 'text-forge-text-muted'}`} aria-hidden="true" />
      <span className="text-xs text-forge-text-secondary whitespace-nowrap">{label ?? meta?.label ?? status}</span>
    </span>
  );
}