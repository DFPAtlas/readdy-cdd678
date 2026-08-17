import { Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';

interface AiConfigurationPanelProps {
  configured: boolean;
  providerLabel?: string | null;
  modelLabel?: string | null;
  keySuffix?: string | null;
}

export function AiConfigurationPanel({
  configured,
  providerLabel,
  modelLabel,
  keySuffix,
}: AiConfigurationPanelProps) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-forge-amber/10 text-forge-amber">
          <Cpu className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold text-forge-text-primary">AI Configuration</h2>
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-forge-text-muted">Provider</dt>
          <dd className="text-forge-text-primary font-medium text-right">
            {providerLabel ?? 'Not configured'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-forge-text-muted">Default model</dt>
          <dd className="text-forge-text-primary font-mono text-xs text-right">{modelLabel ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-forge-text-muted">Connection</dt>
          <dd>
            <Badge variant={configured ? 'success' : 'default'} size="sm">
              {configured ? 'Configured' : 'Not configured'}
            </Badge>
          </dd>
        </div>
        {keySuffix && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-forge-text-muted">API key</dt>
            <dd className="text-forge-text-primary font-mono text-xs text-right">{keySuffix}</dd>
          </div>
        )}
      </dl>

      <LinkButton to="/settings/providers" variant="secondary" size="sm" className="w-full mt-4 justify-center">
        Manage providers
      </LinkButton>
    </div>
  );
}