import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { integrationsApi, ENVIRONMENT_OPTIONS, type ProviderCatalogItem, type IntegrationConnection, type TestResult } from '../forgeIntegrations';

type Props = {
  mode: 'connect' | 'replace';
  open: boolean;
  providers: ProviderCatalogItem[];
  connection?: IntegrationConnection | null;
  onClose: () => void;
  onSaved: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI model',
  search: 'Search',
  email: 'Email',
  automation: 'Automation',
  payments: 'Payments',
  infrastructure: 'Infrastructure',
};

function TestResultBox({ result }: { result: TestResult }) {
  const ok = result.ok;
  return (
    <div className={`rounded-md p-3 text-xs leading-relaxed ${ok ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'}`} role="status">
      <div className="flex items-start gap-2">
        <i className={`${ok ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} text-base shrink-0 mt-px`} />
        <div>
          <p className="font-medium">{ok ? 'Connection successful' : 'Connection failed'}</p>
          <p className="mt-0.5 text-forge-text-secondary">
            {ok
              ? `${result.provider ? result.provider.charAt(0).toUpperCase() + result.provider.slice(1) : 'Provider'} responded successfully in ${result.latencyMs}ms.`
              : result.message}
          </p>
        </div>
      </div>
    </div>
  );
}

export function IntegrationFormModal({ mode, open, providers, connection, onClose, onSaved }: Props) {
  const [providerId, setProviderId] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testedOk, setTestedOk] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'testing' | 'saving'>('idle');
  const [error, setError] = useState('');
  const [warnNoTest, setWarnNoTest] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProviderId(mode === 'replace' && connection ? connection.provider_id : (providers[0]?.provider_id ?? ''));
    setConnectionName('');
    setEnvironment('production');
    setBaseUrl('');
    setApiKey('');
    setTestResult(null);
    setTestedOk(false);
    setBusy('idle');
    setError('');
    setWarnNoTest(false);
  }, [open, mode, connection, providers]);

  if (!open) return null;

  const selectedProvider = providers.find((p) => p.provider_id === providerId) ?? null;
  const isReplace = mode === 'replace';
  const needsBaseUrl = !isReplace && selectedProvider?.needs_base_url === true;

  const handleTest = async () => {
    if (!apiKey.trim() || busy !== 'idle') return;
    setBusy('testing');
    setError('');
    setTestResult(null);
    setTestedOk(false);
    const providerKey = isReplace ? (connection?.provider_id ?? '') : providerId;
    const res = await integrationsApi.test(providerKey, apiKey.trim(), isReplace ? (connection?.base_url ?? undefined) : baseUrl.trim() || undefined);
    setBusy('idle');
    if (res.ok) {
      setTestResult(res.data);
      setTestedOk(res.data.ok);
    } else {
      setError(res.message);
    }
  };

  const doSave = async (testFirst: boolean) => {
    if (!apiKey.trim() || busy !== 'idle') return;
    setBusy('saving');
    setError('');
    if (isReplace && connection) {
      const res = await integrationsApi.replace({ connectionId: connection.id, apiKey: apiKey.trim(), testFirst, confirmProduction: connection.environment === 'production' });
      if (res.ok) { onSaved(); onClose(); }
      else setError(res.message);
    } else {
      const res = await integrationsApi.save({
        providerId, connectionName: connectionName.trim(), environment, apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined, testFirst,
      });
      if (res.ok) { onSaved(); onClose(); }
      else setError(res.message);
    }
    setBusy('idle');
  };

  const canSubmit = apiKey.trim().length > 0 && (!isReplace ? connectionName.trim().length > 0 : true);

  return (
    <Modal open onClose={onClose} size="lg" title={isReplace ? 'Replace credential' : `Connect ${selectedProvider?.name ?? 'provider'}`}>
      <div className="space-y-4">
        {/* Header context */}
        <div className="flex items-center gap-3 rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
          <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
            <i className="ri-key-2-line text-base" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-forge-text-primary">{selectedProvider?.name ?? (connection?.provider_id ?? 'Provider')}</p>
            <p className="text-[10px] text-forge-text-muted">
              {CATEGORY_LABELS[selectedProvider?.category ?? connection?.provider_category ?? ''] ?? 'Integration'} · {isReplace ? 'replace existing credential' : 'new connection'}
            </p>
          </div>
        </div>

        {!isReplace && (
          <>
            <label className="block">
              <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Provider</span>
              <Select
                value={providerId}
                onChange={(e) => { setProviderId(e.target.value); setTestResult(null); setTestedOk(false); }}
                options={providers.map((p) => ({ value: p.provider_id, label: p.name }))}
                className="w-full"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Connection name</span>
              <Input
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder="e.g. Forge Primary OpenAI"
                autoComplete="off"
                className="w-full"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Environment</span>
              <Select value={environment} onChange={(e) => setEnvironment(e.target.value)} options={ENVIRONMENT_OPTIONS} className="w-full" />
            </label>
          </>
        )}

        {isReplace && connection?.secret_suffix && (
          <p className="text-xs text-forge-text-muted">
            Current credential ends in <span className="font-mono text-forge-text-secondary">••••{connection.secret_suffix}</span>. Enter a new key to replace it.
          </p>
        )}

        {isReplace && connection?.environment === 'production' && (
          <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2.5 text-xs text-forge-amber" role="note">
            <div className="flex items-start gap-2">
              <i className="ri-alert-line text-sm shrink-0 mt-px" />
              <span>You are changing a <strong>production</strong> integration. The new credential will take effect immediately for live Forge services.</span>
            </div>
          </div>
        )}

        {needsBaseUrl && (
          <label className="block">
            <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Base URL</span>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-n8n.example.com" autoComplete="off" className="w-full" />
          </label>
        )}

        <label className="block">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">API credential</span>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null); setTestedOk(false); }}
            placeholder="Enter API credential"
            autoComplete="off"
            className="w-full font-mono"
          />
          <span className="block text-[10px] text-forge-text-muted mt-1">Stored securely server-side and never shown again.</span>
        </label>

        {testResult && <TestResultBox result={testResult} />}

        {error && (
          <div className="rounded-md bg-forge-error/10 text-forge-error px-3 py-2 text-xs" role="status">{error}</div>
        )}

        {warnNoTest && (
          <div className="rounded-md border border-forge-warning/30 bg-forge-warning/10 px-3 py-2.5">
            <p className="text-xs font-medium text-forge-warning">Save without testing?</p>
            <p className="text-[11px] text-forge-text-secondary mt-0.5">
              The credential has not been verified. The integration may not work until it is tested. Forge agents and services using it may fail.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" variant="secondary" onClick={() => doSave(false)} loading={busy === 'saving'}>Yes, save anyway</Button>
              <Button size="sm" variant="ghost" onClick={() => setWarnNoTest(false)}>Go back</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={handleTest} loading={busy === 'testing'} disabled={!canSubmit || busy !== 'idle'}>
            {isReplace ? 'Test new credential' : 'Test connection'}
          </Button>
          {isReplace ? (
            <Button size="sm" onClick={() => doSave(true)} loading={busy === 'saving'} disabled={!testedOk || busy !== 'idle'}>
              Replace credential
            </Button>
          ) : (
            <Button size="sm" onClick={() => doSave(true)} loading={busy === 'saving'} disabled={!canSubmit || busy !== 'idle'}>
              Save securely
            </Button>
          )}
          <button
            type="button"
            onClick={() => setWarnNoTest(true)}
            disabled={!canSubmit || busy !== 'idle'}
            className="text-xs text-forge-text-muted hover:text-forge-text-secondary transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
          >
            Save without test
          </button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy !== 'idle'}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}