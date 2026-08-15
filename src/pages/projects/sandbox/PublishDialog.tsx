import { useEffect, useMemo, useState } from 'react';
import { Upload, Rocket, Globe, History, AlertTriangle, Check, Loader2, ShieldCheck } from 'lucide-react';
import {
  getPublishStatus, listDeployments, listDomains, requestDeployment,
  DEPLOYMENT_ENVIRONMENTS, ENVIRONMENT_LABELS,
  type DeploymentEnvironment, type DeploymentRecord, type DomainRecord, type PublishStatus,
} from './sandboxPublish';
import type { ValidationResult } from './sandboxValidation';
import CustomDomains from './CustomDomains';
import DeploymentHistory from './DeploymentHistory';

type PublishTab = 'publish' | 'domains' | 'history';

type PublishDialogProps = {
  projectName: string;
  sourceVersionNumber: number | null;
  validation: ValidationResult;
  hasUnconfiguredForms: boolean;
  onClose: () => void;
  onNotify: (message: string) => void;
  onEnsureCheckpoint: () => Promise<{ versionId: string | null; versionNumber: number | null }>;
};

const ENV_DESCRIPTIONS: Record<DeploymentEnvironment, string> = {
  preview: 'Temporary review URL with noindex. Never replaces production.',
  staging: 'Stable testing on a staging subdomain, separate from production.',
  production: 'Live traffic on your verified domain. Requires explicit confirmation.',
};

