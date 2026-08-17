import { ShieldCheck } from 'lucide-react';
import {
  MEMBER_ROLES,
  MEMBER_ROLE_LABELS,
  MEMBER_ROLE_DESCRIPTIONS,
} from '@/services/projectMembersService';

export function RolesExplanation() {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-forge-text-muted" />
        <h3 className="text-sm font-semibold text-forge-text-primary">Project roles</h3>
      </div>
      <p className="text-xs text-forge-text-muted mb-4">
        Roles define what each collaborator can do. Access is enforced server-side; these labels describe the actual permissions.
      </p>
      <ul className="space-y-3">
        {MEMBER_ROLES.map((role) => (
          <li key={role} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-forge-amber flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-medium text-forge-text-primary">{MEMBER_ROLE_LABELS[role]}</span>
              <p className="text-[11px] text-forge-text-muted leading-relaxed">{MEMBER_ROLE_DESCRIPTIONS[role]}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}