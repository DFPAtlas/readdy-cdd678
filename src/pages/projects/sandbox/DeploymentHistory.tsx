import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Globe, AlertTriangle, Info, Loader2, RefreshCw, ExternalLink, ChevronDown, Check, X } from 'lucide-react';
import {
  listDeployments, listDeploymentEvents, rollbackDeployment, unpublishDeployment,
  DEPLOYMENT_STATUS_LABELS, ENVIRONMENT_LABELS,
  type DeploymentEnvironment, type DeploymentEvent, type DeploymentRecord, type DeploymentStatus,
} from './sandboxPublish';

const ENV_FILTERS: Array<'all' | DeploymentEnvironment> = ['all', 'preview', 'staging', 'production'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function durationMs(value: number | null): string {
  if (value == null) return '—';
  return `${(value / 1000).toFixed(1)}s`;
}

export default function DeploymentHistory({ onNotify }: { onNotify: (message: string) => void }) {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState<'all' | DeploymentEnvironment>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeploymentStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'rollback' | 'unpublish'; deployment: DeploymentRecord } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const list = await listDeployments();
    setDeployments(list);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => deployments.filter((deployment) => {
    if (envFilter !== 'all' && deployment.environment !== envFilter) return false;
    if (statusFilter !== 'all' && deployment.status !== statusFilter) return false;
    return true;
  }), [deployments, envFilter, statusFilter]);

  const toggleDetails = async (deployment: DeploymentRecord) => {
    if (expandedId === deployment.id) { setExpandedId(null); return; }
    setExpandedId(deployment.id);
    const list = await listDeploymentEvents(deployment.id);
    setEvents(list);
  };

  const handleRollback = async () => {
    if (!confirm) return;
    setBusyId(confirm.deployment.id);
    const result = await rollbackDeployment(confirm.deployment.id);
    setBusyId(null);
    setConfirm(null);
    onNotify(result.ok ? 'Rollback requested' : result.message);
    void refresh();
  };

  const handleUnpublish = async () => {
    if (!confirm) return;
    setBusyId(confirm.deployment.id);
    const result = await unpublishDeployment(confirm.deployment.id);
    setBusyId(null);
    setConfirm(null);
    onNotify(result.ok ? 'Unpublish requested' : result.message);
    void refresh();
  };

  if (loading) {
    return <div className="publish-empty"><Loader2 className="spin" size={16} /> Loading deployment history…</div>;
  }

  return (
    <div className="history-panel">
      <div className="history-filters">
        <select value={envFilter} onChange={(event) => setEnvFilter(event.target.value as typeof envFilter)} aria-label="Filter by environment">
          <option value="all">All environments</option>
          {ENV_FILTERS.filter((env) => env !== 'all').map((env) => (
            <option key={env} value={env}>{ENVIRONMENT_LABELS[env]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {Object.keys(DEPLOYMENT_STATUS_LABELS).map((status) => (
            <option key={status} value={status}>{DEPLOYMENT_STATUS_LABELS[status as DeploymentStatus]}</option>
          ))}
        </select>
        <button className="publish-refresh" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="publish-empty">
          <Globe size={22} />
          <span>{deployments.length === 0 ? 'No deployments yet. Publish your project to create the first one.' : 'No deployments match the current filters.'}</span>
        </div>
      ) : (
        <div className="deployment-list">
          {filtered.map((deployment) => (
            <div key={deployment.id} className={`deployment-row ${expandedId === deployment.id ? 'expanded' : ''}`}>
              <div className="deployment-main" onClick={() => void toggleDetails(deployment)}>
                <div className="deployment-topline">
                  <span className={`deployment-status ${deployment.status}`}>{DEPLOYMENT_STATUS_LABELS[deployment.status]}</span>
                  <span className="deployment-env">{ENVIRONMENT_LABELS[deployment.environment]}</span>
                  {deployment.status === 'active' && <span className="deployment-active-badge"><Check size={11} /> Active</span>}
                  <span className="deployment-time">{formatDate(deployment.createdAt)}</span>
                  <ChevronDown size={14} className={expandedId === deployment.id ? 'rotate' : ''} />
                </div>
                <div className="deployment-sub">
                  {deployment.deploymentUrl ? (
                    <a href={deployment.deploymentUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}><ExternalLink size={11} /> {deployment.deploymentUrl}</a>
                  ) : (
                    <span className="deployment-no-url">No deployment URL</span>
                  )}
                  <span className="deployment-meta">
                    {deployment.provider ? `Provider: ${deployment.provider}` : 'Provider: not configured'}
                    {deployment.durationMs != null ? ` · ${durationMs(deployment.durationMs)}` : ''}
                  </span>
                </div>
              </div>

              {expandedId === deployment.id && (
                <div className="deployment-detail">
                  {deployment.errorMessage && (
                    <div className="deployment-error"><AlertTriangle size={13} /> {deployment.errorMessage}</div>
                  )}
                  <div className="deployment-actions">
                    {(deployment.status === 'active' || deployment.status === 'completed') && (
                      <button onClick={() => setConfirm({ action: 'rollback', deployment })} disabled={busyId === deployment.id}>
                        <RotateCcw size={13} /> Roll back to this version
                      </button>
                    )}
                    {deployment.status === 'active' && (
                      <button className="danger" onClick={() => setConfirm({ action: 'unpublish', deployment })} disabled={busyId === deployment.id}>
                        Unpublish
                      </button>
                    )}
                  </div>
                  {events.length > 0 ? (
                    <div className="deployment-events">
                      {events.map((event) => (
                        <div key={event.id} className="deployment-event">
                          <span className="event-type">{event.eventType.replace(/_/g, ' ')}</span>
                          <span className="event-message">{event.message}</span>
                          <span className="event-time">{formatDate(event.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="deployment-events-empty"><Info size={12} /> No events recorded.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className="asset-dialog-overlay" onClick={() => setConfirm(null)}>
          <div className="asset-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="asset-dialog-header">
              <h3>{confirm.action === 'rollback' ? 'Roll back' : 'Unpublish'}</h3>
              <button onClick={() => setConfirm(null)} aria-label="Close"><X size={15} /></button>
            </div>
            <p className="asset-dialog-copy">
              {confirm.action === 'rollback'
                ? `Roll back to the ${ENVIRONMENT_LABELS[confirm.deployment.environment]} deployment from ${formatDate(confirm.deployment.createdAt)}? A new deployment will be created; existing history is preserved.`
                : `Unpublish the ${ENVIRONMENT_LABELS[confirm.deployment.environment]} deployment? Live traffic for this environment will be disabled, but source versions, artifacts and history are preserved.`}
            </p>
            <div className="asset-dialog-actions column">
              <button className={confirm.action === 'unpublish' ? 'danger' : 'primary'} onClick={() => void (confirm.action === 'rollback' ? handleRollback() : handleUnpublish())} disabled={busyId === confirm.deployment.id}>
                {busyId === confirm.deployment.id ? <Loader2 className="spin" size={14} /> : null} {confirm.action === 'rollback' ? 'Roll back' : 'Unpublish'}
              </button>
              <button onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}