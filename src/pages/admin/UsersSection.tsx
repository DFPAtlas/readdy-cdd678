import { useCallback, useEffect, useState } from 'react';
import { adminApi, type UserRow, type ProjectRow, type ProjectMeta } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function UsersSection() {
  const admin = useAdmin();
  const [view, setView] = useState<'users' | 'projects'>('users');
  return (
    <div>
      <SectionTitle title="Users & Projects" description="Search accounts, inspect project metadata, and run scoped support sessions." />
      <div className="flex items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1 w-fit mb-5">
        <button onClick={() => setView('users')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'users' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>Users</button>
        <button onClick={() => setView('projects')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'projects' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>Projects</button>
      </div>
      {view === 'users' ? <UserList /> : <ProjectList />}
      {admin && <span className="sr-only">{admin.role}</span>}
    </div>
  );
}

function UserList() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'users.manage');
  const canSuspend = hasPermission(admin, 'users.suspend');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.usersList(query);
    if (res.ok) setUsers(res.data.users);
    else setError(res.message);
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, label: string) => {
    setBusy(label);
    setFeedback('');
    const res = await fn();
    setBusy('');
    setFeedback(res.ok ? 'Done.' : res.message ?? 'Action failed.');
    load();
  };

  const promptReason = (defaultMsg: string): string | null => {
    const v = window.prompt(defaultMsg);
    return v && v.trim() ? v.trim() : null;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted text-sm" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full h-8 pl-8 pr-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber"
          />
        </div>
        {feedback && <span className="text-xs text-forge-success">{feedback}</span>}
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : !users || users.length === 0 ? <EmptyState message="No users found." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">User</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Plan</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Projects</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Admin</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Joined</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                  <td className="px-3 py-2">
                    <p className="text-sm text-forge-text-primary">{u.displayName ?? '—'}</p>
                    <p className="text-xs text-forge-text-muted">{u.email ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2"><StatusPill status={u.subscriptionStatus} /><span className="block text-[10px] text-forge-text-muted">{u.plan}</span></td>
                  <td className="px-3 py-2 text-sm text-forge-text-secondary">{u.projectCount}</td>
                  <td className="px-3 py-2 text-xs text-forge-text-secondary">{u.adminRole ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {canSuspend && (
                        <Button size="sm" variant="ghost" onClick={() => { const r = promptReason('Reason for suspending this account?'); if (r) act(() => adminApi.suspendUser(u.id, r), 'suspend'); }}>
                          <i className="ri-forbid-2-line" /> Suspend
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => { const r = promptReason('Reason for restoring this account?'); if (r) act(() => adminApi.restoreUser(u.id, r), 'restore'); }}>
                          <i className="ri-play-circle-line" /> Restore
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.revokeSessions(u.id, 'Manual session revocation'), 'revoke')}>
                          <i className="ri-logout-box-r-line" /> Revoke
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.resetPassword(u.id), 'reset')}>
                          <i className="ri-key-line" /> Reset PW
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ProjectList() {
  const admin = useAdmin();
  const canInspect = hasPermission(admin, 'projects.inspect');
  const canSupport = hasPermission(admin, 'support.mode');
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [detail, setDetail] = useState<ProjectMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.projectsList();
    if (res.ok) setProjects(res.data.projects);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const res = await adminApi.projectGet(id);
    if (res.ok) setDetail(res.data.project);
    else setFeedback(res.message);
  };

  const startSupport = async (projectId: string) => {
    const reason = window.prompt('Reason for this support session?');
    if (!reason) return;
    const res = await adminApi.supportStart(projectId, reason, 30);
    setFeedback(res.ok ? 'Support mode started (read-only, 30 min).' : res.message);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!projects || projects.length === 0) return <EmptyState message="No projects found." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Project</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Owner</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Pages</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                  <td className="px-3 py-2">
                    <p className="text-sm text-forge-text-primary">{p.name}</p>
                    <p className="text-xs text-forge-text-muted">/{p.slug}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-forge-text-secondary">{p.ownerEmail ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-forge-text-secondary">{p.pageCount}</td>
                  <td className="px-3 py-2"><StatusPill status={p.status} /></td>
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
        </Card>
        {feedback && <p className="mt-3 text-xs text-forge-success">{feedback}</p>}
      </div>

      <div>
        {detail ? (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-forge-text-primary">{detail.name}</h3>
              <StatusPill status={detail.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Meta label="Pages" value={detail.pageCount} />
              <Meta label="Members" value={detail.memberCount} />
              <Meta label="Builds" value={detail.buildCount} />
              <Meta label="Deployments" value={detail.deploymentCount} />
              <Meta label="Domains" value={detail.domainCount} />
              <Meta label="Forms" value={detail.formCount} />
              <Meta label="AI jobs" value={detail.aiJobCount} />
            </div>
            {detail.recentDeployments.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-forge-text-secondary mb-1.5">Recent deployments</p>
                <div className="space-y-1">
                  {detail.recentDeployments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="text-forge-text-muted capitalize">{d.environment}</span>
                      <StatusPill status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-forge-text-muted">Select a project to inspect its metadata.</p>
            <p className="text-xs text-forge-text-muted mt-1">Customer content is hidden by default — opening it requires a scoped support session.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-forge-panel-elevated px-2.5 py-2">
      <p className="text-[10px] text-forge-text-muted">{label}</p>
      <p className="text-sm font-medium text-forge-text-primary">{value}</p>
    </div>
  );
}