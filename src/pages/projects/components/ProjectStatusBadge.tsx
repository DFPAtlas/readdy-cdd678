import { Badge } from '@/components/ui/Badge';

type BadgeVariant = 'default' | 'amber' | 'accent' | 'success' | 'warning' | 'error' | 'agent';

export function projectStatusMeta(status: string | null): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'active':
      return { label: 'Active', variant: 'success' };
    case 'building':
      return { label: 'Building', variant: 'warning' };
    case 'previewing':
      return { label: 'Previewing', variant: 'accent' };
    case 'archived':
      return { label: 'Archived', variant: 'default' };
    default:
      return { label: 'Draft', variant: 'default' };
  }
}

export function buildStatusMeta(status: string | null): { label: string; variant: BadgeVariant } | null {
  switch (status) {
    case 'success':
      return { label: 'Built', variant: 'success' };
    case 'failed':
      return { label: 'Build failed', variant: 'error' };
    case 'running':
      return { label: 'Building', variant: 'warning' };
    case 'queued':
      return { label: 'Queued', variant: 'default' };
    default:
      return null;
  }
}

export function ProjectStatusBadge({ status }: { status: string | null }) {
  const { label, variant } = projectStatusMeta(status);
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

export function BuildStatusBadge({ status }: { status: string | null }) {
  const meta = buildStatusMeta(status);
  if (!meta) return null;
  return <Badge variant={meta.variant} size="sm">{meta.label}</Badge>;
}