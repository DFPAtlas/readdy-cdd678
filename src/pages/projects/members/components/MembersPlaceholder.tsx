import { EmptyState } from '@/components/ui/EmptyState';
import { Users, ShieldCheck, Mail, KeyRound } from 'lucide-react';

const SECTION_DETAIL: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
  'protected-pages': {
    icon: <ShieldCheck className="h-8 w-8" />,
    title: 'Protected pages',
    description: 'Restrict individual pages to logged-in members, selected roles, specific members or token access — enforced at the data layer, never just hidden with CSS.',
  },
  'email-templates': {
    icon: <Mail className="h-8 w-8" />,
    title: 'Email templates',
    description: 'Brand and configure the verify-email, magic-link, password-reset, invitation, approved and suspended emails, with preview and test-send.',
  },
  security: {
    icon: <KeyRound className="h-8 w-8" />,
    title: 'Security',
    description: 'Review rate limiting, session settings, redirect allowlist, bot protection and access audit for this site.',
  },
};

export function MembersPlaceholder({ section }: { section: string }) {
  const detail = SECTION_DETAIL[section] ?? { icon: <Users className="h-8 w-8" />, title: section, description: 'This area ships in the next Members milestone.' };
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
      <EmptyState
        icon={detail.icon}
        title={detail.title}
        description={`${detail.description} This section ships in the next Members milestone.`}
      />
    </div>
  );
}