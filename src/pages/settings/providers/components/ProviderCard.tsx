import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AiProviderInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';
import type { ProviderConnectionInfo } from '@/services/providersService';
import { Plug, PlugZap } from 'lucide-react';

const CLASSIFICATION_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  local: 'Local',
  self_hosted: 'Self-hosted',
};

function formatContext(ctx: number | null): string {
  if (!ctx) return '';
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}k`;
  return `${ctx}`;
}

interface ProviderCardProps {
  info: ProviderConnectionInfo;
  onConfigure: (provider: AiProviderInfo) => void;
  onDisconnect: (provider: AiProviderInfo) => void;
}

export function ProviderCard({ info, onConfigure, onDisconnect }: ProviderCardProps) {
  const { provider, models, keySuffix, configured } = info;
  const classification =
    CLASSIFICATION_LABELS[provider.data_classification] ?? provider.data_classification;

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center justify-center h-9 w-9 rounded-md bg-forge-border text-forge-text-secondary shrink-0">
            <Plug className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-forge-text-primary">{provider.display_name}</h3>
              <Badge variant="default" size="sm">{classification}</Badge>
              <Badge variant={configured ? 'success' : 'default'} size="sm">
                {configured ? 'Configured' : 'Not configured'}
              </Badge>
            </div>
            <p className="text-xs font-mono text-forge-text-muted mt-0.5">{provider.provider_key}</p>
            {configured && keySuffix && (
              <p className="text-xs text-forge-text-muted mt-0.5">API key ending in {keySuffix}</p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {configured ? (
            <Button variant="ghost" size="sm" onClick={() => onDisconnect(provider)}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" icon={<PlugZap className="h-3.5 w-3.5" />} onClick={() => onConfigure(provider)}>
              Configure
            </Button>
          )}
        </div>
      </div>

      {provider.base_url && (
        <p className="text-xs font-mono text-forge-text-muted mt-3">{provider.base_url}</p>
      )}

      {models.length > 0 && (
        <div className="mt-3 pt-3 border-t border-forge-border-subtle">
          <p className="text-xs font-medium text-forge-text-muted mb-2">
            {models.length} model{models.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-forge-bg border border-forge-border text-xs"
              >
                <span className="font-mono text-forge-text-primary">{m.model_key}</span>
                {m.context_window ? (
                  <span className="text-forge-text-muted">{formatContext(m.context_window)}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}