export default function PublishDialog({
  projectName, sourceVersionNumber, validation, hasUnconfiguredForms,
  onClose, onNotify, onEnsureCheckpoint,
}: PublishDialogProps) {
  const [tab, setTab] = useState<PublishTab>('publish');
  const [environment, setEnvironment] = useState<DeploymentEnvironment>('preview');
  const [status, setStatus] = useState<PublishStatus>({ providerConfigured: false, allowedEnvironments: DEPLOYMENT_ENVIRONMENTS });
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [latestProduction, setLatestProduction] = useState<DeploymentRecord | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const load = async () => {
    const [pubStatus, domainList, deployments] = await Promise.all([getPublishStatus(), listDomains(), listDeployments()]);
    setStatus(pubStatus);
    setDomains(domainList);
    const production = deployments.find((deployment) => deployment.environment === 'production' && deployment.status === 'active') ?? null;
    setLatestProduction(production);
  };

  useEffect(() => {
    void load();
  }, []);

  const blockingErrors = useMemo(() => validation.blockers > 0, [validation.blockers]);
  const hasVerifiedDomain = domains.some((domain) => domain.status === 'verified');
  const productionDomainMissing = environment === 'production' && domains.length > 0 && !hasVerifiedDomain;

  const handlePublish = async () => {
    if (environment === 'production' && !confirming) {
      setConfirming(true);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const checkpoint = await onEnsureCheckpoint();
    const idempotencyKey = crypto.randomUUID();
    const resultAction = await requestDeployment({
      environment,
      sourceVersionId: checkpoint.versionId,
      buildId: null,
      idempotencyKey,
    });
    setBusy(false);
    if (resultAction.ok) {
      setResult(`Deployment requested for ${ENVIRONMENT_LABELS[environment]}.`);
      setConfirming(false);
      setConfirmText('');
    } else {
      setError(resultAction.message);
      if (resultAction.ok === false && resultAction.deploymentId) {
        // A failed deployment record was created — refresh history to surface it.
        void load();
      }
    }
    void load();
  };

  const productionConfirmed = confirmText === 'PUBLISH';

  return (
    <div className="publish-panel">
      <div className="publish-tabs">
        <button className={tab === 'publish' ? 'active' : ''} onClick={() => setTab('publish')}><Rocket size={14} /> Publish</button>
        <button className={tab === 'domains' ? 'active' : ''} onClick={() => setTab('domains')}><Globe size={14} /> Custom Domains</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History size={14} /> Deployment History</button>
      </div>

      {tab === 'publish' && (
        <div className="publish-body">
          <div className="publish-project">
            <div className="publish-project-name">{projectName}</div>
            <div className="publish-project-meta">
              <span>Source version: <b>{sourceVersionNumber ? `v${sourceVersionNumber}` : 'unsaved'}</b></span>
              <span>Latest production: <b>{latestProduction ? ENVIRONMENT_LABELS[latestProduction.environment] : 'none'}</b></span>
            </div>
          </div>

          <div className="publish-section">
            <div className="publish-section-title">Environment</div>
            <div className="env-selector">
              {DEPLOYMENT_ENVIRONMENTS.map((env) => (
                <button
                  key={env}
                  className={`env-option ${environment === env ? 'active' : ''} ${!status.allowedEnvironments.includes(env) ? 'disabled' : ''}`}
                  onClick={() => { if (status.allowedEnvironments.includes(env)) setEnvironment(env); }}
                  disabled={!status.allowedEnvironments.includes(env)}
                >
                  <span className="env-option-name">{ENVIRONMENT_LABELS[env]}</span>
                  <span className="env-option-desc">{ENV_DESCRIPTIONS[env]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="publish-section">
            <div className="publish-section-title">Hosting provider</div>
            <div className={`provider-status ${status.providerConfigured ? 'ok' : 'missing'}`}>
              {status.providerConfigured ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
              <span>{status.providerConfigured ? 'Hosting provider configured.' : 'Hosting provider not configured.'}</span>
            </div>
          </div>

          {environment === 'production' && domains.length > 0 && (
            <div className="publish-section">
              <div className="publish-section-title">Custom domain</div>
              <select className="publish-select" value={selectedDomainId} onChange={(event) => setSelectedDomainId(event.target.value)} aria-label="Custom domain">
                <option value="">No domain selected</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>{domain.hostname}{domain.isPrimary ? ' (primary)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="publish-section">
            <div className="publish-section-title">Validation</div>
            <div className="publish-validation">
              <span className={validation.blockers ? 'bad' : ''}><AlertTriangle size={12} /> {validation.blockers} blocker(s)</span>
              <span className={validation.errors ? 'bad' : ''}>{validation.errors} error(s)</span>
              <span>{validation.warnings} warning(s)</span>
            </div>
          </div>

          {hasUnconfiguredForms && (
            <div className="publish-warning">
              <AlertTriangle size={14} />
              <span>This project contains forms without a configured submission endpoint. Live submissions will not be collected.</span>
            </div>
          )}
          {productionDomainMissing && (
            <div className="publish-warning">
              <AlertTriangle size={14} />
              <span>No verified custom domain. Production publishing requires a verified domain before traffic can go live.</span>
            </div>
          )}
          {blockingErrors && (
            <div className="publish-error">
              <AlertTriangle size={14} />
              <span>Blocking validation errors must be resolved before publishing.</span>
            </div>
          )}

          {error && (
            <div className="publish-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
          {result && (
            <div className="publish-success">
              <Check size={14} />
              <span>{result}</span>
            </div>
          )}

          {confirming && environment === 'production' && (
            <div className="publish-confirm">
              <div className="publish-confirm-title">Confirm production deployment</div>
              <p className="publish-confirm-copy">
                You are about to publish <b>{projectName}</b> to <b>Production</b>. Live traffic will switch once health checks pass. Type <b>PUBLISH</b> to continue.
              </p>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="Type PUBLISH"
                aria-label="Type PUBLISH to confirm"
              />
            </div>
          )}

          <div className="publish-actions">
            <button
              className="publish-cta"
              disabled={busy || blockingErrors || (environment === 'production' && confirming && !productionConfirmed)}
              onClick={() => void handlePublish()}
            >
              {busy ? <Loader2 className="spin" size={15} /> : <Upload size={15} />}
              {confirming && environment === 'production' ? 'Confirm production publish' : `Publish to ${ENVIRONMENT_LABELS[environment]}`}
            </button>
            <button className="publish-cancel" onClick={onClose}>Cancel</button>
          </div>
        </div>
      )}

      {tab === 'domains' && <CustomDomains onNotify={onNotify} />}
      {tab === 'history' && <DeploymentHistory onNotify={onNotify} />}
    </div>
  );
}