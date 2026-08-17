import { LinkButton } from './LinkButton';
import { Plus, FolderKanban } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface DashboardHeaderProps {
  userName: string | null;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const greeting = getGreeting();

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-forge-text-primary tracking-tight">
          {greeting}
          {userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-forge-text-secondary">Your Forge workspace</p>
        <p className="mt-0.5 text-xs text-forge-text-muted">
          Continue building, review recent activity, or start something new.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <LinkButton to="/projects" variant="secondary" size="sm">
          <FolderKanban className="h-3.5 w-3.5" />
          View Projects
        </LinkButton>
        <LinkButton to="/projects/new" variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5" />
          New Project
        </LinkButton>
      </div>
    </div>
  );
}