import { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, RefreshCw, Star, ShieldCheck, Info, AlertTriangle, Loader2, X } from 'lucide-react';
import {
  addDomain, getPublishStatus, listDomains, removeDomain, setPrimaryDomain,
  updateDomainRedirects, verifyDomain, validateHostname,
  type DeploymentEnvironment, type DomainRecord,
} from './sandboxPublish';

const ENV_OPTIONS: DeploymentEnvironment[] = ['production', 'staging', 'preview'];

const SSL_LABELS: Record<DomainRecord['sslStatus'], string> = {
  pending: 'Pending', provisioning: 'Provisioning', active: 'Active', failed: 'Failed',
};

export default function CustomDomains({ onNotify }: { onNotify: (message: string) => void }) {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [hostname, setHostname] = useState('');
  const [environment, setEnvironment] = useState<DeploymentEnvironment>('production');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<DomainRecord | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [domainList, status] = await Promise.all([listDomains(), getPublishStatus()]);
    setDomains(domainList);
    setProviderConfigured(status.providerConfigured);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleAdd = async () => {
    const check = validateHostname(hostname);
    if (!check.ok) { onNotify(check.error ?? 'Invalid hostname'); return; }
    setAdding(true);
    const result = await addDomain({ hostname, environment });
    setAdding(false);
    onNotify(result.message);
    if (result.ok) { setHostname(''); void refresh(); }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    const result = await removeDomain(confirmRemove.id);
    onNotify(result.message);
    setConfirmRemove(null);
    if (result.ok) void refresh();
  };

  const togglePrimary = async (domain: DomainRecord) => {
    setBusyId(domain.id);
    const result = await setPrimaryDomain(domain.id, !domain.isPrimary);
    setBusyId(null);
    onNotify(result.message);
    if (result.ok) void refresh();
  };

  const toggleRedirect = async (domain: DomainRecord, field: 'redirectWww' | 'forceHttps') => {
    setBusyId(domain.id);
    const patch = field === 'redirectWww' ? { redirectWww: !domain.redirectWww } : { forceHttps: !domain.forceHttps };
    const result = await updateDomainRedirects(domain.id, patch);
    setBusyId(null);
    onNotify(result.message);
    if (result.ok) void refresh();
  };

  const handleVerify = async (domain: DomainRecord) => {
    setBusyId(domain.id);
    const result = await verifyDomain(domain.id);
    setBusyId(null);
    onNotify(result.message);
  };

  if (loading) {
    return <div className="publish-empty"><Loader2 className="spin" size={16} /> Loading domains…</div>;
  }

  return (
    <div className="domains-panel">
      {!providerConfigured && (
        <div className="publish-warning">
          <AlertTriangle size={14} />
          <span>Hosting provider not configured — domains can be added but cannot be verified yet.</span>
        </div>
      )}

      <div className="domains-add">
        <div className="domains-add-input">
          <Globe size={15} />
          <input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void handleAdd(); }}
            placeholder="example.com"
            aria-label="Hostname"
          />
        </div>
        <select value={environment} onChange={(event) => setEnvironment(event.target.value as DeploymentEnvironment)} aria-label="Environment">
          {ENV_OPTIONS.map((env) => <option key={env} value={env}>{env.charAt(0).toUpperCase() + env.slice(1)}</option>)}
        </select>
        <button className="publish-cta" disabled={adding || !hostname.trim()} onClick={() => void handleAdd()}>
          {adding ? <Loader2 className="spin" size={14} /> : <Plus size={14} />} Add domain
        </button>
      </div>

      {domains.length === 0 ? (
        <div className="publish-empty">
          <Globe size={22} />
          <span>No custom domains yet. Add a hostname to connect it to your project.</span>
        </div>
      ) : (
        <div className="domains-list">
          {domains.map((domain) => (
            <div key={domain.id} className={`domain-card ${domain.isPrimary ? 'primary' : ''}`}>
              <div className="domain-head">
                <div className="domain-name">
                  {domain.isPrimary && <Star size={14} />}
                  <b>{domain.hostname}</b>
                  <span className={`domain-status ${domain.status}`}>{domain.status}</span>
                  <span className={`ssl-status ${domain.sslStatus}`}>TLS {SSL_LABELS[domain.sslStatus]}</span>
                </div>
                <div className="domain-actions">
                  <button
                    className={domain.isPrimary ? 'primary-active' : ''}
                    title={domain.isPrimary ? 'Primary domain' : 'Set as primary'}
                    onClick={() => void togglePrimary(domain)}
                    disabled={busyId === domain.id}
                  >
                    <Star size={14} />{domain.isPrimary ? 'Primary' : 'Make primary'}
                  </button>
                  <button title="Check verification" onClick={() => void handleVerify(domain)} disabled={busyId === domain.id}>
                    <ShieldCheck size={14} /> Verify
                  </button>
                  <button title="Remove domain" onClick={() => setConfirmRemove(domain)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="domain-foot">
                <label className="domain-check">
                  <input type="checkbox" checked={domain.redirectWww} onChange={() => void toggleRedirect(domain, 'redirectWww')} />
                  Redirect www ↔ apex
                </label>
                <label className="domain-check">
                  <input type="checkbox" checked={domain.forceHttps} onChange={() => void toggleRedirect(domain, 'forceHttps')} />
                  Force HTTPS
                </label>
                <span className="domain-env">{domain.environment}</span>
              </div>
              {domain.status === 'pending' && !providerConfigured && (
                <div className="domain-note"><Info size={12} /> Verification requires a configured hosting provider. Add one in project settings.</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="publish-refresh" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</button>

      {confirmRemove && (
        <div className="asset-dialog-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header"><h3>Remove domain</h3><button onClick={() => setConfirmRemove(null)} aria-label="Close"><X size={15} /></button></div>
            <p className="asset-dialog-copy">Remove <b>{confirmRemove.hostname}</b>? This does not affect published deployments, but the domain will no longer be attached to this project.</p>
            <div className="asset-dialog-actions column">
              <button className="danger" onClick={() => void handleRemove()}>Remove domain</button>
              <button onClick={() => setConfirmRemove(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}