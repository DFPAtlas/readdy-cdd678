import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfigureProviderModal } from '@/pages/settings/providers/components/ConfigureProviderModal';
import type { AiProviderInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';
import type { ProvidersData } from '@/services/providersService';
import { Cpu, CheckCircle2 } from 'lucide-react';

interface AiStatusStepProps {
  data: ProvidersData;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onConfigure: (providerKey: string, apiKey: string) => Promise<{ ok: boolean; message: string }>;
}

export function AiStatusStep({ data, loading, error, onRetry, onConfigure }: AiStatusStepProps) {
  const [configuring, setConfiguring] = useState<AiProviderInfo | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Unable to load AI status" onRetry={onRetry} />;
  }

  const configured = data.providers.filter((p) => p.configured);

  return (
    <div>
      <div
        className={`rounded-md border px-3 py-2.5 mb-4 flex items-start gap-2 ${
          configured.length > 0
            ? 'bg-forge-success/10 border-forge-success/20'
            : 'bg-forge-bg border-forge-border-subtle'
        }`}
      >
        <Cpu
          className={`h-4 w-4 mt-0.5 shrink-0 ${
            configured.length > 0 ? 'text-forge-success' : 'text-forge-text-muted'
          }`}
        />
        <div>
          <p className="text-sm font-medium text-forge-text-primary">
            {configured.length > 0
              ? `${configured.length} provider${configured.length === 1 ? '' : 's'} configured`
              : 'No AI provider configured yet'}
          </p>
          <p className="text-xs text-forge-text-muted mt-0.5">
            {configured.length > 0
              ? 'Forge can use AI-assisted development right away.'
              : 'AI is optional. You can continue without it and configure later from Settings.'}
          </p>
        </div>
      </div>

      <p className="text-xs font-medium text-forge-text-muted mb-2">Available providers</p>
      <div className="rounded-md border border-forge-border-subtle divide-y divide-forge-border-subtle">
        {data.providers.map((info) => {
          const { provider, configured: isConfigured, keySuffix } = info;
          return (
            <div key={provider.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-forge-text-primary">{provider.display_name}</span>
                  {isConfigured ? (
                    <span className="inline-flex items-center gap-1 text-xs text-forge-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                    </span>
                  ) : (
                    <span className="text-xs text-forge-text-muted">Not configured</span>
                  )}
                </div>
                {isConfigured && keySuffix && (
                  <p className="text-xs text-forge-text-muted mt-0.5">Key ending in {keySuffix}</p>
                )}
              </div>
              {!isConfigured && (
                <Button size="sm" variant="secondary" onClick={() => setConfiguring(provider)}>
                  Configure
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <ConfigureProviderModal
        provider={configuring}
        onClose={() => setConfiguring(null)}
        onConfigure={onConfigure}
      />
    </div>
  );
}