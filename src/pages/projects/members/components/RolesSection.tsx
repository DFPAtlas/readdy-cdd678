import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SiteRole } from '../membersTypes';
import { createRole, updateRole, deleteRole } from '../membersData';

type Props = {
  projectId: string;
  roles: SiteRole[];
  canManage: boolean;
  onRefresh: () => Promise<void>;
};

export function RolesSection({ projectId, roles, canManage, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SiteRole | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteRole | null>(null);
  const [name, setName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toKey = (input: string) => input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const openCreate = () => {
    setName(''); setRoleKey(''); setDescription(''); setError(''); setEditing(null); setShowCreate(true);
  };

  const openEdit = (role: SiteRole) => {
    setName(role.name); setRoleKey(role.roleKey); setDescription(role.description); setError(''); setEditing(role); setShowCreate(true);
  };

  const submit = async () => {
    if (!name.trim()) { setError('Enter a role name.'); return; }
    const key = editing ? editing.roleKey : toKey(roleKey || name);
    if (!key) { setError('Role key cannot be empty.'); return; }
    setBusy(true);
    setError('');
    const res = editing
      ? await updateRole(editing.id, { name: name.trim(), description: description.trim() })
      : await createRole(projectId, { roleKey: key, name: name.trim(), description: description.trim() });
    setBusy(false);
    if (res.ok) {
      setShowCreate(false);
      await onRefresh();
    } else {
      setError(res.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-forge-text-muted">Roles control access to protected pages and member-only content. Role keys stay stable even if you rename the role.</p>
        {canManage && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>New role</Button>}
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            icon={<Shield className="h-8 w-8" />}
            title="No roles yet"
            description="Create roles like Member, Customer, Subscriber or Staff, then assign them to members."
            action={canManage ? <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>New role</Button> : undefined}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel divide-y divide-forge-border-subtle">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-forge-text-primary">{r.name}</span>
                  <code className="text-[10px] font-mono text-forge-text-muted bg-forge-bg px-1.5 py-0.5 rounded">{r.roleKey}</code>
                </div>
                {r.description && <p className="text-xs text-forge-text-muted truncate">{r.description}</p>}
              </div>
              {canManage && (
                <div className="flex items-center gap-0.5">
                  <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors" onClick={() => openEdit(r)} aria-label="Edit role">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error hover:bg-forge-hover transition-colors" onClick={() => setConfirmDelete(r)} aria-label="Delete role">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal open onClose={() => setShowCreate(false)} title={editing ? 'Edit role' : 'New role'} size="sm">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium member" />
            </div>
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Role key</label>
                <Input value={roleKey} onChange={(e) => setRoleKey(e.target.value)} placeholder="premium_member (auto from name)" />
                <p className="mt-1 text-[10px] text-forge-text-muted">Stable identifier. Lowercase letters, numbers and underscores. Can't change after creation.</p>
              </div>
            )}
            {editing && (
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Role key</label>
                <div className="h-8 px-3 rounded-md bg-forge-bg border border-forge-border flex items-center font-mono text-xs text-forge-text-muted">{editing.roleKey}</div>
                <p className="mt-1 text-[10px] text-forge-text-muted">Renaming the role does not change its key or existing assignments.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Description</label>
              <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role can access…" rows={3} />
            </div>
            {error && <p className="text-xs text-forge-error">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" loading={busy} onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Delete role" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete <span className="font-medium text-forge-text-primary">{confirmDelete.name}</span>?
            Members assigned this role will lose the associated access.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await deleteRole(confirmDelete.id);
              setConfirmDelete(null);
              await onRefresh();
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}