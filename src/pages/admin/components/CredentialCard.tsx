import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/pages/admin/components';
import { deriveStatus, KIND_ICON, type PlatformCredential, type CredentialProvider, type CredentialStatus } from '@/pages/admin/forgeCredentials';

type Props = {
  provider: CredentialProvider;
  credentials: PlatformCredential[];
  canManage: boolean;
  busyAction: string | null;
  onAdd: (environment: string) => void;
  onReplace: (cred: PlatformCredential) => void;
  onTest: (cred: PlatformCredential) => void;
  onDisable: (cred: PlatformCredential) => void;
  onEnable: (cred: PlatformCredential) => void;
  onRemove: (cred: PlatformCredential) => void;
};

const ENV_LABEL: Record<string, string> = { test: 'Test', production: 'Production' };

const STATUS_META: Record<CredentialStatus, { label: string; cls: string; icon: string }> = {
  connected: { label: 'Connected', cls: 'bg-forge-success/10 text-forge-success', icon: 'ri-checkbox-circle-line' },
  not_configured: { label: 'Not configured', cls: 'bg-forge-border text-forge-text-muted', icon: 'ri-subtract-line' },
  disabled: { label: 'Disabled', cls: 'bg-forge-border text-forge-text-muted', icon: 'ri-pause-circle-line' },
  failed: { label: 'Test failed', cls: 'bg-forge-error/10 text-forge-error', icon: 'ri-close-circle-line' },
  unavailable: { label: 'Provider unavailable', cls: 'bg-forge-warning/10 text-forge-warning', icon: 'ri-wifi-off-line' },
  never_tested: { label: 'Never tested', cls: 'bg-forge-border text-forge-text-secondary', icon: 'ri-time-line' },
};

function StatusBadge({ status }: { status: CredentialStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${m.cls}`}>
      <i className={`${m.icon} text-[11px]`} />
      {m.label}
    </span>
  );
}

function EnvBadge({ environment }: { environment: string }) {
  const isProd = environment === 'production';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${isProd ? 'bg-forge-amber/15 text-forge-amber' : 'bg-forge-border text-forge-text-secondary'}`}>
      {ENV_LABEL[environment] ?? environment.toUpperCase()}
    </span>
  );
}

export function CredentialCard({ provider, credentials, canManage, busyAction, onAdd, onReplace, onTest, onDisable, onEnable, onRemove }: Props) {
  const byEnv = (env: string) => credentials.find((c) => c.environment === env);
  const kindIcon = KIND_ICON[provider.kind] ?? 'ri-plug-line';

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
          <i className={`${kindIcon} text-base`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-forge-text-primary leading-tight">{provider.label}</h3>
          <p className="text-[11px] text-forge-text-muted font-mono truncate">{provider.key}</p>
        </div>
      </div>

      {['test', 'production'].map((env) => {
        const cred = byEnv(env);
        const status = deriveStatus(cred);
        const isBusy = busyAction !== null;

        if (!cred) {
          return (
            <div key={env} className="flex items-center justify-between gap-3 rounded-md border border-forge-border-subtle bg-forge-bg px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <EnvBadge environment={env} />
                <StatusBadge status="not_configured" />
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onAdd(env)} icon={<i className="ri-add-line" />}>
                  Add key
                </Button>
              )}
            </div>
          );
        }

        return (
          <div key={env} className="rounded-md border border-forge-border-subtle bg-forge-bg px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <EnvBadge environment={env} />
                <StatusBadge status={status} />
                <span className="font-mono text-xs text-forge-text-secondary">••••{cred.key_suffix}</span>
              </div>
            </div>

            <p className="text-[11px] text-forge-text-muted mt-1.5 leading-relaxed">
              Tested {formatDate(cred.last_tested_at)}
              {' · '}Used {formatDate(cred.last_used_at)}
              {' · '}Updated {formatDate(cred.updated_at)}
              {cred.updated_by_email || cred.updated_by_name
                ? ` · by ${cred.updated_by_email ?? cred.updated_by_name}`
                : ''}
            </p>

            {canManage && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-1.5 border-t border-forge-border-subtle">
                <Button size="sm" variant="ghost" loading={busyAction === `test:${cred.id}`} disabled={isBusy} onClick={() => onTest(cred)} icon={<i className="ri-flashlight-line" />}>
                  Test
                </Button>
                <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onReplace(cred)} icon={<i className="ri-refresh-line" />}>
                  Replace
                </Button>
                {cred.status === 'disabled' ? (
                  <Button size="sm" variant="ghost" loading={busyAction === `enable:${cred.id}`} disabled={isBusy} onClick={() => onEnable(cred)} icon={<i className="ri-play-circle-line" />}>
                    Enable
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onDisable(cred)} icon={<i className="ri-stop-circle-line" />}>
                    Disable
                  </Button>
                )}
                <span className="flex-1" />
                <Button size="sm" variant="ghost" className="text-forge-error hover:text-forge-error" disabled={isBusy} onClick={() => onRemove(cred)} icon={<i className="ri-delete-bin-line" />}>
                  Remove
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}