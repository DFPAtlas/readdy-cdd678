import { useCallback, useEffect, useState } from 'react';
import { adminApi, type FeatureFlag } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type AnnouncementConfig = {
  title?: string; message?: string; audience?: string; startsAt?: string | null; endsAt?: string | null;
};

function cfg(f: FeatureFlag): AnnouncementConfig {
  return (f.configuration as AnnouncementConfig | null) ?? {};
}

const AUDIENCES = [
  { value: 'all', label: 'All users' },
  { value: 'paid', label: 'Paid subscribers' },
  { value: 'free', label: 'Free / trial' },
  { value: 'owners', label: 'Workspace owners' },
];

export default function AnnouncementsPage() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'flags.manage');
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.flagsList();
    if (res.ok) setFlags(res.data.flags.filter((f) => f.flag_key.startsWith('announcement.')));
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!title.trim()) { setFeedback('A title is required.'); return; }
    const reason = window.prompt('Reason for this announcement?');
    if (reason === null) return;
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    setBusy(true);
    setFeedback('');
    const res = await adminApi.flagsSet(`announcement.${slug}`, true, reason, {
      title: title.trim(), message: message.trim(), audience, startsAt: startsAt || null, endsAt: endsAt || null,
    });
    setBusy(false);
    setFeedback(res.ok ? 'Announcement published.' : res.message);
    if (res.ok) { setTitle(''); setMessage(''); setStartsAt(''); setEndsAt(''); }
    load();
  };

  const toggle = async (flagKey: string, enabled: boolean) => {
    const reason = window.prompt(`Reason for ${enabled ? 'publishing' : 'unpublishing'} this announcement?`);
    if (reason === null) return;
    setFeedback('');
    const res = await adminApi.flagsSet(flagKey, enabled, reason);
    setFeedback(res.ok ? 'Updated.' : res.message);
    load();
  };

  return (
    <div>
      <SectionTitle title="Announcements" description="Platform-wide in-app announcements. No email broadcast is sent from here." />

      {canManage && (
        <Card className="mb-6 max-w-2xl">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Publish an announcement</h3>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 w-full px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="Message (optional, up to 500 characters)" rows={3} className="w-full px-3 py-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber resize-none" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber">
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber" aria-label="Start date" />
              <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber" aria-label="End date" />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" loading={busy} onClick={publish}>Publish</Button>
              {feedback && <span className="text-xs text-forge-success">{feedback}</span>}
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingState label="Loading announcements…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !flags || flags.length === 0 ? (
        <EmptyState message="No announcements published." />
      ) : (
        <div className="space-y-2">
          {flags.map((f) => {
            const c = cfg(f);
            return (
              <Card key={f.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-forge-text-primary">{c.title ?? f.flag_key.replace('announcement.', '').replace(/-/g, ' ')}</p>
                    {c.message && <p className="text-xs text-forge-text-secondary mt-1 whitespace-pre-wrap">{c.message}</p>}
                    <p className="text-[10px] text-forge-text-muted font-mono mt-1">{f.flag_key} · {formatDate(f.updated_at)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-1.5 py-0 rounded bg-forge-border text-[10px] text-forge-text-secondary capitalize">{c.audience ?? 'all'}</span>
                      {c.startsAt && <span className="px-1.5 py-0 rounded bg-forge-border text-[10px] text-forge-text-secondary">from {c.startsAt}</span>}
                      {c.endsAt && <span className="px-1.5 py-0 rounded bg-forge-border text-[10px] text-forge-text-secondary">to {c.endsAt}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusPill status={f.enabled ? 'healthy' : 'disabled'} />
                    {canManage && (
                      <Button size="sm" variant={f.enabled ? 'danger' : 'secondary'} onClick={() => toggle(f.flag_key, !f.enabled)}>
                        {f.enabled ? 'Unpublish' : 'Publish'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-forge-text-muted mt-4">Announcements are stored as feature flags; they do not send email and do not act as security or entitlement controls.</p>
    </div>
  );
}