import { useState } from 'react';
import { MailPlus, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MEMBER_ROLE_LABELS, type ProjectInvitation } from '@/services/projectMembersService';

type Props = {
  invitations: ProjectInvitation[];
  canManage: boolean;
  onRevoke: (id: string) => Promise<{ ok: boolean; message: string }>;
};

function invitationState(
  invite: ProjectInvitation,
  now = Date.now(),
): 'accepted' | 'revoked' | 'expired' | 'pending' {
  if (invite.acceptedAt) return 'accepted';
  if (invite.revokedAt) return 'revoked';
  if (invite.expiresAt && Date.parse(invite.expiresAt) < now) return 'expired';
  return 'pending';
}

export function PendingInvitesSection({ invitations, canManage, onRevoke }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = invitations.filter((i) => !i.acceptedAt && !i.revokedAt);

  if (pending.length === 0) return null;

  const revoke = async (id: string) => {
    setBusyId(id);
    await onRevoke(id);
    setBusyId(null);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Pending invitations</h3>
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
        <ul className="divide-y divide-forge-border-subtle">
          {pending.map((invite) => {
            const state = invitationState(invite);
            const busy = busyId === invite.id;
            return (
              <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-forge-border text-forge-text-muted flex items-center justify-center flex-shrink-0">
                  <MailPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-forge-text-primary truncate">{invite.email}</div>
                  <div className="text-xs text-forge-text-muted">
                    {MEMBER_ROLE_LABELS[invite.role]} · Invited{' '}
                    {new Date(invite.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {state === 'expired' ? ' · expired' : ''}
                  </div>
                </div>
                {state === 'expired' ? (
                  <Badge variant="warning" size="sm">Expired</Badge>
                ) : (
                  <Badge variant="amber" size="sm">Pending</Badge>
                )}
                {canManage && state === 'pending' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revoke(invite.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-forge-text-muted hover:text-forge-error hover:bg-forge-error/10 transition-colors disabled:opacity-40"
                    aria-label={`Revoke invitation for ${invite.email}`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}