import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { integrationsApi, ENVIRONMENT_OPTIONS, type OAuthProvider, type IntegrationConnection } from '../forgeIntegrations';

type Props = {
  provider: OAuthProvider | null;
  connection: IntegrationConnection | null;
  open: boolean;
  onClose: () => void;
};

export function OAuthConnectModal({ provider, connection, open, onClose }: Props) {
  const isReconnect = !!connection;
  const [connectionName, setConnectionName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setConnectionName(isReconnect ? connection?.connection_name ?? '' : '');
    setEnvironment('production');
    setBusy(false);
    setError('');
  }, [open, connection, isReconnect]);

  if (!open || !provider) return null;

  const returnUrl = `${window.location.origin}${window.location.pathname}`;

  const start = async () => {
    if (busy) return;
    const name = connectionName.trim() || (isReconnect ? connection?.connection_name ?? provider.name : provider.name);
    if (!name.trim()) {
      setError('A connection name is required.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await integrationsApi.oauthStart({
      provider: provider.id,
      connectionName: name,
      environment,
      returnUrl,
      connectionId: isReconnect ? connection?.id : undefined,
    });
    setBusy(false);
    if (res.ok) {
      window.location.assign(res.data.url);
    } else {
      setError(res.message);
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" title={isReconnect ? `Reconnect ${provider.name}` : provider.connectLabel}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
          <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
            <i className="ri-user-star-line text-base" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-forge-text-primary">{provider.name}</p>
            <p className="text-[10px] text-forge-text-muted">{provider.service} · OAuth</p>
          </div>
        </div>

        <p className="text-xs text-forge-text-muted leading-relaxed">{provider.description}</p>

        <label className="block">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Connection name</span>
          <Input
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder={`e.g. Forge Main ${provider.name}`}
            autoComplete="off"
            className="w-full"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Environment</span>
          <Select value={environment} onChange={(e) => setEnvironment(e.target.value)} options={ENVIRONMENT_OPTIONS} className="w-full" />
        </label>

        {error && (
          <div className="rounded-md bg-forge-error/10 text-forge-error px-3 py-2 text-xs" role="status">{error}</div>
        )}

        <div className="rounded-md border border-forge-warning/30 bg-forge-warning/10 px-3 py-2.5">
          <p className="text-[11px] text-forge-text-secondary leading-relaxed">
            You will be redirected to {provider.name} to authorise this connection. Forge requests only the minimum permissions needed and never sees your password.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={start} loading={busy} icon={<i className="ri-external-link-line" />}>
            {isReconnect ? 'Continue' : `Continue to ${provider.name}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}