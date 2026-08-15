import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SiteAuthEvent } from '../membersTypes';

type Props = {
  events: SiteAuthEvent[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
};

function eventLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActivitySection({ events, loading, error, onRefresh }: Props) {
  if (loading) return <div className="flex items-center justify-center py-16"><Spinner /></div>;
  if (error) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState title="Couldn't load activity" description={error} action={<Button size="sm" onClick={onRefresh}>Retry</Button>} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState
          icon={<Activity className="h-8 w-8" />}
          title="No activity yet"
          description="Sign-ups, logins, password resets and other authentication events will appear here."
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-forge-border-subtle bg-forge-bg/40">
            <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Event</th>
            <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Details</th>
            <th className="text-right px-4 py-2 font-medium text-forge-text-muted">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forge-border-subtle">
          {events.map((e) => (
            <tr key={e.id} className="hover:bg-forge-hover/40 transition-colors">
              <td className="px-4 py-2.5 font-medium text-forge-text-primary">{eventLabel(e.eventType)}</td>
              <td className="px-4 py-2.5 text-forge-text-muted">
                {Object.keys(e.safeMetadata).length > 0
                  ? Object.entries(e.safeMetadata).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-right text-forge-text-muted whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}