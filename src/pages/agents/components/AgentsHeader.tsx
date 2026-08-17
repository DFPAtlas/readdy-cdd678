import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { SlidersHorizontal } from 'lucide-react';

export function AgentsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-forge-amber">
          AI Workspace
        </p>
        <h1 className="text-xl font-semibold text-forge-text-primary tracking-tight mt-1">
          Agents
        </h1>
        <p className="mt-1 text-sm text-forge-text-secondary">
          Manage the AI capabilities that help plan, build, review and refine Forge projects.
        </p>
      </div>
      <LinkButton to="/settings/providers" variant="secondary" size="sm" className="shrink-0">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        AI Provider Settings
      </LinkButton>
    </div>
  );
}