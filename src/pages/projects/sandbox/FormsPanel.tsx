import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox, MailOpen, ShieldAlert, BarChart3, Plug, RefreshCw, Search, X,
  Trash2, Download, ChevronRight, ArrowLeft, CheckCircle2, Circle,
} from 'lucide-react';
import type { SandboxDocument } from './sandboxPersistence';
import {
  extractFormElements, listSubmissions, listIntegrations, listDeliveryEvents,
  updateSubmissionStatus, deleteSubmission, saveIntegration, syncForms,
  submissionsToCsv, downloadCsv, computeAnalytics, primaryContact,
  SUBMISSION_STATUS_LABELS, type SubmissionRecord, type SubmissionStatus, type FormIntegrationRecord, type DeliveryEventRecord,
} from './sandboxForms';

type FormsPanelProps = {
  document: SandboxDocument;
  onNotify: (message: string) => void;
};

type Tab = 'inbox' | 'spam' | 'analytics' | 'integrations';

const STATUS_FILTERS: Array<{ key: SubmissionStatus; label: string }> = [
  { key: 'unread', label: 'Unread' },
  { key: 'processed', label: 'Processed' },
  { key: 'archived', label: 'Archived' },
];

export default function FormsPanel({ document, onNotify }: FormsPanelProps) {
  const [tab, setTab] = useState<Tab>('inbox');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus>('unread');
  const [search, setSearch] = useState('');
  const [selectedFormName, setSelectedFormName] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SubmissionRecord | null>(null);
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEventRecord[]>([]);
  const [integrations, setIntegrations] = useState<FormIntegrationRecord[]>([]);
  const [syncState, setSyncState] = useState<'idle' | 'syncing'>('idle');

  const forms = useMemo(() => extractFormElements(document), [document]);
  const activeFormName = selectedFormName || forms[0]?.name || '';
  const activeForm = forms.find((form) => form.name === activeFormName);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listSubmissions({ status: tab === 'spam' ? 'spam' : statusFilter, search: search || undefined });
    setSubmissions(result);
    setLoading(false);
  }, [statusFilter, search, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (detail) {
      void listDeliveryEvents(detail.id).then(setDeliveryEvents);
    }
  }, [detail]);

  useEffect(() => {
    if (activeForm) {
      void listIntegrations(activeForm.elementId).then((rows) => {
        // integrations are keyed by form_id (DB), not element id; show all
        setIntegrations(rows);
      });
    }
  }, [activeForm, tab]);

  const analytics = useMemo(() => computeAnalytics(submissions), [submissions]);

  const handleSync = async () => {
    setSyncState('syncing');
    const result = await syncForms(document);
    setSyncState('idle');
    onNotify(result.message);
  };

  const openDetail = (submission: SubmissionRecord) => {
    setDetail(submission);
    setDeliveryEvents([]);
  };

  const setStatus = async (status: SubmissionStatus) => {
    if (!detail) return;
    const result = await updateSubmissionStatus(detail.id, status);
    onNotify(result.message);
    setDetail({ ...detail, status });
    void refresh();
  };

  const handleDelete = async () => {
    if (!detail) return;
    const result = await deleteSubmission(detail.id);
    onNotify(result.message);
    setDetail(null);
    void refresh();
  };

  const handleExport = () => {
    if (!submissions.length) return onNotify('No submissions to export');
    downloadCsv(submissionsToCsv(submissions, activeFormName || 'submissions'), `${(activeFormName || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-submissions.csv`);
    onNotify('CSV exported');
  };

  if (detail) {
    return <SubmissionDetail submission={detail} events={deliveryEvents} onBack={() => setDetail(null)} onStatus={setStatus} onDelete={handleDelete} onNotify={onNotify} />;
  }

  return (
    <div className="forms-panel">
      <div className="forms-toolbar">
        <div className="forms-form-select">
          <select value={activeFormName} onChange={(event) => setSelectedFormName(event.target.value)} aria-label="Select form">
            {forms.length === 0 && <option value="">No forms yet</option>}
            {forms.map((form) => <option key={form.elementId} value={form.name}>{form.name}</option>)}
          </select>
        </div>
        <button className="forms-sync" onClick={() => void handleSync()} disabled={syncState === 'syncing'}>
          <RefreshCw className={syncState === 'syncing' ? 'spin' : ''} size={13} /> {syncState === 'syncing' ? 'Syncing…' : 'Sync forms'}
        </button>
      </div>

      <div className="forms-tabs">
        <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}><Inbox size={14} /> Inbox</button>
        <button className={tab === 'spam' ? 'active' : ''} onClick={() => setTab('spam')}><ShieldAlert size={14} /> Spam</button>
        <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}><BarChart3 size={14} /> Analytics</button>
        <button className={tab === 'integrations' ? 'active' : ''} onClick={() => setTab('integrations')}><Plug size={14} /> Integrations</button>
      </div>

      {tab === 'inbox' && (
        <>
          <div className="forms-subtabs">
            {STATUS_FILTERS.map((filter) => (
              <button key={filter.key} className={statusFilter === filter.key ? 'active' : ''} onClick={() => setStatusFilter(filter.key)}>
                {filter.label}{analytics[filter.key] > 0 && <b>{analytics[filter.key]}</b>}
              </button>
            ))}
            <div className="forms-search">
              <Search size={13} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search submissions…" />
            </div>
            <button className="forms-export" onClick={handleExport}><Download size={13} /> CSV</button>
          </div>
          <SubmissionList submissions={submissions} loading={loading} onOpen={openDetail} />
        </>
      )}

      {tab === 'spam' && (
        <>
          <p className="forms-note">Suspicious submissions are kept here rather than silently deleted, so you can review them. Spam score reflects honeypot triggers and URL counts.</p>
          <SubmissionList submissions={submissions} loading={loading} onOpen={openDetail} showSpam />
        </>
      )}

      {tab === 'analytics' && (
        <div className="forms-analytics">
          <div className="analytics-grid">
            <Stat label="Total submissions" value={analytics.total} />
            <Stat label="Unread" value={analytics.unread} />
            <Stat label="Processed" value={analytics.processed} />
            <Stat label="Last 30 days" value={analytics.last30Days} />
          </div>
          <div className="analytics-row">
            <div className="analytics-bar"><span>Spam rate</span><b>{analytics.spamRate}%</b><i><em style={{ width: `${analytics.spamRate}%` }} /></i></div>
            <div className="analytics-bar"><span>Unread rate</span><b>{analytics.total ? Math.round((analytics.unread / analytics.total) * 100) : 0}%</b><i><em style={{ width: `${analytics.total ? Math.round((analytics.unread / analytics.total) * 100) : 0}%` }} /></i></div>
          </div>
          <p className="forms-note">Analytics are privacy-conscious — no raw form values are stored in analytics events.</p>
        </div>
      )}

      {tab === 'integrations' && (
        <IntegrationsTab formId={activeForm?.elementId ?? ''} formName={activeFormName} onNotify={onNotify} onReload={refresh} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="analytics-stat"><b>{value}</b><span>{label}</span></div>;
}

function SubmissionList({ submissions, loading, onOpen, showSpam }: { submissions: SubmissionRecord[]; loading: boolean; onOpen: (submission: SubmissionRecord) => void; showSpam?: boolean }) {
  if (loading) return <div className="forms-empty"><RefreshCw className="spin" size={18} /> Loading submissions…</div>;
  if (!submissions.length) return <div className="forms-empty"><MailOpen size={22} /> No submissions here yet.</div>;
  return (
    <div className="submission-list">
      {submissions.map((submission) => (
        <button key={submission.id} className="submission-row" onClick={() => onOpen(submission)}>
          <span className="submission-ref">{submission.reference}</span>
          <span className="submission-contact">{primaryContact(submission)}</span>
          <span className="submission-date">{new Date(submission.createdAt).toLocaleString()}</span>
          {showSpam && <span className="submission-spam">spam {submission.spamScore ?? '—'}</span>}
          <span className={`submission-status ${submission.status}`}>{SUBMISSION_STATUS_LABELS[submission.status]}</span>
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
}

function SubmissionDetail({ submission, events, onBack, onStatus, onDelete, onNotify }: {
  submission: SubmissionRecord;
  events: DeliveryEventRecord[];
  onBack: () => void;
  onStatus: (status: SubmissionStatus) => void;
  onDelete: () => void;
  onNotify: (message: string) => void;
}) {
  const data = Object.entries(submission.submittedData).filter(([key]) => !key.startsWith('__'));
  return (
    <div className="submission-detail">
      <div className="submission-detail-header">
        <button className="back" onClick={onBack}><ArrowLeft size={14} /> Back</button>
        <span className="submission-ref">{submission.reference}</span>
        <div className="submission-detail-actions">
          <button onClick={() => { navigator.clipboard.writeText(submission.reference); onNotify('Reference copied'); }}>Copy ref</button>
          <button className="danger" onClick={onDelete}><Trash2 size={13} /> Delete</button>
        </div>
      </div>

      <div className="submission-fields">
        {data.length === 0 && <p className="forms-note">No field values recorded.</p>}
        {data.map(([key, value]) => (
          <div key={key} className="submission-field">
            <span>{key}</span>
            <b>{Array.isArray(value) ? value.join(', ') : String(value)}</b>
          </div>
        ))}
      </div>

      {submission.consentData && (
        <div className="submission-consent">
          <strong>Consent</strong>
          <p>{(submission.consentData as Record<string, unknown>).wording as string}</p>
          <span>Consented at {(submission.consentData as Record<string, unknown>).timestamp as string}</span>
        </div>
      )}

      <div className="submission-meta">
        <span>Source: {submission.sourceDomain || '—'}</span>
        <span>Submitted: {new Date(submission.createdAt).toLocaleString()}</span>
        <span>Spam score: {submission.spamScore ?? '—'}</span>
      </div>

      <div className="submission-delivery">
        <strong>Delivery history</strong>
        {events.length === 0 && <p className="forms-note">No delivery attempts recorded.</p>}
        {events.map((event) => (
          <div key={event.id} className={`delivery-event ${event.status}`}>
            <span>{event.eventType}</span>
            <b>{event.status}</b>
            {event.safeErrorMessage && <em>{event.safeErrorMessage}</em>}
          </div>
        ))}
      </div>

      <div className="submission-status-controls">
        <button className={submission.status === 'unread' ? 'active' : ''} onClick={() => onStatus('unread')}><Circle size={13} /> Unread</button>
        <button className={submission.status === 'processed' ? 'active' : ''} onClick={() => onStatus('processed')}><CheckCircle2 size={13} /> Processed</button>
        <button className={submission.status === 'archived' ? 'active' : ''} onClick={() => onStatus('archived')}><X size={13} /> Archive</button>
      </div>
    </div>
  );
}

function IntegrationsTab({ formId, formName, onNotify, onReload }: { formId: string; formName: string; onNotify: (message: string) => void; onReload: () => void }) {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [integrationType, setIntegrationType] = useState<'webhook' | 'n8n'>('webhook');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!formId) return onNotify('Select a form first');
    if (!destinationUrl.trim()) return onNotify('Enter a destination URL');
    if (!/^https?:\/\//i.test(destinationUrl.trim())) return onNotify('Destination must be an http(s) URL');
    setBusy(true);
    const result = await saveIntegration(formId, integrationType, { destinationUrl: destinationUrl.trim(), events: ['form.submission.created'], enabled: true });
    setBusy(false);
    onNotify(result.message);
    void onReload();
  };

  return (
    <div className="forms-integrations">
      <div className="integration-block">
        <div className="integration-title">Webhook / n8n</div>
        <p className="forms-note">Send signed (HMAC-SHA256) webhooks on new submissions. Fully supported in this phase. Other integrations show as “Not configured”.</p>
        <label className="fb-label">Type
          <select value={integrationType} onChange={(event) => setIntegrationType(event.target.value as 'webhook' | 'n8n')}>
            <option value="webhook">Generic webhook</option>
            <option value="n8n">n8n webhook</option>
          </select>
        </label>
        <label className="fb-label">Destination URL<input value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} placeholder="https://…" /></label>
        <button className="integration-save" onClick={() => void handleSave()} disabled={busy}>{busy ? 'Saving…' : 'Save integration'}</button>
      </div>

      {['zapier', 'make', 'slack', 'hubspot', 'airtable', 'supabase', 'resend'].map((name) => (
        <div key={name} className="integration-block disabled">
          <div className="integration-title">{name.charAt(0).toUpperCase() + name.slice(1)}</div>
          <p className="forms-note">Not configured.</p>
        </div>
      ))}
    </div>
  );
}