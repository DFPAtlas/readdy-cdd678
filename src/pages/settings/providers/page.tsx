import { useState } from 'react';
import { useProviders } from '@/hooks/useProviders';
import { configureProvider, disconnectProvider } from '@/services/providersService';
import type { AiProviderInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ProviderCard } from './components/ProviderCard';
import { ConfigureProviderModal } from './components/ConfigureProviderModal';
import { RefreshCw, Lock, ShieldCheck } from 'lucide-react';

function ProvidersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

export default function SettingsProvidersPage() {
  const { data, loading, error, retry, refresh, refreshing } = useProviders();
  const [configuring, setConfiguring] = useState<AiProviderInfo | null>(null);
  const [disconnecting, setDisconnecting] = useState<AiProviderInfo | null>(null);
  const [disconnectBusy, setDisconnectBusy] = useState(false);

  if (loading) return <ProvidersSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load AI providers"
        message="Something went wrong while loading your provider configuration. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to configure AI providers"
        description="You need to be signed in to manage the AI providers Forge can use."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  const handleConfigure = async (providerKey: string, apiKey: string) => {
    const res = await configureProvider(providerKey, apiKey);
    if (res.ok) await refresh();
    return res;
  };

  const handleDisconnect = async () => {
    if (!disconnecting) return;
    setDisconnectBusy(true);
    const res = await disconnectProvider(disconnecting.provider_key);
    setDisconnectBusy(false);
    setDisconnecting(null);
    if (res.ok) await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-forge-text-primary">AI Providers</h2>
          <p className="text-sm text-forge-text-muted mt-0.5 max-w-2xl">
            Configure the AI providers and models Forge can use for AI-assisted development.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          Refresh
        </Button>
      </div>

      <p className="text-xs text-forge-text-muted">
        {data.configuredCount} of {data.providers.length} providers configured
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {data.providers.map((info) => (
          <ProviderCard
            key={info.provider.id}
            info={info}
            onConfigure={setConfiguring}
            onDisconnect={setDisconnecting}
          />
        ))}
      </div>

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" />
        <p className="text-xs text-forge-text-muted leading-relaxed">
          Credentials are stored server-side and are never returned in full — only the last four characters are
          shown. Keys are used by Forge according to the configured provider integration.
        </p>
      </div>

      <ConfigureProviderModal
        provider={configuring}
        onClose={() => setConfiguring(null)}
        onConfigure={handleConfigure}
      />

      <ConfirmationModal
        open={disconnecting !== null}
        onClose={() => setDisconnecting(null)}
        onConfirm={() => void handleDisconnect()}
        title="Disconnect provider?"
        message={
          disconnecting
            ? `This removes the saved API key for ${disconnecting.display_name}. AI features that rely on this provider will stop working until it is reconfigured.`
            : ''
        }
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnectBusy}
      />
    </div>
  );
}