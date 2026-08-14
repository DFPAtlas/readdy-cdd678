import type { ServiceStatus } from '@/types';

interface StatusChipProps {
  status: ServiceStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const statusColors: Record<ServiceStatus, string> = {
  online: 'bg-forge-success',
  degraded: 'bg-forge-warning',
  offline: 'bg-forge-error',
  unknown: 'bg-forge-text-muted',
};

const statusLabels: Record<ServiceStatus, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
  unknown: 'Unknown',
};

export function StatusDot({ status, size = 'sm' }: { status: ServiceStatus; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  return (
    <span className={`relative flex ${sizeClass}`}>
      <span className={`absolute inline-flex h-full w-full rounded-full ${statusColors[status]}`} />
      {status === 'online' && (
        <span className={`absolute inline-flex h-full w-full rounded-full ${statusColors[status]} animate-ping opacity-75`} />
      )}
    </span>
  );
}

export function StatusChip({ status, label, size = 'sm' }: StatusChipProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <StatusDot status={status} size={size} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-forge-text-secondary`}>
        {label || statusLabels[status]}
      </span>
    </div>
  );
}