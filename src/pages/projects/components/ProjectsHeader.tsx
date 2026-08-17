import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Plus } from 'lucide-react';

export function ProjectsHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-forge-amber">Workspace</p>
        <h1 className="text-xl font-semibold text-forge-text-primary tracking-tight mt-1">Projects</h1>
        <p className="mt-1 text-sm text-forge-text-secondary">
          Create, organise and continue everything you&apos;re building with Forge.
        </p>
      </div>
      <LinkButton to="/projects/new" variant="primary" size="sm" className="shrink-0">
        <Plus className="h-3.5 w-3.5" />
        New Project
      </LinkButton>
    </div>
  );
}