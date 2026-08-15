import { useCallback, useEffect, useState } from 'react';
import { adminApi, type TemplateRow, type FormStats } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ModerationSection() {
  const admin = useAdmin();
  const canModerate = hasPermission(admin, 'templates.moderate');
  const canForms = hasPermission(admin, 'forms.read');
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [t, f] = await Promise.all([
      adminApi.templatesQueue(),
      canForms ? adminApi.formsStats() : Promise.resolve(null),
    ]);
    if (t.ok) setTemplates(t.data.templates);
    else setError(t.message);
    if (f && f.ok) setStats(f.data.stats);
    setLoading(false);
  }, [canForms]);

  useEffect(() => { load(); }, [load]);

  const act = async (templateId: string, status: string, needsReason: boolean) => {
    let reason = '';
    if (needsReason) {
      const r = window.prompt(`Reason for ${status}?`);
      if (!r) return;
      reason = r;
    }
    setFeedback('');
    const res = await adminApi.templatesModerate(templateId, status, reason);
    setFeedback(res.ok ? `Template ${status}.` : res.message);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <SectionTitle title="Templates & Forms" description="Community-template moderation and aggregate delivery health." />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MiniStat label="Total submissions" value={stats.totalSubmissions} />
          <MiniStat label="Delivery failures" value={stats.deliveryFailures} tone={stats.deliveryFailures > 0 ? 'warning' : 'muted'} />
          <MiniStat label="Spam rate" value={`${(stats.spamRate * 100).toFixed(1)}%`} />
          <MiniStat label="File-scan backlog" value={stats.fileScanBacklog} />
        </div>
      )}

      {feedback && <p className="mb-3 text-xs text-forge-success">{feedback}</p>}

      <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Moderation queue</h3>
      {!templates || templates.length === 0 ? <EmptyState message="No templates awaiting moderation." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Template</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Licence</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Updated</th>
                {canModerate && <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                  <td className="px-3 py-2">
                    <p className="text-sm text-forge-text-primary">{String(t.name ?? '—')}</p>
                    <p className="text-xs text-forge-text-muted">{String(t.description ?? '').slice(0, 60)}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-forge-text-secondary">{String(t.licence_key ?? '—')}</td>
                  <td className="px-3 py-2"><StatusPill status={String(t.moderation_status ?? '')} /></td>
                  <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(String(t.updated_at ?? ''))}</td>
                  {canModerate && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => act(t.id, 'approved', false)}><i className="ri-check-line" /> Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(t.id, 'changes_requested', true)}><i className="ri-message-3-line" /> Changes</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(t.id, 'rejected', true)}><i className="ri-close-line" /> Reject</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(t.id, 'suspended', true)}><i className="ri-forbid-line" /> Suspend</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone = 'muted' }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="h-full">
      <p className="text-lg font-semibold text-forge-text-primary">{value}</p>
      <p className="text-xs text-forge-text-muted">{label}</p>
    </Card>
  );
}