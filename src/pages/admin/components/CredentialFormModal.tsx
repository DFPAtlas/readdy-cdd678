import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { credentialsApi, ENVIRONMENT_OPTIONS, type CredentialProvider, type PlatformCredential, type CredentialTest } from '@/pages/admin/forgeCredentials';

type Props = {
  mode: 'add' | 'replace';
  open: boolean;
  provider: CredentialProvider | null;
  credential: PlatformCredential | null;
  defaultEnvironment?: string;
  onClose: () => void;
  onSaved: () => void;
};

function TestResultBox({ result }: { result: CredentialTest }) {
  const ok = result.ok;
  return (
    <div className={`rounded-md p-3 text-xs leading-relaxed ${ok ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'}`} role="status">
      <div className="flex items-start gap-2">
        <i className={`${ok ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} text-base shrink-0 mt-px`} />
        <div>
          <p className="font-medium">{ok ? 'Connection successful' : 'Connection failed'}</p>
          <p className="mt-0.5 text-forge-text-secondary">{result.message}</p>
        </div>
      </div>
    </div>
  );
}

export function CredentialFormModal({ mode, open, provider, credential, defaultEnvironment, onClose, onSaved }: Props) {
  const [environment, setEnvironment] = useState('production');
  const [baseUrl, setBaseUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<CredentialTest | null>(null);
  const [testedOk, setTestedOk] = useState(false);
  const [busy, setBusy] = useState<'idle' | 'testing' | 'saving'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const isReplace = mode === 'replace';
    setEnvironment(isReplace && credential ? credential.environment : (defaultEnvironment || 'production'));
    setBaseUrl('');
    setSecret('');
    setConfirmSecret('');
    setShowSecret(false);
    setTestResult(null);
    setTestedOk(false);
    setBusy('idle');
    setError('');
  }, [open, mode, credential, defaultEnvironment]);

  if (!open || !provider) return null;

  const isReplace = mode === 'replace';
  const needsBaseUrl = provider.needsBaseUrl;
  const secretValid = secret.trim().length > 0 && secret === confirmSecret;
  const canSubmit = secret.trim().length > 0 && confirmSecret.length > 0 && secret === confirmSecret;

  const clearSecret = () => {
    setSecret('');
    setConfirmSecret('');
  };

  const handleTest = async () => {
    if (!canSubmit || busy !== 'idle') return;
    setBusy('testing');
    setError('');
    setTestResult(null);
    setTestedOk(false);
    const res = await credentialsApi.test(provider.key, secret.trim(), needsBaseUrl ? baseUrl.trim() || undefined : undefined);
    setBusy('idle');
    if (res.ok) {
      setTestResult(res.data);
      setTestedOk(res.data.ok);
    } else {
      setError(res.message);
    }
  };

  const doSave = async () => {
    if (!canSubmit || busy !== 'idle') return;
    setBusy('saving');
    setError('');
    const payload = {
      providerKey: provider.key,
      environment,
      secret: secret.trim(),
      baseUrl: needsBaseUrl ? baseUrl.trim() || undefined : undefined,
    };
    const res = isReplace ? await credentialsApi.replace(payload) : await credentialsApi.save(payload);
    setBusy('idle');
    clearSecret();
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError(res.message);
    }
  };

  const mismatched = confirmSecret.length > 0 && secret !== confirmSecret;

  return (
    <Modal open onClose={onClose} size="lg" title={isReplace ? 'Replace credential' : `Add ${provider.label} credential`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md bg-forge-bg border border-forge-border-subtle px-3 py-2.5">
          <div className="h-9 w-9 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
            <i className="ri-key-2-line text-base" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-forge-text-primary">{provider.label}</p>
            <p className="text-[10px] text-forge-text-muted font-mono">{provider.key} · {isReplace ? 'replace existing credential' : 'new credential'}</p>
          </div>
        </div>

        {isReplace && credential && (
          <p className="text-xs text-forge-text-muted">
            Current credential ends in <span className="font-mono text-forge-text-secondary">••••{credential.key_suffix}</span>. The existing secret is never retrieved — enter a new value to replace it.
          </p>
        )}

        {isReplace && credential?.environment === 'production' && (
          <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2.5 text-xs text-forge-amber" role="note">
            <div className="flex items-start gap-2">
              <i className="ri-alert-line text-sm shrink-0 mt-px" />
              <span>You are changing a <strong>production</strong> credential. The new value takes effect immediately for live Forge services.</span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Environment</span>
          {isReplace ? (
            <p className="text-sm text-forge-text-primary font-medium">{environment === 'production' ? 'Production' : 'Test'}</p>
          ) : (
            <Select value={environment} onChange={(e) => { setEnvironment(e.target.value); setTestResult(null); setTestedOk(false); }} options={ENVIRONMENT_OPTIONS} className="w-full" />
          )}
        </label>

        {needsBaseUrl && (
          <label className="block">
            <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Base URL</span>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-endpoint.example.com" autoComplete="off" className="w-full" />
          </label>
        )}

        <div>
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Secret / credential value</span>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => { setSecret(e.target.value); setTestResult(null); setTestedOk(false); }}
              placeholder="Enter credential value"
              autoComplete="new-password"
              spellCheck={false}
              className="w-full font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary cursor-pointer"
              aria-label={showSecret ? 'Hide credential' : 'Show credential'}
              tabIndex={-1}
            >
              <i className={showSecret ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">Confirm value</span>
          <div className="relative">
            <Input
              type={showSecret ? 'text' : 'password'}
              value={confirmSecret}
              onChange={(e) => { setConfirmSecret(e.target.value); setTestResult(null); setTestedOk(false); }}
              placeholder="Re-enter credential value"
              autoComplete="new-password"
              spellCheck={false}
              className="w-full font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary cursor-pointer"
              aria-label={showSecret ? 'Hide credential' : 'Show credential'}
              tabIndex={-1}
            >
              <i className={showSecret ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
          </div>
          {mismatched && <p className="text-[11px] text-forge-error mt-1">The values do not match.</p>}
        </div>

        <div className="rounded-md border border-forge-border-subtle bg-forge-bg px-3 py-2.5 flex items-start gap-2">
          <i className="ri-shield-check-line text-forge-text-muted text-sm shrink-0 mt-px" />
          <p className="text-[11px] text-forge-text-muted leading-relaxed">
            The credential is encrypted server-side and never stored in the browser. It is tested against the provider before saving, and only a masked suffix is ever returned.
          </p>
        </div>

        {testResult && <TestResultBox result={testResult} />}

        {error && (
          <div className="rounded-md bg-forge-error/10 text-forge-error px-3 py-2 text-xs" role="status">{error}</div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={handleTest} loading={busy === 'testing'} disabled={!canSubmit || busy !== 'idle'}>
            Test connection
          </Button>
          <Button size="sm" onClick={doSave} loading={busy === 'saving'} disabled={!secretValid || busy !== 'idle'}>
            {isReplace ? 'Test & replace' : 'Test & save'}
          </Button>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy !== 'idle'}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}