import type { StatusSnapshot } from '@/services/systemStatusService';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { StatusIndicator } from './StatusIndicator';
import { KeyRound, Cpu, Clock } from 'lucide-react';

export function AiProviderHealthSection({ snapshot }: { snapshot: StatusSnapshot }) {
  const configured = snapshot.providers.filter((p) => p.configured);

  return (
    <section aria-labelledby="ai-provider-title">
      <h2 id="ai-provider-title" className="text-sm font-semibold text-forge-text-primary mb-2">
        AI provider health
      </h2>

      <Card className="p-4">
        {!snapshot.supabaseConfigured ? (
          <NotConfigured />
        ) : !snapshot.authenticated ? (
          <p className="text-xs text-forge-text-muted leading-relaxed">
            Sign in to view your AI provider configuration and connection state.
          </p>
        ) : snapshot.registry.status === 'unavailable' ? (
          <div className="flex items-start gap-2">
            <StatusIndicator status="unavailable" />
            <p className="text-xs text-forge-text-muted leading-relaxed">
              The provider service could not be reached, so provider configuration cannot be verified right now.
            </p>
          </div>
        ) : configured.length === 0 ? (
          <NotConfigured />
        ) : (
          <div className="space-y-2">
            {configured.map((p) => (
              <div key={p.id} className="rounded-md border border-forge-border-subtle bg-forge-panel p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cpu className="h-4 w-4 text-forge-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-forge-text-primary truncate">{p.displayName}</p>
                      <p className="text-[11px] text-forge-text-muted">
                        {p.modelCount} enabled model{p.modelCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-forge-text-muted">
                    <KeyRound className="h-3.5 w-3.5 text-forge-success" aria-hidden="true" />
                    Configured{p.keySuffix ? ` · ${p.keySuffix}` : ''}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-forge-text-muted">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {p.lastHealthCheck
                    ? `Last verified ${new Date(p.lastHealthCheck).toLocaleString()}`
                    : 'Connection not verified'}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-forge-border-subtle flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-forge-text-muted">
            {snapshot.configuredCount} of {snapshot.providers.length || 0} providers configured
          </p>
          <LinkButton variant="secondary" size="sm" to="/settings/providers">
            Configure providers
          </LinkButton>
        </div>
      </Card>
    </section>
  );
}

function NotConfigured() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-forge-text-primary">Not configured</p>
        <p className="mt-0.5 text-xs text-forge-text-muted leading-relaxed max-w-xl">
          Configure an AI provider before using AI-assisted Forge features.
        </p>
      </div>
      <LinkButton variant="primary" size="sm" to="/settings/providers">
        Configure provider
      </LinkButton>
    </div>
  );
}