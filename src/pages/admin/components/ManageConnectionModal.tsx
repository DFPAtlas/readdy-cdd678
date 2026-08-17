import { Modal } from '@/components/ui/Modal';
import { AgentAccessManager } from './AgentAccessManager';
import { type IntegrationConnection } from '../forgeIntegrations';

type Props = {
  connection: IntegrationConnection | null;
  providerName: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ManageConnectionModal({ connection, providerName, open, onClose, onChanged }: Props) {
  if (!open || !connection) return null;
  return (
    <Modal open onClose={onClose} size="lg" title={`Manage ${providerName} connection`}>
      <div className="space-y-4">
        <div className="rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-forge-text-primary">{connection.connection_name}</span>
            <span className="text-[10px] text-forge-text-muted capitalize">{connection.environment}</span>
          </div>
          {connection.secret_suffix && (
            <p className="text-[11px] text-forge-text-muted mt-0.5">
              Credential ends in <span className="font-mono text-forge-text-secondary">••••{connection.secret_suffix}</span>
            </p>
          )}
        </div>

        <div className="border-t border-forge-border-subtle pt-3">
          <p className="text-xs font-semibold text-forge-text-primary mb-1">Agent &amp; Service Access</p>
          <p className="text-[11px] text-forge-text-muted mb-3">Control which Forge agents and internal services are authorised to use this connection.</p>
          <AgentAccessManager connection={connection} onChanged={onChanged} />
        </div>
      </div>
    </Modal>
  );
}