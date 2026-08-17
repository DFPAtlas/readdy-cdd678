import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { type IntegrationConnection, type OAuthProvider } from '../forgeIntegrations';
import { AgentAccessManager } from './AgentAccessManager';
import { EnvironmentBadge } from '@/pages/admin/components';

function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Props = {
  connection: IntegrationConnection | null;
  provider: OAuthProvider | null;
  open: boolean;
  onClose: () => void;
  onReconnect: () => void;
  onRevoke: () => void;
  revoking: boolean;
  onChanged: () => void;
};

export function ManageOAuthModal({ connection, provider, open, onClose, onReconnect, onRevoke, revoking, onChanged }: Props) {
  if (!open || !connection || !provider) return null;

  const expired = connection.oauth_expires_at && new Date(connection.oauth_expires_at).getTime() < Date.now();

  return (
    <Modal open onClose={onClose} size="lg" title={`Manage ${provider.name} connection`}>
      <div className="space-y-5">
        {/* Account */}
        <div className="flex items-center gap-3">
          {connection.account_avatar_url ? (
            <img src={connection.account_avatar_url} alt={`${connection.account_name ?? 'Account'} avatar`} className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
              <i className="ri-user-3-line text-base" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forge-text-primary truncate">{connection.account_name ?? 'Unknown account'}</p>
            {connection.account_email && <p className="text-xs text-forge-text-muted truncate">{connection.account_email}</p>}
          </div>
          <span className="ml-auto shrink-0"><EnvironmentBadge environment={connection.environment} /></span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2">
            <p className="text-forge-text-muted">Connected</p>
            <p className="text-forge-text-primary font-medium mt-0.5">{formatDay(connection.connected_at)}</p>
          </div>
          <div className="rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2">
            <p className="text-forge-text-muted">Last refreshed</p>
            <p className="text-forge-text-primary font-medium mt-0.5">{formatDay(connection.updated_at)}</p>
          </div>
        </div>

        {expired && (
          <div className="rounded-md border border-forge-warning/30 bg-forge-warning/10 px-3 py-2.5 text-xs text-forge-warning" role="status">
            This provider needs to be reconnected. Its access token has expired.
          </div>
        )}

        {/* Authorised permissions */}
        <div>
          <p className="text-xs font-semibold text-forge-text-primary mb-2">Authorised permissions</p>
          <ul className="space-y-1.5">
            {provider.granted.map((g) => (
              <li key={g} className="flex items-center gap-2 text-xs text-forge-text-secondary">
                <i className="ri-check-line text-forge-success text-sm" />
                {g}
              </li>
            ))}
            {provider.denied.map((d) => (
              <li key={d} className="flex items-center gap-2 text-xs text-forge-text-muted">
                <i className="ri-close-line text-forge-text-muted text-sm" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        {/* Agent & Service Access */}
        <div className="border-t border-forge-border-subtle pt-4">
          <p className="text-xs font-semibold text-forge-text-primary mb-1">Agent &amp; Service Access</p>
          <p className="text-[11px] text-forge-text-muted mb-3">Control which Forge agents and internal services are authorised to use this connection.</p>
          <AgentAccessManager connection={connection} onChanged={onChanged} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-forge-border-subtle">
          <Button size="sm" variant="secondary" onClick={onReconnect} icon={<i className="ri-refresh-line" />}>
            Reconnect {provider.name}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" className="text-forge-error hover:text-forge-error" onClick={onRevoke} loading={revoking} icon={<i className="ri-links-line" />}>
            Revoke access
          </Button>
        </div>
      </div>
    </Modal>
  );
}