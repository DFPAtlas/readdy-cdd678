import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  MEMBER_ROLE_DESCRIPTIONS,
  type MemberRole,
} from '@/services/projectMembersService';

type Props = {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: MemberRole) => Promise<{ ok: boolean; message: string }>;
};

export function InviteMemberModal({ open, onClose, onInvite }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('reviewer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter an email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await onInvite(trimmed, role);
    setBusy(false);
    if (res.ok) {
      setEmail('');
      setRole('reviewer');
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite member" size="sm">
      <div className="space-y-3">
        <div>
          <label htmlFor="invite-email" className="block text-xs font-medium text-forge-text-secondary mb-1">
            Email
          </label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-xs font-medium text-forge-text-secondary mb-1">
            Role
          </label>
          <Select
            id="invite-role"
            options={MEMBER_ROLES.filter((r) => r !== 'owner').map((r) => ({ value: r, label: MEMBER_ROLE_LABELS[r] }))}
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
            className="w-full"
          />
          <p className="mt-1.5 text-[11px] text-forge-text-muted">{MEMBER_ROLE_DESCRIPTIONS[role]}</p>
        </div>
        {error && <p className="text-xs text-forge-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" loading={busy} onClick={() => void submit()}>
            Send invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}