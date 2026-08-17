import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hammer, CheckCircle2, AlertTriangle, XCircle, Info, Bot, Trash2, CheckCheck, Folder,
} from 'lucide-react';
import { useNotificationStore } from '@/stores/index';
import type { Notification } from '@/types';

const typeConfig: Record<Notification['type'], { icon: typeof Info; className: string }> = {
  build: { icon: Hammer, className: 'text-forge-amber' },
  success: { icon: CheckCircle2, className: 'text-forge-success' },
  warning: { icon: AlertTriangle, className: 'text-forge-warning' },
  error: { icon: XCircle, className: 'text-forge-error' },
  info: { icon: Info, className: 'text-forge-accent' },
  agent: { icon: Bot, className: 'text-forge-agent' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const unreadFirst = (arr: Notification[]): Notification[] =>
  [...arr].sort((a, b) => Number(a.isRead) - Number(b.isRead));

interface NotificationsPopoverProps {
  trigger: React.ReactNode;
  projectId?: string;
  projectName?: string;
}

export function NotificationsPopover({ trigger, projectId, projectName }: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClickNotification = (n: Notification) => {
    markAsRead(n.id);
    if (n.projectId) {
      setOpen(false);
      navigate(`/projects/${n.projectId}/overview`);
    }
  };

  const isScoped = Boolean(projectId);
  const contextual = isScoped ? notifications.filter((n) => n.projectId === projectId) : [];
  const others = isScoped ? notifications.filter((n) => n.projectId !== projectId) : notifications;

  const allSorted = unreadFirst(notifications);
  const contextualSorted = unreadFirst(contextual);
  const othersSorted = unreadFirst(others);

  const renderItem = (n: Notification) => {
    const { icon: Icon, className } = typeConfig[n.type] ?? typeConfig.info;
    const isUnread = !n.isRead;
    return (
      <button
        key={n.id}
        onClick={() => handleClickNotification(n)}
        className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-forge-hover transition-colors border-b border-forge-border-subtle ${
          isUnread ? 'bg-forge-bg/40' : 'opacity-70'
        }`}
      >
        <span className={`mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center ${className}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${isUnread ? 'font-medium text-forge-text-primary' : 'text-forge-text-secondary'}`}>
              {n.title}
            </span>
            <span className="flex-shrink-0 text-[10px] text-forge-text-muted">{timeAgo(n.createdAt)}</span>
          </span>
          <span className={`block text-xs mt-0.5 line-clamp-2 ${isUnread ? 'text-forge-text-secondary' : 'text-forge-text-muted'}`}>
            {n.message}
          </span>
        </span>
        <span className="flex-shrink-0 self-center">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
            className="w-6 h-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error hover:bg-forge-error/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
    );
  };

  const sectionLabel = (text: string, bordered = false) => (
    <div
      className={`px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted ${
        bordered ? 'border-t border-forge-border-subtle' : ''
      }`}
    >
      {text}
    </div>
  );

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-[360px] bg-forge-panel-elevated border border-forge-border rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-forge-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-forge-amber text-[10px] font-semibold text-forge-text-inverse">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-forge-text-secondary hover:text-forge-text-primary transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Context banner */}
          {isScoped && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-forge-border-subtle bg-forge-bg/40">
              <Folder className="h-3.5 w-3.5 text-forge-accent" />
              <span className="text-xs text-forge-text-secondary">Scoped to</span>
              <span className="text-xs font-medium text-forge-text-primary truncate">
                {projectName ?? 'This project'}
              </span>
            </div>
          )}

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Info className="h-8 w-8 text-forge-text-muted" />
                <p className="text-sm text-forge-text-muted">You're all caught up.</p>
              </div>
            )}

            {isScoped ? (
              <>
                {contextualSorted.length > 0 && sectionLabel('This project')}
                {contextualSorted.map(renderItem)}
                {contextualSorted.length === 0 && (
                  <div className="px-4 py-3 text-xs text-forge-text-muted">No notifications for this project.</div>
                )}
                {othersSorted.length > 0 && sectionLabel('Other notifications', contextualSorted.length > 0)}
                {othersSorted.map(renderItem)}
              </>
            ) : (
              allSorted.map(renderItem)
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <button
              onClick={() => setOpen(false)}
              className="w-full px-4 py-2.5 text-center text-xs text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors border-t border-forge-border-subtle"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}