import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Trash2, Plug, RefreshCw, FlaskConical } from 'lucide-react';
import type { WorkflowConnection, ConnectionType, ConnectionStatus } from '../workflowTypes';
import { CONNECTION_TYPES } from '../workflowTypes';
import { listConnections, createConnection, updateConnection, deleteConnection } from '../workflowData';

export function ConnectionsSection({ projectId, role, onRefresh }: {
  projectId: string;
  role: string | null;
  onRefresh: () => void;
}) {
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<ConnectionType>('resend');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WorkflowConnection | null>(null);

  const canManage = role === 'owner' || role === 'admin';

  const refresh = async () => {
    setLoading(true);
    setConnections(await listConnections(projectId));
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [projectId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createConnection(projectId, { connectionType: type, displayName: name });
    setName('');
    setShowCreate(false);
    await refresh();
    await onRefresh();
  };

  const toggle = async (c: WorkflowConnection) => {
    await updateConnection(c.id, { status: c.status === 'enabled' ? 'disabled' : 'enabled' });
    await refresh();
  };

  const typeLabel = (t: ConnectionType) => CONNECTION_TYPES.find((x) => x.value === t)?.label ?? t;

  if (loading) return <div className="py-16 flex justify-center"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-forge-text-muted">Credentials are encrypted and stored server-side — they are never shown here.</p>
        {canManage && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>Add connection</Button>}
      </div>

      {connections.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState icon={<Plug className="h-8 w-8" />} title="No connections" description="Add a Resend, n8n, Slack, webhook or custom API connection to power your actions." />
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.id} className="rounded-lg border border-forge-border-subtle bg-forge-panel p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-forge-text-primary">{c.displayName}</span>
                  <Badge variant={c.status === 'enabled' ? 'success' : c.status === 'error' ? 'error' : 'default'}>{c.status}</Badge>
                </div>
                <p className="text-xs text-forge-text-muted mt-0.5">{typeLabel(c.connectionType)} · credentials masked (••••••••)</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" icon={<FlaskConical className="h-3.5 w-3.5" />} onClick={() => setNote('Connection testing ships with the execution engine — server-side validation is pending.')}>Test</Button>
                <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setNote('Credential rotation ships with the execution engine — no secrets are stored client-side.')}>Rotate</Button>
                {canManage && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => toggle(c)}>{c.status === 'enabled' ? 'Disable' : 'Enable'}</Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} className="text-forge-error" onClick={() => setDeleteTarget(c)}>Delete</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {note && (
        <div className="mt-3 px-3 py-2 rounded-md bg-forge-accent/10 text-forge-accent text-xs">{note}</div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add connection">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-forge-text-secondary mb-1">Type</label>
            <Select options={CONNECTION_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={type} onChange={(e) => setType(e.target.value as ConnectionType)} className="w-full" />
            <p className="text-[11px] text-forge-text-muted mt-1">{CONNECTION_TYPES.find((t) => t.value === type)?.description}</p>
          </div>
          <div>
            <label className="block text-xs text-forge-text-secondary mb-1">Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Resend" autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim()}>Add connection</Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deleteConnection(deleteTarget.id); setDeleteTarget(null); await refresh(); } }}
        title="Delete connection"
        message={`Delete "${deleteTarget?.displayName}"? Any workflow using it will fail until remapped.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}