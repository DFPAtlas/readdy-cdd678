import type { SubscriptionStatus } from '@/pages/projects/sandbox/sandboxBilling';

export type StatusTone = 'success' | 'warning' | 'error' | 'muted';

export function statusLabel(status: SubscriptionStatus | null): string {
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'Trial';
    case 'past_due': return 'Past due';
    case 'unpaid': return 'Unpaid';
    case 'paused': return 'Paused';
    case 'canceled': return 'Cancelled';
    case 'incomplete': return 'Incomplete';
    case 'incomplete_expired': return 'Incomplete';
    default: return 'Free plan';
  }
}

export function statusTone(status: SubscriptionStatus | null): StatusTone {
  switch (status) {
    case 'active': return 'success';
    case 'trialing': return 'warning';
    case 'past_due': return 'warning';
    case 'unpaid': return 'error';
    case 'incomplete': return 'warning';
    case 'incomplete_expired': return 'warning';
    case 'paused': return 'muted';
    case 'canceled': return 'muted';
    default: return 'muted';
  }
}

export function isProblemStatus(status: SubscriptionStatus | null): boolean {
  return status === 'past_due' || status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired';
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function intervalLabel(interval: 'month' | 'year' | null): string {
  if (interval === 'year') return 'Yearly';
  if (interval === 'month') return 'Monthly';
  return '—';
}

export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}