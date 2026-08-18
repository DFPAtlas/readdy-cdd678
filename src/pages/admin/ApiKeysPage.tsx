import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { credentialsApi, deriveStatus, type PlatformCredential, type CredentialProvider, type CredentialActivity } from './forgeCredentials';
import { useAdmin, hasPermission } from './AdminGuard';
import { SectionTitle, LoadingState, ErrorState, StatCard, formatDate } from './components';
import { CredentialCard } from './components/CredentialCard';
import { CredentialFormModal } from './components/CredentialFormModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type ModalState =
  | { mode: 'add'; provider: CredentialProvider; environment: string }
  | { mode: 'replace'; provider: CredentialProvider; credential: PlatformCredential }
  | null;

type RemoveTarget = { provider: CredentialProvider; credential: PlatformCredential };

const ACTION_LABELS: Record<string, string> = {
  'credential.saved': 'Key added',
  'credential.replaced': 'Key replaced',
  'credential.tested': 'Connection tested',
  'credential.disabled': 'Key disabled',
  'credential.enabled': 'Key enabled',
  'credential.deleted': 'Key removed',
  'credential.save_attempted': 'Add attempted',
  'credential.replace_attempted': 'Replace attempted',
};

export function ApiKeysPage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const canManage = hasPermission(admin, 'secrets.manage');

  const [providers, setProviders] = useState<CredentialProvider[]>([]);
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [activity, setActivity] = useState<CredentialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [disableTarget, setDisableTarget] = useState<PlatformCredential | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);
  const [removeText, setRemoveText] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setErrorCode('');
    const [prov, list, act] = await Promise.all([
      credentialsApi.providers(),
      credentialsApi.list(),
      credentialsApi.activity(),
    ]);
    if (prov.ok && list.ok && act.ok) {
      setProviders(prov.data.providers);
      setCredentials(list.data.credentials);
      setActivity(act.data.activity);
    } else {
      const failed = !prov.ok ? prov : !list.ok ? list : act;
      setErrorCode(failed.code);
      setError(failed.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  const summary = useMemo(() => {
    const statuses = credentials.map((c) => deriveStatus(c));
    const connected = statuses.filter((s) => s === 'connected').length;
    const attention = statuses.filter((s) => s === 'failed' || s === 'unavailable').length;
    const disabled = statuses.filter((s) => s === 'disabled').length;
    const lastHealth = credentials.map((c) => c.last_tested_at).filter((t): t is string => Boolean(t)).sort().pop() ?? null;
    return { connected, attention, disabled, lastHealth };
  }, [credentials]);

  const aiProviders = useMemo(() => providers.filter((p) => p.kind === 'ai'), [providers]);
  const platformProviders = useMemo(() => providers.filter((p) => p.kind !== 'ai'), [providers]);

  const providerByKey = useMemo(() => {
    const m: Record<string, CredentialProvider> = {};
    for (const p of providers) m[p.key] = p;
    return m;
  }, [providers]);

  const providerLabel = (key: string | null) => (key ? (providerByKey[key]?.label ?? key) : '—');

  const handleTest = async (cred: PlatformCredential) => {
    setBusyAction(`test:${cred.id}`);
    const res = await credentialsApi.testStored(cred.id);
    setBusyAction(null);
    if (res.ok) {
      setFeedback({ tone: res.data.ok ? 'success' : 'error', text: res.data.ok ? 'Connection successful.' : res.data.message });
    } else {
      setFeedback({ tone: 'error', text: res.message });
    }
    load();
  };

  const handleEnable = async (cred: PlatformCredential) => {
    setBusyAction(`enable:${cred.id}`);
    const res = await credentialsApi.enable(cred.id);
    setBusyAction(null);
    setFeedback(res.ok ? { tone: 'success', text: 'Credential enabled.' } : { tone: 'error', text: res.message });
    load();
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    setBusyAction('disable');
    const res = await credentialsApi.disable(disableTarget.id);
    setBusyAction(null);
    setDisableTarget(null);
    setFeedback(res.ok ? { tone: 'success', text: 'Credential disabled.' } : { tone: 'error', text: res.message });
    load();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const required = removeTarget.credential.environment === 'production' ? 'PRODUCTION' : 'DELETE';
    if (removeText !== required) return;
    setBusyAction('remove');
    const res = await credentialsApi.remove(removeTarget.credential.id);
    setBusyAction(null);
    setRemoveTarget(null);
    setRemoveText('');
    setFeedback(res.ok ? { tone: 'success', text: 'Credential removed.' } : { tone: 'error', text: res.message });
    load();
  };

  if (!canManage) {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-lg bg-forge-error/10 flex items-center justify-center">
          <i className="ri-lock-2-line text-forge-error text-xl" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-forge-text-primary">Access denied</h2>
        <p className="mt-1 max-w-md text-sm text-forge-text-muted">
          You do not have the <span className="font-mono">secrets.manage</span> permission required to manage platform credentials.
        </p>
        <Link to="/forge-admin" className="mt-5 text-sm text-forge-amber hover:text-forge-amber-dim transition-colors">
          Back to Overview →
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingState label="Loading credentials…" />;

  if (errorCode === 'AUTH_REQUIRED') {
    return (
      <div className="py-16 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-lg bg-forge-warning/10 flex items-center justify-center">
          <i className="ri-user-line text-forge-warning text-xl" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-forge-text-primary">Session expired</h2>
        <p className="mt-1 max-w-md text-sm text-forge-text-muted">Your session has expired. Sign in again to continue managing credentials.</p>
        <button
          type="button"
          onClick={() => navigate('/forge-admin/login')}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-forge-amber px-4 py-2 text-sm font-medium text-forge-text-inverse hover:bg-forge-amber-dim transition-colors cursor-pointer"
        >
          <i className="ri-login-box-line" />
          Sign in
        </button>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  const renderGroup = (title: string, list: CredentialProvider[]) => (
    <section className="mb-8">
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">{title}</h3>
      {list.length === 0 ? (
        <div className="py-8 text-sm text-forge-text-muted">No services in this group.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {list.map((p) => {
            const creds = credentials.filter((c) => c.provider_key === p.key);
            return (
              <CredentialCard
                key={p.key}
                provider={p}
                credentials={creds}
                canManage={canManage}
                busyAction={busyAction}
                onAdd={(env) => setModal({ mode: 'add', provider: p, environment: env })}
                onReplace={(cred) => setModal({ mode: 'replace', provider: p, credential: cred })}
                onTest={handleTest}
                onDisable={(cred) => setDisableTarget(cred)}
                onEnable={handleEnable}
                onRemove={(cred) => setRemoveTarget({ provider: p, credential: cred })}
              />
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div>
      <SectionTitle
        title="API Keys & Service Credentials"
        description="Securely manage the platform credentials used by Forge services, AI providers and integrations."
      />

      <div className="rounded-md border border-forge-border-subtle bg-forge-panel px-3 py-2.5 flex items-start gap-2 mb-4">
        <i className="ri-shield-keyhole-line text-forge-text-muted text-sm shrink-0 mt-px" />
        <p className="text-xs text-forge-text-muted leading-relaxed">
          Credentials are encrypted server-side. Complete secret values are never returned after saving.
        </p>
      </div>

      {feedback && (
        <div className={`rounded-md px-3 py-2 text-xs mb-4 ${feedback.tone === 'success' ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'}`} role="status">
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Connected services" value={summary.connected} icon="ri-plug-line" tone="success" />
        <StatCard label="Attention required" value={summary.attention} icon="ri-alert-line" tone={summary.attention ? 'warning' : 'muted'} />
        <StatCard label="Disabled credentials" value={summary.disabled} icon="ri-pause-circle-line" tone="muted" />
        <StatCard label="Last health check" value={summary.lastHealth ? formatDate(summary.lastHealth) : 'Never'} icon="ri-pulse-line" tone="accent" />
      </div>

      {renderGroup('AI Providers', aiProviders)}
      {renderGroup('Platform Services', platformProviders)}

      {/* Recent activity */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Recent credential activity</h3>
        <Card className="divide-y divide-forge-border-subtle">
          {activity.length === 0 ? (
            <p className="px-4 py-6 text-sm text-forge-text-muted">No credential activity recorded yet.</p>
          ) : (
            activity.map((e) => {
              const resultBadge = e.success === null ? null : e.success
                ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-forge-success/10 text-forge-success">Success</span>
                : <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-forge-error/10 text-forge-error">Failed</span>;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-7 w-7 rounded bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
                    <i className="ri-key-2-line text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-forge-text-primary">{ACTION_LABELS[e.action] ?? e.action}</span>
                      <span className="text-xs text-forge-text-secondary">{providerLabel(e.provider_key)}</span>
                      {e.environment && (
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${e.environment === 'production' ? 'bg-forge-amber/15 text-forge-amber' : 'bg-forge-border text-forge-text-secondary'}`}>
                          {e.environment}
                        </span>
                      )}
                      {resultBadge}
                    </div>
                    <p className="text-[11px] text-forge-text-muted mt-0.5">
                      {e.actor_email ?? e.actor_name ?? '—'} · {formatDate(e.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      {/* Modals */}
      <CredentialFormModal
        mode={modal?.mode ?? 'add'}
        open={modal !== null}
        provider={modal?.provider ?? null}
        credential={modal?.mode === 'replace' ? modal.credential : null}
        defaultEnvironment={modal?.mode === 'add' ? modal.environment : undefined}
        onClose={() => setModal(null)}
        onSaved={load}
      />

      <ConfirmationModal
        open={disableTarget !== null}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => void handleDisable()}
        title="Disable this credential?"
        message={disableTarget
          ? `Forge services and agents relying on the ${disableTarget.environment} ${providerByKey[disableTarget.provider_key]?.label ?? disableTarget.provider_key} credential will no longer be able to use it. The stored credential is retained.`
          : ''}
        confirmLabel="Disable credential"
        cancelLabel="Cancel"
        variant="danger"
        loading={busyAction === 'disable'}
      />

      <Modal open={removeTarget !== null} onClose={() => setRemoveTarget(null)} title="Remove credential" size="sm">
        <p className="text-sm text-forge-text-secondary mb-4">
          This permanently removes the {removeTarget?.credential.environment} credential for{' '}
          <span className="text-forge-text-primary">{removeTarget?.provider.label ?? ''}</span>. Dependent Forge features may stop working. This action cannot be undone.
        </p>
        {removeTarget?.credential.environment === 'production' && (
          <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2 mb-4 text-xs text-forge-amber" role="note">
            You are removing a production credential. Type <span className="font-mono font-semibold">PRODUCTION</span> to confirm.
          </div>
        )}
        <label className="block mb-4">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">
            Type <span className="font-mono text-forge-error">{removeTarget?.credential.environment === 'production' ? 'PRODUCTION' : 'DELETE'}</span> to confirm
          </span>
          <Input
            value={removeText}
            onChange={(e) => setRemoveText(e.target.value)}
            placeholder={removeTarget?.credential.environment === 'production' ? 'PRODUCTION' : 'DELETE'}
            className="w-full font-mono"
            autoComplete="off"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRemoveTarget(null)} disabled={busyAction === 'remove'}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => void handleRemove()}
            loading={busyAction === 'remove'}
            disabled={removeText !== (removeTarget?.credential.environment === 'production' ? 'PRODUCTION' : 'DELETE')}
          >
            Remove credential
          </Button>
        </div>
      </Modal>
    </div>
  );
}