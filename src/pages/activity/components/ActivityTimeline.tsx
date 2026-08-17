import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderPlus,
  Hammer,
  GitBranch,
  Package,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  formatRelativeTime,
  type ActivityEvent,
  type ActivityKind,
  type ActivityStatus,
} from '@/services/activityService';

const kindMeta: Record<ActivityKind, { icon: LucideIcon; tint: string; bg: string }> = {
  project: { icon: FolderPlus, tint: 'text-forge-amber', bg: 'bg-forge-amber/10' },
  build: { icon: Hammer, tint: 'text-forge-accent', bg: 'bg-forge-accent/10' },
  version: { icon: GitBranch, tint: 'text-forge-success', bg: 'bg-forge-success/10' },
  export: { icon: Package, tint: 'text-forge-warning', bg: 'bg-forge-warning/10' },
  ai: { icon: Bot, tint: 'text-forge-agent', bg: 'bg-forge-agent/10' },
};

const statusMeta: Record<ActivityStatus, { icon: LucideIcon; tint: string; label: string }> = {
  success: { icon: CheckCircle2, tint: 'text-forge-success', label: 'Completed' },
  running: { icon: Loader2, tint: 'text-forge-accent', label: 'Running' },
  failed: { icon: XCircle, tint: 'text-forge-error', label: 'Failed' },
  info: { icon: Info, tint: 'text-forge-text-muted', label: 'Info' },
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDay) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface ActivityEventRowProps {
  event: ActivityEvent;
}

function ActivityEventRow({ event }: ActivityEventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const kind = kindMeta[event.kind];
  const status = statusMeta[event.status];
  const KindIcon = kind.icon;
  const StatusIcon = status.icon;
  const hasDetails = event.details.length > 0;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${kind.bg} ${kind.tint}`}>
          <KindIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-forge-text-primary">{event.title}</span>
            <span className={`inline-flex items-center gap-1 text-xs ${status.tint}`}>
              <StatusIcon className={`h-3 w-3 ${event.status === 'running' ? 'animate-spin' : ''}`} />
              {status.label}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-forge-text-muted truncate">{event.description}</p>

          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-forge-text-muted">
            {event.projectName && event.projectId && (
              <>
                <Link
                  to={`/projects/${event.projectId}/overview`}
                  className="text-forge-amber hover:text-forge-amber/80 transition-colors"
                >
                  {event.projectName}
                </Link>
                <span aria-hidden="true">·</span>
              </>
            )}
            {event.actor && (
              <>
                <span>{event.actor}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <time dateTime={event.timestamp}>{formatRelativeTime(event.timestamp)}</time>
          </div>
        </div>

        {event.actionHref && event.actionLabel && (
          <Link
            to={event.actionHref}
            className="shrink-0 text-xs font-medium text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover px-2 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            {event.actionLabel}
          </Link>
        )}
      </div>

      {hasDetails && (
        <div className="mt-2 ml-11">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`activity-details-${event.id}`}
            className="inline-flex items-center gap-1 text-xs text-forge-text-secondary hover:text-forge-text-primary transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Hide details' : 'View details'}
          </button>

          {expanded && (
            <dl
              id={`activity-details-${event.id}`}
              className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {event.details.map((d) => (
                <div key={d.label} className="bg-forge-bg rounded-md px-2.5 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-forge-text-muted">{d.label}</dt>
                  <dd className="mt-0.5 text-xs text-forge-text-primary break-words">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

interface ActivityTimelineProps {
  activity: ActivityEvent[];
}

export function ActivityTimeline({ activity }: ActivityTimelineProps) {
  const groups: { label: string; events: ActivityEvent[] }[] = [];

  for (const event of activity) {
    const label = dayLabel(event.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return (
    <div className="bg-forge-panel border border-forge-border-subtle rounded-lg overflow-hidden">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-forge-text-muted border-b border-forge-border-subtle">
            {group.label}
          </h3>
          <ul className="divide-y divide-forge-border-subtle">
            {group.events.map((event) => (
              <ActivityEventRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}