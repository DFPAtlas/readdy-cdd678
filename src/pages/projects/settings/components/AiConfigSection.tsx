import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Cpu } from 'lucide-react';

export function AiConfigSection() {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-md bg-forge-border flex items-center justify-center">
          <Cpu className="h-4 w-4 text-forge-text-secondary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-forge-text-primary">AI configuration is managed at workspace level</p>
          <p className="mt-1 text-xs text-forge-text-muted leading-relaxed">
            This project uses the AI providers and models configured for your whole Forge workspace. There is no
            project-specific AI override.
          </p>
          <div className="mt-3">
            <LinkButton to="/settings/providers" variant="secondary" size="sm">
              Manage AI Providers
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}