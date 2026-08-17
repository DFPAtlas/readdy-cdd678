import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { FilePlus2 } from 'lucide-react';

export function TemplatesHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-forge-amber">
          Starter Library
        </p>
        <h1 className="text-xl font-semibold text-forge-text-primary tracking-tight mt-1">
          Start with momentum
        </h1>
        <p className="mt-1 text-sm text-forge-text-secondary max-w-2xl">
          Choose a structured starting point or begin with a blank project. Every Forge project
          can evolve beyond where it started.
        </p>
      </div>
      <LinkButton to="/projects/new" variant="primary" size="sm" className="shrink-0">
        <FilePlus2 className="h-3.5 w-3.5" />
        Blank Project
      </LinkButton>
    </div>
  );
}