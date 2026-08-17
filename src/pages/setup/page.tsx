import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '@/hooks/useProviders';
import { configureProvider, disconnectProvider } from '@/services/providersService';
import type { AiProviderInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProviderCard } from '@/pages/settings/providers/components/ProviderCard';
import { ConfigureProviderModal } from '@/pages/settings/providers/components/ConfigureProviderModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Zap, Cpu, Database, ArrowRight } from 'lucide-react';

export default function SetupPage() {
  const navigate = useNavigate();
  const { data, loading, error, retry, refresh } = useProviders();
  const [configuring, setConfiguring] = useState<AiProviderInfo | null>(null);
  const [disconnecting, setDisconnecting] = useState<AiProviderInfo | null>(null);
  const [disconnectBusy, setDisconnectBusy] = useState(false);

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
    <div className="min-h-screen bg-forge-bg flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="h-5 w-5 text-forge-amber" />
          <span className="text-base font-bold text-forge-text-primary">FORGE</span>
        </div>

        <p className="text-xs font-semibold tracking-widest text-forge-amber uppercase mb-2">Setup</p>
        <h1 className="text-2xl font-bold text-forge-text-primary">Set up Forge</h1>
        <p className="text-sm text-forge-text-muted mt-1 max-w-xl">
          Configure the essentials Forge needs before you begin building. AI is optional — you can change
          it anytime from Settings.
        </p>

        <div className="mt-8 space-y-4">
          <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-forge-amber" />
              <h2 className="text-sm font-semibold text-forge-text-primary">AI provider</h2>
            </div>
            <p className="text-xs text-forge-text-muted mb-4">
              Connect a provider so Forge can use AI-assisted development. Skipping is fine — features that
              need AI will prompt you to configure later.
            </p>

            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : error ? (
              <ErrorState title="Unable to load AI providers" onRetry={retry} />
            ) : (
              <>
                <p className="text-xs text-forge-text-muted mb-3">
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
              </>
            )}
          </section>

          <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5 flex items-start gap-3">
            <Database className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-forge-text-primary">Workspace &amp; data</h2>
              <p className="text-xs text-forge-text-muted mt-1 leading-relaxed">
                Your workspace, database and storage are provisioned automatically when you create your first
                project — nothing to configure here.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex items-center gap-3 justify-end">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Set up later
          </Button>
          <Button
            onClick={() => navigate('/onboarding')}
            icon={<ArrowRight className="h-4 w-4" />}
            iconPosition="right"
          >
            Continue
          </Button>
        </div>
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