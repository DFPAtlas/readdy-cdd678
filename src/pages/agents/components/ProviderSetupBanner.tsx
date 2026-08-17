import { AlertTriangle } from 'lucide-react';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';

export function ProviderSetupBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-forge-amber/25 bg-forge-amber/5 p-4">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber shrink-0 mt-0.5">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-forge-text-primary">AI provider setup required</h2>
          <p className="mt-0.5 text-sm text-forge-text-secondary">
            Configure a supported provider before using AI-assisted Forge features.
          </p>
        </div>
      </div>
      <LinkButton to="/settings/providers" variant="primary" size="sm" className="shrink-0">
        Configure AI Provider
      </LinkButton>
    </div>
  );
}