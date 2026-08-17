import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AiProviderInfo } from '@/pages/projects/sandbox/sandboxAiOrchestration';
import { CheckCircle, XCircle } from 'lucide-react';

interface ConfigureProviderModalProps {
  provider: AiProviderInfo | null;
  onClose: () => void;
  onConfigure: (providerKey: string, apiKey: string) => Promise<{ ok: boolean; message: string }>;
}

export function ConfigureProviderModal({
  provider,
  onClose,
  onConfigure,
}: ConfigureProviderModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!provider) return null;

  const handleSubmit = async () => {
    if (!apiKey.trim() || busy) return;
    setBusy(true);
    setResult(null);
    const res = await onConfigure(provider.provider_key, apiKey.trim());
    setResult(res);
    setBusy(false);
    if (res.ok) {
      setTimeout(() => {
        setApiKey('');
        setResult(null);
        onClose();
      }, 900);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Configure ${provider.display_name}`} size="sm">
      <p className="text-sm text-forge-text-muted mb-4">
        Enter your API key for {provider.display_name}. Forge tests the connection before saving.
      </p>

      <label htmlFor="provider-api-key" className="block mb-4">
        <span className="block text-xs font-medium text-forge-text-secondary mb-1.5">API key</span>
        <Input
          id="provider-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your key…"
          autoComplete="off"
          className="w-full"
          disabled={busy}
        />
      </label>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-md p-2.5 mb-4 text-xs ${
            result.ok ? 'bg-forge-success/10 text-forge-success' : 'bg-forge-error/10 text-forge-error'
          }`}
          role="status"
        >
          {result.ok ? (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} loading={busy} disabled={!apiKey.trim() || busy}>
          {busy ? 'Testing…' : 'Save & test'}
        </Button>
      </div>
    </Modal>
  );
}