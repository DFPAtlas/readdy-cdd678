import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { FilePlus2 } from 'lucide-react';

const howItWorksHref = `${__BASE_PATH__.replace(/\/$/, '')}/#how-it-works`;

export function TemplatesFooterCta() {
  return (
    <div className="mt-8 rounded-lg border border-forge-border-subtle bg-forge-panel p-6 text-center">
      <h2 className="text-base font-semibold text-forge-text-primary">None of these fit?</h2>
      <p className="mt-1 text-sm text-forge-text-muted">Start blank and build around your own idea.</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <LinkButton to="/projects/new" variant="primary" size="md">
          <FilePlus2 className="h-3.5 w-3.5" />
          Create Blank Project
        </LinkButton>

        <a
          href={howItWorksHref}
          className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium whitespace-nowrap rounded-md text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-amber focus-visible:ring-offset-2 focus-visible:ring-offset-forge-bg"
        >
          How Forge Works
        </a>
      </div>
    </div>
  );
}