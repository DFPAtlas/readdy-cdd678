import { Activity } from 'lucide-react';
import type { MembershipEvent } from '@/services/projectMembersService';

const EVENT_LABELS: Record<string, string> = {
  member_invited: 'invited a member',
  member_joined: 'joined the project',
  member_removed: 'removed a member',
  role_changed: 'changed a role',
};

type Props = {
  events: MembershipEvent[];
};

export function MembersActivity({ events }: Props) {
  if (events.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Recent activity</h3>
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel divide-y divide-forge-border-subtle">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <Activity className="h-3.5 w-3.5 text-forge-text-muted flex-shrink-0" />
            <p className="text-xs text-forge-text-secondary min-w-0">
              <span className="font-medium text-forge-text-primary">{e.actorName}</span>{' '}
              {EVENT_LABELS[e.eventType] ?? e.eventType}
            </p>
            <span className="ml-auto text-[10px] text-forge-text-muted whitespace-nowrap">
              {new Date(e.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}