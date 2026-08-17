import { useState } from 'react';
import { Trash2, ShieldCheck } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  type MemberRole,
  type ProjectMember,
} from '@/services/projectMembersService';

type Props = {
  members: ProjectMember[];
  canManage: boolean;
  onRoleChange: (memberId: string, role: MemberRole) => Promise<{ ok: boolean; message: string }>;
  onRemoveRequest: (member: ProjectMember) => void;
};

export function ProjectMembersList({ members, canManage, onRoleChange, onRemoveRequest }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState('');

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8" />}
          title="Build solo or invite your team"
          description="Invite collaborators when you're ready to work together."
        />
      </div>
    );
  }

  const changeRole = async (member: ProjectMember, role: MemberRole) => {
    setBusyId(member.id);
    setRoleError('');
    const res = await onRoleChange(member.id, role);
    setBusyId(null);
    if (!res.ok) setRoleError(res.message);
  };

  return (
    <div>
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
        <ul className="divide-y divide-forge-border-subtle">
          {members.map((member) => {
            const isOwner = member.role === 'owner';
            const isSelf = member.isCurrentUser;
            const canEdit = canManage && !isOwner && !isSelf;
            const canRemove = canManage && !isOwner && !isSelf;
            const busy = busyId === member.id;
            const label = member.displayName || member.email || 'Member';
            return (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-forge-amber/10 text-forge-amber flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {member.initials || label.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-forge-text-primary truncate">{label}</span>
                    {isSelf && <Badge variant="amber" size="sm">You</Badge>}
                  </div>
                  <div className="text-xs text-forge-text-muted truncate">
                    {member.email || 'No email'}
                    {member.joinedAt
                      ? ` · Joined ${new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : ''}
                  </div>
                </div>
                {canEdit ? (
                  <Select
                    options={MEMBER_ROLES.filter((r) => r !== 'owner').map((r) => ({ value: r, label: MEMBER_ROLE_LABELS[r] }))}
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => void changeRole(member, e.target.value as MemberRole)}
                    aria-label={`Change role for ${label}`}
                    className="w-32"
                  />
                ) : (
                  <Badge variant="default" size="sm">{MEMBER_ROLE_LABELS[member.role]}</Badge>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveRequest(member)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-forge-text-muted hover:text-forge-error hover:bg-forge-error/10 transition-colors"
                    aria-label={`Remove ${label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {roleError && <p className="mt-2 text-xs text-forge-error">{roleError}</p>}
    </div>
  );
}