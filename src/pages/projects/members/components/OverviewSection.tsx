import { Users, ShieldCheck, KeyRound, UserPlus, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import type { SiteAuthConfig } from '../membersTypes';
import { SIGNUP_MODES } from '../membersTypes';

type Props = {
  config: SiteAuthConfig;
  counts: { total: number; active: number; pending: number; suspended: number };
  rolesCount: number;
  fieldsCount: number;
  canManage: boolean;
  saving: boolean;
  onToggleEnabled: (enabled: boolean) => void;
};

const enabledMethodCount = (config: SiteAuthConfig) =>
  Object.values(config.methods).filter(Boolean).length;

export function OverviewSection({ config, counts, rolesCount, fieldsCount, canManage, saving, onToggleEnabled }: Props) {
  const signupLabel = SIGNUP_MODES.find((m) => m.value === config.signupMode)?.label ?? config.signupMode;
  const methodCount = enabledMethodCount(config);

  const stats = [
    { label: 'Total members', value: counts.total, icon: <Users className="h-4 w-4" /> },
    { label: 'Active', value: counts.active, icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Pending approval', value: counts.pending, icon: <UserPlus className="h-4 w-4" /> },
    { label: 'Suspended', value: counts.suspended, icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Enable gate */}
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-forge-text-primary">Member authentication</h3>
              {config.enabled ? <Badge variant="success" size="sm">Enabled</Badge> : <Badge variant="default" size="sm">Disabled</Badge>}
            </div>
            <p className="mt-1 text-xs text-forge-text-muted max-w-xl">
              When enabled, visitors to your published site can sign up and log in as members — completely separate from your Forge collaborators. Keep this off until you've completed configuration below.
            </p>
            {!config.enabled && (
              <p className="mt-2 text-xs text-forge-warning flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Authentication is off. Members you invite won't be able to sign in until you enable it.
              </p>
            )}
            {config.enabled && methodCount === 0 && (
              <p className="mt-2 text-xs text-forge-warning flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                No authentication method is configured. Enable at least one method or members can't sign in.
              </p>
            )}
          </div>
          <Switch
            checked={config.enabled}
            disabled={!canManage || saving}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            aria-label="Enable member authentication"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
            <div className="flex items-center gap-2 text-forge-text-muted">
              {s.icon}
              <span className="text-xs">{s.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-forge-text-primary">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Configuration summary */}
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <h3 className="text-sm font-medium text-forge-text-primary">Configuration</h3>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
          <div>
            <dt className="text-forge-text-muted">Registration</dt>
            <dd className="mt-0.5 text-forge-text-primary">{signupLabel}</dd>
          </div>
          <div>
            <dt className="text-forge-text-muted">Authentication methods</dt>
            <dd className="mt-0.5 text-forge-text-primary">{methodCount} enabled</dd>
          </div>
          <div>
            <dt className="text-forge-text-muted">Email verification</dt>
            <dd className="mt-0.5 text-forge-text-primary">{config.requireEmailVerification ? 'Required' : 'Optional'}</dd>
          </div>
          <div>
            <dt className="text-forge-text-muted">Roles</dt>
            <dd className="mt-0.5 text-forge-text-primary">{rolesCount}</dd>
          </div>
          <div>
            <dt className="text-forge-text-muted">Profile fields</dt>
            <dd className="mt-0.5 text-forge-text-primary">{fieldsCount}</dd>
          </div>
          <div>
            <dt className="text-forge-text-muted">Post sign-up destination</dt>
            <dd className="mt-0.5 text-forge-text-primary font-mono">{config.postSignupDestination || '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}