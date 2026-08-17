import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { FilePlus2 } from 'lucide-react';

export function BlankProjectCard() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-dashed border-forge-border bg-forge-panel/60 p-4 sm:p-5">
      <div className="h-11 w-11 rounded-lg bg-forge-amber/10 text-forge-amber flex items-center justify-center shrink-0">
        <FilePlus2 className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-forge-text-primary">Start from scratch</h2>
        <p className="mt-0.5 text-xs text-forge-text-muted">
          Begin with an empty Forge project and shape the structure around exactly what you want
          to build.
        </p>
      </div>

      <LinkButton to="/projects/new" variant="primary" size="sm" className="shrink-0">
        Create Blank Project
      </LinkButton>
    </div>
  );
}