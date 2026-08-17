import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { integrationsApi, ENVIRONMENTS, type ProviderCatalogItem, type IntegrationConnection, type OAuthProvider, type TestResult, type Environment } from './forgeIntegrations';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, EnvironmentBadge, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { IntegrationFormModal } from './components/IntegrationFormModal';
import { ManageConnectionModal } from './components/ManageConnectionModal';
import { OAuthConnections } from './OAuthConnections';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

const CATEGORY_ICON: Record<string, string> = {
  ai: 'ri-robot-line',
  search: 'ri-search-line',
  email: 'ri-mail-line',
  automation: 'ri-flow-chart',
  payments: 'ri-bank-card-line',
  infrastructure: 'ri-database-2-line',
};

const ENV_LABEL: Record<string, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
  sandbox: 'Sandbox',
};

type EnvFilter = 'all' | Environment;

function stripeMode(conn: IntegrationConnection): string | null {
  if (conn.provider_id !== 'stripe') return null;
  return conn.environment === 'production' ? 'Live' : conn.environment === 'sandbox' ? 'Test' : null;
}

export function IntegrationsPage() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'ai.operate');
  const [searchParams, setSearchParams] = useSearchParams();

  const [providers, setProviders] = useState<ProviderCatalogItem[]>([]);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [modal, setModal] = useState<{ mode: 'connect' | 'replace'; connection?: IntegrationConnection } | null>(null);
  const [manageConnection, setManageConnection] = useState<IntegrationConnection | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testStates, setTestStates] = useState<Record<string, TestResult>>({});
  const [disableTarget, setDisableTarget] = useState<IntegrationConnection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IntegrationConnection | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [cloneTarget, setCloneTarget] = useState<IntegrationConnection | null>(null);
  const [cloneEnv, setCloneEnv] = useState<Environment>('staging');
  const [cloneMappings, setCloneMappings] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const providerName = useCallback((id: string) => providers.find((p) => p.provider_id === id)?.name ?? id, [providers]);
  const providerCategory = useCallback((id: string) => providers.find((p) => p.provider_id === id)?.category ?? 'ai', [providers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [cat, list, oauth] = await Promise.all([integrationsApi.catalog(), integrationsApi.list(), integrationsApi.oauthProviders()]);
    if (cat.ok && list.ok && oauth.ok) {
      setProviders(cat.data.providers);
      setConnections(list.data.connections);
      setOauthProviders(oauth.data.providers);
    } else {
      setError((!cat.ok ? cat.message : !list.ok ? list.message : oauth.message));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Consume the OAuth callback result (oauth=success|error) once.
  useEffect(() => {
    const result = searchParams.get('oauth');
    if (!result) return;
    const provider = searchParams.get('provider') ?? '';
    const account = searchParams.get('account') ?? '';
    const message = searchParams.get('message') ?? '';
    if (result === 'success') {
      setNotice({ tone: 'success', text: `${provider || 'Provider'} connected successfully${account ? ` (${account})` : ''}.` });
    } else {
      setNotice({ tone: 'error', text: message || 'OAuth connection failed.' });
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const envSummary = useMemo(() => {
    return ENVIRONMENTS.map((env) => {
      const list = connections.filter((c) => c.environment === env);
      const connected = list.filter((c) => c.status === 'connected').length;
      const errors = list.filter((c) => c.status === 'error').length;
      const attention = list.filter((c) => c.status === 'attention' || (c.auth_type === 'oauth' && c.oauth_expires_at && new Date(c.oauth_expires_at).getTime() < Date.now())).length;
      return { env, total: list.length, connected, errors, attention };
    });
  }, [connections]);

  const filteredConnections = useMemo(() => {
    if (envFilter === 'all') return connections;
    return connections.filter((c) => c.environment === envFilter);
  }, [connections, envFilter]);

  const handleTest = async (conn: IntegrationConnection) => {
    setTestingId(conn.id);
    setFeedback('');
    const res = await integrationsApi.testStored(conn.id);
    setTestingId(null);
    if (res.ok) {
      setTestStates((s) => ({ ...s, [conn.id]: res.data.result }));
      load();
    } else {
      setFeedback(res.message);
    }
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    setBusy(true);
    setFeedback('');
    const isProd = disableTarget.environment === 'production';
    const res = disableTarget.status === 'disabled'
      ? await integrationsApi.enable(disableTarget.id)
      : await integrationsApi.disable(disableTarget.id, isProd);
    setBusy(false);
    setDisableTarget(null);
    setFeedback(res.ok ? 'Updated.' : res.message);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const required = deleteTarget.environment === 'production' ? 'PRODUCTION' : 'DELETE';
    if (deleteText !== required) return;
    setBusy(true);
    setFeedback('');
    const res = await integrationsApi.remove(deleteTarget.id, required);
    setBusy(false);
    setDeleteTarget(null);
    setDeleteText('');
    setFeedback(res.ok ? 'Integration deleted.' : res.message);
    load();
  };

  const handleClone = async () => {
    if (!cloneTarget) return;
    setBusy(true);
    setFeedback('');
    const res = await integrationsApi.clone({
      sourceId: cloneTarget.id,
      targetEnvironment: cloneEnv,
      connectionName: cloneName.trim() || undefined,
      copyAgentMappings: cloneMappings,
    });
    setBusy(false);
    setCloneTarget(null);
    setCloneName('');
    setFeedback(res.ok ? 'Configuration copied. The new connection needs its own credential.' : res.message);
    load();
  };

  if (loading) return <LoadingState label="Loading integrations…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const oauthConnections = filteredConnections.filter((c) => c.auth_type === 'oauth');
  const apiKeyConnections = filteredConnections.filter((c) => c.auth_type !== 'oauth');

  return (
    <div>
      <SectionTitle
        title="Integrations"
        description="Securely connect and manage the API and OAuth providers Forge uses across development, staging, sandbox and production."
        action={canManage ? <Button size="sm" icon={<i className="ri-plug-line" />} onClick={() => setModal({ mode: 'connect' })}>Connect provider</Button> : undefined}
      />

      {!canManage && <p className="text-xs text-forge-warning mb-4">You have read-only access to integrations.</p>}
      {notice && (
        <div className={`rounded-md px-3 py-2 text-xs mb-4 ${notice.tone === 'success' ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'}`} role="status">
          {notice.text}
        </div>
      )}
      {feedback && <p className="text-xs text-forge-text-secondary mb-3">{feedback}</p>}

      {/* Environment health overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {envSummary.map((s) => {
          const active = envFilter === s.env;
          return (
            <button
              key={s.env}
              onClick={() => setEnvFilter(active ? 'all' : s.env)}
              className={`text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${active ? 'border-forge-amber bg-forge-hover' : 'border-forge-border-subtle bg-forge-panel hover:bg-forge-hover/50'}`}
            >
              <div className="flex items-center gap-2">
                <EnvironmentBadge environment={s.env} />
                <span className="text-[10px] text-forge-text-muted ml-auto">{s.total} total</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                <span className="text-forge-success">{s.connected} connected</span>
                <span className={s.errors ? 'text-forge-error' : 'text-forge-text-muted'}>{s.errors} errors</span>
                <span className={s.attention ? 'text-forge-warning' : 'text-forge-text-muted'}>{s.attention} attention</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active environment indicator */}
      {envFilter !== 'all' && (
        <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2 mb-4 flex items-center gap-2" role="status">
          <i className="ri-focus-3-line text-forge-amber" />
          <span className="text-xs font-semibold text-forge-amber uppercase tracking-wider">Current view: {ENV_LABEL[envFilter] ?? envFilter}</span>
        </div>
      )}

      {/* OAuth connections */}
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">OAuth connections</h3>
      <OAuthConnections providers={oauthProviders} connections={oauthConnections} canManage={canManage} onChanged={load} />

      {/* API key connections */}
      <h3 className="text-sm font-semibold text-forge-text-primary mb-3 mt-8">API key connections</h3>
      {apiKeyConnections.length === 0 ? (
        <EmptyState message={envFilter === 'all' ? 'No API key integrations connected yet. Connect a provider to get started.' : `No API key integrations in ${ENV_LABEL[envFilter] ?? envFilter} yet.`} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {apiKeyConnections.map((conn) => {
            const test = testStates[conn.id];
            const mode = stripeMode(conn);
            return (
              <Card key={conn.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
                      <i className={`${CATEGORY_ICON[providerCategory(conn.provider_id)] ?? 'ri-plug-line'} text-base`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-forge-text-primary">{providerName(conn.provider_id)}</h3>
                        <StatusPill status={conn.status} />
                        <EnvironmentBadge environment={conn.environment} />
                      </div>
                      <p className="text-xs text-forge-text-muted mt-0.5 truncate">{conn.connection_name}</p>
                    </div>
                  </div>
                  {conn.secret_suffix && (
                    <span className="shrink-0 font-mono text-xs text-forge-text-secondary">••••{conn.secret_suffix}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-forge-text-muted">
                  {mode && <span className="text-forge-text-secondary font-medium">Mode: {mode}</span>}
                  <span>
                    {conn.last_tested_at
                      ? `Tested ${formatDate(conn.last_tested_at)}`
                      : 'Not tested yet'}
                  </span>
                </div>

                {test && (
                  <div className={`rounded-md px-3 py-2 text-xs ${test.ok ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'}`} role="status">
                    <span className="font-medium">{test.ok ? 'Connection successful' : 'Connection failed'}</span>
                    <span className="text-forge-text-secondary"> · {test.ok ? `${test.latencyMs}ms` : test.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-forge-border-subtle">
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setManageConnection(conn)} icon={<i className="ri-settings-3-line" />}>
                        Manage
                      </Button>
                      <Button size="sm" variant="ghost" loading={testingId === conn.id} onClick={() => handleTest(conn)} icon={<i className="ri-flashlight-line" />}>
                        Test
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'replace', connection: conn })} icon={<i className="ri-refresh-line" />}>
                        Replace
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDisableTarget(conn)} icon={<i className={conn.status === 'disabled' ? 'ri-play-circle-line' : 'ri-stop-circle-line'} />}>
                        {conn.status === 'disabled' ? 'Enable' : 'Disable'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setCloneEnv('staging'); setCloneMappings(false); setCloneName(''); setCloneTarget(conn); }} icon={<i className="ri-file-copy-line" />}>
                        Copy
                      </Button>
                      <span className="flex-1" />
                      <Button size="sm" variant="ghost" className="text-forge-error hover:text-forge-error" onClick={() => { setDeleteText(''); setDeleteTarget(conn); }} icon={<i className="ri-delete-bin-line" />}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 flex items-start gap-3 mt-5">
        <i className="ri-shield-check-line text-forge-text-muted text-base shrink-0 mt-0.5" />
        <p className="text-xs text-forge-text-muted leading-relaxed">
          Credentials are write-only — they are stored in a protected server vault and are never returned in full. Each connection belongs to one environment; requests never fall back across environments, and production access is never inherited from development.
        </p>
      </div>

      <IntegrationFormModal
        mode={modal?.mode ?? 'connect'}
        open={modal !== null}
        providers={providers}
        connection={modal?.connection ?? null}
        onClose={() => setModal(null)}
        onSaved={load}
      />

      <ManageConnectionModal
        connection={manageConnection}
        providerName={manageConnection ? providerName(manageConnection.provider_id) : ''}
        open={manageConnection !== null}
        onClose={() => setManageConnection(null)}
        onChanged={load}
      />

      <ConfirmationModal
        open={disableTarget !== null}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => void handleDisable()}
        title={disableTarget?.status === 'disabled' ? 'Enable this integration?' : 'Disable this integration?'}
        message={disableTarget?.status === 'disabled'
          ? `Forge agents and services assigned to ${disableTarget?.connection_name ?? 'this integration'} will be able to use it again.`
          : (disableTarget?.environment === 'production'
            ? `You are changing a production integration. Forge agents and services assigned to ${disableTarget?.connection_name ?? 'this integration'} will no longer be able to use it. The stored credential is retained.`
            : `Forge agents and services assigned to ${disableTarget?.connection_name ?? 'this integration'} will no longer be able to use it. The stored credential is retained.`)}
        confirmLabel={disableTarget?.status === 'disabled' ? 'Enable integration' : 'Disable integration'}
        cancelLabel="Cancel"
        variant={disableTarget?.status === 'disabled' ? 'primary' : 'danger'}
        loading={busy}
      />

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete connection" size="sm">
        <p className="text-sm text-forge-text-secondary mb-4">
          This permanently removes the Forge integration record and stored credential for{' '}
          <span className="text-forge-text-primary">{deleteTarget?.connection_name ?? 'this integration'}</span>. This action cannot be undone.
        </p>
        {deleteTarget?.environment === 'production' && (
          <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2 mb-4 text-xs text-forge-amber" role="note">
            You are deleting a production integration. Type <span className="font-mono font-semibold">PRODUCTION</span> to confirm.
          </div>
        )}
        <label className="block mb-4">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Type <span className="font-mono text-forge-error">{deleteTarget?.environment === 'production' ? 'PRODUCTION' : 'DELETE'}</span> to confirm</span>
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={deleteTarget?.environment === 'production' ? 'PRODUCTION' : 'DELETE'} className="w-full font-mono" autoComplete="off" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={() => void handleDelete()} loading={busy} disabled={deleteText !== (deleteTarget?.environment === 'production' ? 'PRODUCTION' : 'DELETE')}>
            Delete connection
          </Button>
        </div>
      </Modal>

      <Modal open={cloneTarget !== null} onClose={() => setCloneTarget(null)} title="Copy configuration" size="sm">
        <p className="text-sm text-forge-text-secondary mb-4">
          Copy the non-secret configuration from{' '}
          <span className="text-forge-text-primary">{cloneTarget?.connection_name ?? 'this integration'}</span> to another environment. The destination gets its own credential — credentials are never copied.
        </p>
        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Target environment</span>
            <Select value={cloneEnv} onChange={(e) => setCloneEnv(e.target.value as Environment)} options={ENVIRONMENTS.map((e) => ({ value: e, label: ENV_LABEL[e] }))} className="w-full" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Connection name (optional)</span>
            <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder={`${cloneTarget?.connection_name ?? ''} (${ENV_LABEL[cloneEnv]})`} className="w-full" autoComplete="off" />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={cloneMappings} onChange={(e) => setCloneMappings(e.target.checked)} aria-label="Copy agent mappings" />
            <span className="text-xs text-forge-text-secondary">Copy agent mappings</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloneTarget(null)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void handleClone()} loading={busy}>Copy configuration</Button>
        </div>
      </Modal>
    </div>
  );
}