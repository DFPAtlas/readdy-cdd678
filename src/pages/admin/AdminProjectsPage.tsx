import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminProjectRow, type ProjectSummary, type AdminProjectDetail } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { SectionTitle, LoadingState, ErrorState, EmptyState, StatusPill, StatCard, formatDate, formatBytes } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';

const PLAN_OPTIONS = ['free', 'starter', 'builder', 'pro', 'agency'];
const STATUS_OPTIONS = ['active', 'draft', 'archived'];
const BUILD_STATE_OPTIONS = ['success', 'failed', 'running', 'queued'];

const PAGE_SIZE = 25;

export default function AdminProjectsPage() {
  const admin = useAdmin();
  const canInspect = hasPermission(admin, 'projects.inspect');
  const canSupport = hasPermission(admin, 'support.mode');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [buildState, setBuildState] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminProjectRow[] | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.projectsList({ query, status: status || undefined, plan: plan || undefined, buildState: buildState || undefined, page, pageSize: PAGE_SIZE });
    if (res.ok) {
      setRows(res.data.projects);
      setSummary(res.data.summary);
      setTotal(res.data.total);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [query, status, plan, buildState, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [query, status, plan, buildState]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setFeedback('');
    const res = await adminApi.projectGet(id);
    if (res.ok) setDetail(res.data.project);
    else setFeedback(res.message);
    setDetailLoading(false);
  };

  const startSupport = async (projectId: string) => {
    const reason = window.prompt('Reason for this support session?');
    if (!reason || !reason.trim()) return;
    const res = await adminApi.supportStart(projectId, reason.trim(), 30);
    setFeedback(res.ok ? 'Support mode started (read-only, 30 min).' : res.message);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle
        title="Projects"
        description="Monitor projects across the Forge platform."
        action={<Button variant="secondary" size="sm" icon={<i className="ri-refresh-line" />} onClick={load}>Refresh</Button>}
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total projects" value={summary.totalProjects} icon="ri-folder-3-line" tone="amber" />
          <StatCard label="Active" value={summary.activeProjects} icon="ri-checkbox-circle-line" tone="success" />
          <StatCard label="Build problems" value={summary.failedBuilds} icon="ri-error-warning-line" tone="warning" />
          <StatCard label="Created (7d)" value={summary.recentProjects} icon="ri-add-line" tone="accent" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted text-sm" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by project name or slug…"
            className="w-full h-8 pl-8 pr-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All plans</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={buildState} onChange={(e) => setBuildState(e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All build states</option>
          {BUILD_STATE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {feedback && <span className="text-xs text-forge-success whitespace-nowrap">{feedback}</span>}
      </div>

      {loading ? <LoadingState label="Loading projects…" /> : error ? <ErrorState message={error} onRetry={load} /> : !rows || rows.length === 0 ? <EmptyState message="No projects match these filters." /> : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Project</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Owner</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Pages</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Build</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Plan</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Storage</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted whitespace-nowrap">Updated</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2">
                        <p className="text-sm text-forge-text-primary">{p.name}</p>
                        <p className="text-xs text-forge-text-muted">/{p.slug}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary">{p.ownerEmail ?? p.ownerName ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-forge-text-secondary">{p.pageCount}</td>
                      <td className="px-3 py-2"><StatusPill status={p.latestBuildStatus} /></td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary capitalize">{p.plan ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatBytes(p.storageBytes)}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(p.updatedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {canInspect && <Button size="sm" variant="ghost" onClick={() => openDetail(p.id)}><i className="ri-eye-line" /> Inspect</Button>}
                          {canSupport && <Button size="sm" variant="ghost" onClick={() => startSupport(p.id)}><i className="ri-lifebuoy-line" /> Support</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-center justify-between mt-3 text-xs text-forge-text-muted">
            <span>{total} project{total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ri-arrow-left-s-line" /> Prev</Button>
              <span>Page {page} of {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <i className="ri-arrow-right-s-line" /></Button>
            </div>
          </div>
        </>
      )}

      <Drawer open={!!detail || detailLoading} onClose={() => setDetail(null)} title="Project detail" position="right" width="w-[480px]">
        {detailLoading ? <div className="p-4"><LoadingState label="Loading project…" /></div> : detail && (
          <div className="p-4 space-y-5">
            <section>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-forge-text-primary">{detail.name}</h4>
                <StatusPill status={detail.status} />
              </div>
              <p className="text-xs text-forge-text-muted">/{detail.slug}{detail.workspaceName ? ` · ${detail.workspaceName}` : ''}</p>
            </section>

            {/* Owner */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Owner</h4>
              <div className="rounded-md bg-forge-panel-elevated p-3 text-sm">
                <p className="text-forge-text-primary">{detail.owner.displayName ?? detail.owner.email ?? '—'}</p>
                {detail.owner.email && <p className="text-xs text-forge-text-muted">{detail.owner.email}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-forge-text-secondary capitalize">{detail.owner.plan ?? '—'}</span>
                  <StatusPill status={detail.owner.subscriptionStatus} />
                </div>
              </div>
            </section>

            {/* Metadata */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta label="Pages" value={detail.pageCount} />
                <Meta label="Members" value={detail.memberCount} />
                <Meta label="Builds" value={detail.buildCount} />
                <Meta label="Deployments" value={detail.deploymentCount} />
                <Meta label="Domains" value={detail.domainCount} />
                <Meta label="Forms" value={detail.formCount} />
                <Meta label="AI jobs" value={detail.aiJobCount} />
                <Meta label="Storage" value={formatBytes(detail.storageBytes)} />
              </div>
            </section>

            {/* Latest build */}
            {detail.latestBuild && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Latest build</h4>
                <div className="rounded-md bg-forge-panel-elevated p-3 flex items-center justify-between text-sm">
                  <span className="text-forge-text-primary">{detail.latestBuild.version ?? detail.latestBuild.id.slice(0, 8)}</span>
                  <StatusPill status={detail.latestBuild.status} />
                </div>
              </section>
            )}

            {/* Members */}
            {detail.members.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Members</h4>
                <div className="space-y-1">
                  {detail.members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-1 border-b border-forge-border-subtle last:border-0">
                      <span className="text-forge-text-secondary">{m.displayName ?? m.email ?? '—'}</span>
                      <span className="text-forge-text-muted capitalize">{m.role}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent issues */}
            {detail.recentIssues.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Recent issues</h4>
                <div className="space-y-1">
                  {detail.recentIssues.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-forge-border-subtle last:border-0">
                      <span className="text-forge-text-secondary capitalize">{r.kind}</span>
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent deployments */}
            {detail.recentDeployments.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted mb-2">Recent deployments</h4>
                <div className="space-y-1">
                  {detail.recentDeployments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b border-forge-border-subtle last:border-0">
                      <span className="text-forge-text-muted capitalize">{d.environment}</span>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-forge-panel-elevated px-2.5 py-2">
      <p className="text-[10px] text-forge-text-muted">{label}</p>
      <p className="text-sm font-medium text-forge-text-primary">{value}</p>
    </div>
  );
}