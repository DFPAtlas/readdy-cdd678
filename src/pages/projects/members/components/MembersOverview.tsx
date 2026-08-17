import { Users, MailPlus, ShieldCheck } from 'lucide-react';
import { MEMBER_ROLE_LABELS, type MemberRole } from '@/services/projectMembersService';

type Props = {
  memberCount: number;
  pendingInviteCount: number;
  currentUserRole: MemberRole | null;
};

export function MembersOverview({ memberCount, pendingInviteCount, currentUserRole }: Props) {
  const cards = [
    { label: 'Members', value: String(memberCount), icon: <Users className="h-4 w-4" /> },
    { label: 'Pending invites', value: String(pendingInviteCount), icon: <MailPlus className="h-4 w-4" /> },
    {
      label: 'Your role',
      value: currentUserRole ? MEMBER_ROLE_LABELS[currentUserRole] : '—',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
          <div className="flex items-center gap-2 text-forge-text-muted">
            {c.icon}
            <span className="text-xs">{c.label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-forge-text-primary">{c.value}</div>
        </div>
      ))}
    </div>
  );
}