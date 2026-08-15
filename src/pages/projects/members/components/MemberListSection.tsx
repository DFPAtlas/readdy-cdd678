import { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Ban, RotateCcw, Shield, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SiteMember, SiteMemberStatus, SiteRole } from '../membersTypes';
import { createMember, setMemberStatus, deleteMember, assignRole, removeRole } from '../membersData';

type Props = {
  projectId: string;
  members: SiteMember[];
  roles: SiteRole[];
  canManage: boolean;
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
};

const STATUS_META: Record<SiteMemberStatus, { label: string; variant: 'default' | 'amber' | 'success' | 'warning' | 'error' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  invited: { label: 'Invited', variant: 'amber' },
  suspended: { label: 'Suspended', variant: 'error' },
};

export function MemberListSection({ projectId, members, roles, canManage, loading, error, onRefresh }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [assigningMember, setAssigningMember] = useState<SiteMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (roleFilter !== 'all' && !m.roles.some((r) => r.id === roleFilter)) return false;
      if (query.trim()) {
        const hay = `${m.displayName} ${m.emailNormalized ?? ''}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [members, query, statusFilter, roleFilter]);

  const doInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError('Enter an email address.'); return; }
    setInviteBusy(true);
    setInviteError('');
    const res = await createMember(projectId, { email: inviteEmail, displayName: inviteName });
    setInviteBusy(false);
    if (res.ok) {
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      await onRefresh();
    } else {
      setInviteError(res.message);
    }
  };

  const runAction = async (member: SiteMember, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusyId(member.id);
    await fn();
    setBusyId(null);
    await onRefresh();
  };

  const toggleRole = async (member: SiteMember, role: SiteRole) => {
    const has = member.roles.some((r) => r.id === role.id);
    if (has) await removeRole(member.id, role.id);
    else await assignRole(member.id, role.id, member.projectId);
    await onRefresh();
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner /></div>;
  if (error) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState title="Couldn't load members" description={error} action={<Button size="sm" onClick={onRefresh}>Retry</Button>} />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search members…" className="w-56" />
        <Select
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'invited', label: 'Invited' },
            { value: 'suspended', label: 'Suspended' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={[
            { value: 'all', label: 'All roles' },
            ...roles.map((r) => ({ value: r.id, label: r.name })),
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        />
        <div className="flex-1" />
        {canManage && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowInvite(true)}>Invite member</Button>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            title={members.length === 0 ? 'No members yet' : 'No members match'}
            description={members.length === 0 ? 'Invite your first site member, or enable open registration in Authentication methods.' : 'Try adjusting your search or filters.'}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-forge-border-subtle bg-forge-bg/40">
                <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Member</th>
                <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Status</th>
                <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Roles</th>
                <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Joined</th>
                <th className="text-right px-4 py-2 font-medium text-forge-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border-subtle">
              {filtered.map((m) => {
                const meta = STATUS_META[m.status];
                const actionBusy = busyId === m.id;
                return (
                  <tr key={m.id} className="hover:bg-forge-hover/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-forge-amber/10 text-forge-amber flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {(m.displayName || m.emailNormalized || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-forge-text-primary truncate">{m.displayName || 'Unnamed member'}</div>
                          <div className="text-forge-text-muted truncate">{m.emailNormalized ?? 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Badge size="sm" variant={meta.variant}>{meta.label}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.length === 0 ? (
                          <span className="text-forge-text-muted">—</span>
                        ) : m.roles.map((r) => (
                          <Badge key={r.id} size="sm" variant="default">{r.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-forge-text-muted">
                      {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {canManage && (
                          <>
                            {m.status !== 'active' && m.status !== 'suspended' && (
                              <button
                                disabled={actionBusy}
                                className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-success hover:bg-forge-hover transition-colors"
                                onClick={() => runAction(m, () => setMemberStatus(m.id, 'active'))}
                                aria-label="Approve"
                              ><CheckCircle2 className="h-3.5 w-3.5" /></button>
                            )}
                            {m.status === 'active' && (
                              <button
                                disabled={actionBusy}
                                className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-warning hover:bg-forge-hover transition-colors"
                                onClick={() => runAction(m, () => setMemberStatus(m.id, 'suspended'))}
                                aria-label="Suspend"
                              ><Ban className="h-3.5 w-3.5" /></button>
                            )}
                            {m.status === 'suspended' && (
                              <button
                                disabled={actionBusy}
                                className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-success hover:bg-forge-hover transition-colors"
                                onClick={() => runAction(m, () => setMemberStatus(m.id, 'active'))}
                                aria-label="Restore"
                              ><RotateCcw className="h-3.5 w-3.5" /></button>
                            )}
                            <button
                              disabled={actionBusy}
                              className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-amber hover:bg-forge-hover transition-colors"
                              onClick={() => setAssigningMember(m)}
                              aria-label="Assign roles"
                            ><Shield className="h-3.5 w-3.5" /></button>
                            <button
                              disabled={actionBusy}
                              className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error hover:bg-forge-hover transition-colors"
                              onClick={() => setConfirmDelete(m)}
                              aria-label="Delete"
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                        {!canManage && <MoreHorizontal className="h-3.5 w-3.5 text-forge-text-muted" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal open onClose={() => setShowInvite(false)} title="Invite member" size="sm">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Name</label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Email</label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            {inviteError && <p className="text-xs text-forge-error">{inviteError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button size="sm" loading={inviteBusy} onClick={doInvite}>Send invitation</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign roles modal */}
      {assigningMember && (
        <Modal open onClose={() => setAssigningMember(null)} title={`Roles — ${assigningMember.displayName || assigningMember.emailNormalized}`} size="sm">
          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-xs text-forge-text-muted">No roles yet. Create roles in the Roles section first.</p>
            ) : roles.map((r) => {
              const has = assigningMember.roles.some((mr) => mr.id === r.id);
              return (
                <label key={r.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-forge-hover cursor-pointer">
                  <input
                    type="checkbox"
                    checked={has}
                    onChange={() => toggleRole(assigningMember, r)}
                    className="accent-[hsl(var(--brand-amber))] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-forge-text-primary">{r.name}</div>
                    {r.description && <div className="text-[10px] text-forge-text-muted truncate">{r.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={() => setAssigningMember(null)}>Done</Button>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Delete member" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete <span className="font-medium text-forge-text-primary">{confirmDelete.displayName || confirmDelete.emailNormalized}</span>?
            Their profile data and roles will be removed. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await deleteMember(confirmDelete.id);
              setConfirmDelete(null);
              await onRefresh();
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}