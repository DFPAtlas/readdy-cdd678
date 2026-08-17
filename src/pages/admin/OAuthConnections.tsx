import { useState } from 'react';
import { integrationsApi, type OAuthProvider, type IntegrationConnection } from './forgeIntegrations';
import { StatusPill, EnvironmentBadge } from './components';
import { OAuthConnectModal } from './components/OAuthConnectModal';
import { ManageOAuthModal } from './components/ManageOAuthModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function displayStatus(conn: IntegrationConnection): string {
  const expired = conn.oauth_expires_at && new Date(conn.oauth_expires_at).getTime() < Date.now();
  if (conn.status === 'connected' && expired) return 'attention';
  return conn.status;
}

type Props = {
  providers: OAuthProvider[];
  connections: IntegrationConnection[];
  canManage: boolean;
  onChanged: () => void;
};

export function OAuthConnections({ providers, connections, canManage, onChanged }: Props) {
  const [connectProvider, setConnectProvider] = useState<OAuthProvider | null>(null);
  const [reconnectConnection, setReconnectConnection] = useState<IntegrationConnection | null>(null);
  const [manageConnection, setManageConnection] = useState<IntegrationConnection | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<IntegrationConnection | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [feedback, setFeedback] = useState('');

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  const providerOf = (conn: IntegrationConnection) => providers.find((p) => p.id === conn.provider_id) ?? null;

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setFeedback('');
    const res = await integrationsApi.oauthRevoke(revokeTarget.id, revokeTarget.environment === 'production');
    setRevoking(false);
    setRevokeTarget(null);
    setManageConnection(null);
    if (res.ok) {
      onChanged();
    } else {
      setFeedback(res.message);
    }
  };

  return (
    <div className="space-y-3">
      {feedback && <p className="text-xs text-forge-error">{feedback}</p>}

      {providers.length === 0 && (
        <p className="text-xs text-forge-text-muted">OAuth providers are unavailable right now.</p>
      )}

      {providers.map((provider) => {
        const conns = connections.filter((c) => c.provider_id === provider.id);
        return (
          <Card key={provider.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
                <i className="ri-user-star-line text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-forge-text-primary">{provider.name}</h4>
                  <span className="text-[10px] text-forge-text-muted">{provider.service}</span>
                </div>
                <p className="text-xs text-forge-text-muted mt-0.5">{provider.description}</p>
              </div>
              <div className="shrink-0">
                {canManage && (
                  provider.configured ? (
                    <Button
                      size="sm"
                      variant={conns.length ? 'secondary' : 'primary'}
                      onClick={() => setConnectProvider(provider)}
                      icon={<i className="ri-plug-line" />}
                    >
                      {conns.length ? 'Add another' : provider.connectLabel}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-forge-text-muted" title="Add the client ID and secret to enable this provider">
                      <i className="ri-information-line" />
                      Not configured
                    </span>
                  )
                )}
              </div>
            </div>

            {conns.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-forge-border-subtle">
                {conns.map((conn) => {
                  const expired = conn.oauth_expires_at && new Date(conn.oauth_expires_at).getTime() < Date.now();
                  return (
                    <div key={conn.id} className="flex items-center gap-3 rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
                      {conn.account_avatar_url ? (
                        <img src={conn.account_avatar_url} alt={`${conn.account_name ?? 'Account'} avatar`} className="h-8 w-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
                          <i className="ri-user-3-line text-sm" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-forge-text-primary truncate">{conn.connection_name}</span>
                          <StatusPill status={displayStatus(conn)} />
                          <EnvironmentBadge environment={conn.environment} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-forge-text-muted mt-0.5 flex-wrap">
                          {conn.account_name && <span className="truncate">{conn.account_name}</span>}
                          {conn.account_email && <span className="truncate">{conn.account_email}</span>}
                          <span>Connected {formatDay(conn.connected_at)}</span>
                        </div>
                        {expired && <p className="text-[10px] text-forge-warning mt-0.5">This provider needs to be reconnected.</p>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setManageConnection(conn)}>Manage</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReconnectConnection(conn)}>Reconnect</Button>
                          <Button size="sm" variant="ghost" className="text-forge-error hover:text-forge-error" onClick={() => setRevokeTarget(conn)}>Revoke</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      <OAuthConnectModal
        provider={connectProvider ?? (reconnectConnection ? providerOf(reconnectConnection) : null)}
        connection={reconnectConnection}
        open={connectProvider !== null || reconnectConnection !== null}
        onClose={() => { setConnectProvider(null); setReconnectConnection(null); }}
      />

      <ManageOAuthModal
        connection={manageConnection}
        provider={manageConnection ? providerOf(manageConnection) : null}
        open={manageConnection !== null}
        onClose={() => setManageConnection(null)}
        onReconnect={() => { const c = manageConnection; setManageConnection(null); setReconnectConnection(c); }}
        onRevoke={() => setRevokeTarget(manageConnection)}
        revoking={revoking}
        onChanged={onChanged}
      />

      <ConfirmationModal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void handleRevoke()}
        title={`Revoke ${revokeTarget ? providerName(revokeTarget.provider_id) : ''} access?`}
        message={revokeTarget?.environment === 'production'
          ? `You are changing a production integration. Forge agents and services using ${revokeTarget?.connection_name ?? 'this connection'} will immediately lose access.`
          : `Forge agents and services using ${revokeTarget?.connection_name ?? 'this connection'} will immediately lose access.`}
        confirmLabel="Revoke access"
        cancelLabel="Cancel"
        variant="danger"
        loading={revoking}
      />
    </div>
  );
}