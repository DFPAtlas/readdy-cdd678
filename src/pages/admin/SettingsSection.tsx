import { useCallback, useEffect, useState } from 'react';
import { adminApi, type FeatureFlag, type AdminRecord, type AuditEvent, ADMIN_ROLES, type AdminRole, isOwner } from './forgeAdmin';
import { useAdmin, hasPermission } from './AdminGuard';
import { StatusPill, LoadingState, ErrorState, EmptyState, SectionTitle, formatDate } from './components';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

const MAINTENANCE_SCOPES = [
  { key: 'platform', label: 'Entire platform' },
  { key: 'ai', label: 'AI only' },
  { key: 'publishing', label: 'Publishing only' },
  { key: 'billing', label: 'Billing checkout only' },
  { key: 'forms', label: 'Form processing only' },
  { key: 'templates', label: 'Template submissions only' },
];

export function SettingsSection() {
  const admin = useAdmin();
  const [tab, setTab] = useState<'flags' | 'maintenance' | 'admins' | 'audit' | 'data'>('flags');
  return (
    <div>
      <SectionTitle title="Admin Settings" description="Feature flags, maintenance, admin roles, audit trail and data requests." />
      <div className="flex flex-wrap items-center gap-1 bg-forge-panel border border-forge-border-subtle rounded-lg p-1 w-fit mb-5">
        {([['flags', 'Flags'], ['maintenance', 'Maintenance'], ['admins', 'Admins'], ['audit', 'Audit'], ['data', 'Data']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === k ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-secondary'}`}>{label}</button>
        ))}
      </div>
      {tab === 'flags' && <FlagsTab />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'admins' && <AdminsTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'data' && <DataTab />}
      <span className="sr-only">{admin?.role}</span>
    </div>
  );
}

export function FlagsTab() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'flags.manage');
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.flagsList();
    if (res.ok) setFlags(res.data.flags);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flagKey: string, enabled: boolean) => {
    const reason = window.prompt(`Reason for ${enabled ? 'enabling' : 'disabling'} "${flagKey}"?`);
    if (reason === null) return;
    setFeedback('');
    const res = await adminApi.flagsSet(flagKey, enabled, reason);
    setFeedback(res.ok ? 'Updated.' : res.message);
    load();
  };

  const create = async () => {
    if (!key.trim()) return;
    const reason = window.prompt('Reason for creating this flag?');
    if (reason === null) return;
    setFeedback('');
    const res = await adminApi.flagsSet(key.trim(), false, reason);
    setFeedback(res.ok ? 'Flag created.' : res.message);
    setKey('');
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      {canManage && (
        <div className="flex items-center gap-2 mb-4">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="New flag key (e.g. feature.x)" className="h-8 w-64 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
          <Button size="sm" onClick={create}>Create flag</Button>
          {feedback && <span className="text-xs text-forge-success">{feedback}</span>}
        </div>
      )}
      {!flags || flags.length === 0 ? <EmptyState message="No feature flags defined." /> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Flag key</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">State</th>
                <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Updated</th>
                {canManage && <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                  <td className="px-3 py-2 text-sm text-forge-text-primary font-mono">{f.flag_key}</td>
                  <td className="px-3 py-2"><StatusPill status={f.enabled ? 'healthy' : 'disabled'} /></td>
                  <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(f.updated_at)}</td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant={f.enabled ? 'danger' : 'secondary'} onClick={() => toggle(f.flag_key, !f.enabled)}>{f.enabled ? 'Disable' : 'Enable'}</Button>
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

export function MaintenanceTab() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'maintenance.manage');
  const [modes, setModes] = useState<FeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.maintenanceGet();
    if (res.ok) setModes(res.data.modes);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (scope: string, enabled: boolean) => {
    const reason = window.prompt(`Reason for ${enabled ? 'enabling' : 'disabling'} maintenance on "${scope}"?`);
    if (reason === null) return;
    setFeedback('');
    const res = await adminApi.maintenanceSet(scope, enabled, reason);
    setFeedback(res.ok ? 'Updated.' : res.message);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const enabledMap = new Map((modes ?? []).map((m) => [m.flag_key.replace('maintenance.', ''), m.enabled]));

  return (
    <div>
      <p className="text-xs text-forge-text-muted mb-4">Maintenance preserves read access where safe and never silently discards queued work.</p>
      {feedback && <p className="mb-3 text-xs text-forge-success">{feedback}</p>}
      <div className="space-y-2 max-w-2xl">
        {MAINTENANCE_SCOPES.map((s) => {
          const enabled = enabledMap.get(s.key) ?? false;
          return (
            <Card key={s.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-primary">{s.label}</p>
                <StatusPill status={enabled ? 'identified' : 'closed'} />
              </div>
              {canManage && (
                <Button size="sm" variant={enabled ? 'danger' : 'secondary'} onClick={() => toggle(s.key, !enabled)}>
                  {enabled ? 'Disable' : 'Enable'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function AdminsTab() {
  const admin = useAdmin();
  const owner = isOwner(admin);
  const canManage = hasPermission(admin, 'admins.manage');
  const [admins, setAdmins] = useState<AdminRecord[] | null>(null);
  const [ownerCount, setOwnerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<AdminRole>('support_admin');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState<{ type: 'deactivate' | 'role'; target: AdminRecord; role?: AdminRole } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.adminsList();
    if (res.ok) { setAdmins(res.data.admins); setOwnerCount(res.data.ownerCount); }
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!userId.trim()) return;
    const reason = window.prompt('Reason for this admin change?');
    if (reason === null) return;
    setFeedback('');
    const res = await adminApi.adminsSet(userId.trim(), role, true, reason);
    setFeedback(res.ok ? 'Admin added.' : res.message);
    setUserId('');
    load();
  };

  const confirmAction = async () => {
    if (!pending) return;
    setBusy(true);
    setFeedback('');
    const reason = window.prompt(`Reason for this ${pending.type === 'deactivate' ? 'removal' : 'role change'}?`);
    if (reason === null) { setBusy(false); setPending(null); return; }
    const targetRole = pending.type === 'role' ? (pending.role ?? pending.target.role) : pending.target.role;
    const res = await adminApi.adminsSet(pending.target.user_id, targetRole, pending.type === 'role', reason);
    setBusy(false);
    setFeedback(res.ok ? 'Updated.' : res.message);
    setPending(null);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const lastOwner = ownerCount <= 1;

  return (
    <div>
      {!owner && <p className="text-xs text-forge-warning mb-4">Only an Owner can modify the admin team. You have read-only visibility.</p>}
      {feedback && <p className="mb-3 text-xs text-forge-success">{feedback}</p>}

      {canManage && (
        <Card className="mb-5 max-w-2xl">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Add an admin</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (uuid)" className="h-8 w-64 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber">
              {ADMIN_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button size="sm" onClick={add}>Add</Button>
          </div>
        </Card>
      )}

      {!admins || admins.length === 0 ? <EmptyState message="No admin records." /> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Admin</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Role</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Granted by</th>
                  <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Last activity</th>
                  {canManage && <th className="px-3 py-2 text-xs font-medium text-forge-text-muted text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const isOwnerRow = a.role === 'super_admin';
                  const isLastOwner = isOwnerRow && a.active && lastOwner;
                  return (
                    <tr key={a.user_id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2">
                        <p className="text-sm text-forge-text-primary">{a.displayName ?? a.email ?? '—'}</p>
                        <p className="text-xs text-forge-text-muted">{a.email ?? `${a.user_id.slice(0, 12)}…`}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-forge-text-secondary capitalize">{a.role.replace(/_/g, ' ')}</span>
                          {isOwnerRow && <span className="px-1.5 py-0 rounded bg-forge-amber/15 text-forge-amber text-[10px] font-semibold">OWNER</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusPill status={a.active ? 'healthy' : 'disabled'} /></td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{a.grantedByEmail ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted">{formatDate(a.lastActivity)}</td>
                      {canManage && (
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            {owner && (
                              <select
                                value={a.role}
                                onChange={(e) => setPending({ type: 'role', target: a, role: e.target.value as AdminRole })}
                                className="h-7 px-1.5 rounded bg-forge-panel border border-forge-border-subtle text-xs text-forge-text-primary focus:outline-none focus:border-forge-amber cursor-pointer"
                              >
                                {ADMIN_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            )}
                            {a.active && (
                              <Button size="sm" variant="ghost" disabled={isLastOwner} title={isLastOwner ? 'The last Owner cannot be removed' : undefined} onClick={() => setPending({ type: 'deactivate', target: a })}>Remove</Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmationModal
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirmAction}
        title={pending?.type === 'deactivate' ? 'Remove admin' : 'Change admin role'}
        message={pending ? (pending.type === 'deactivate'
          ? `Remove "${pending.target.displayName ?? pending.target.email ?? pending.target.user_id}" from the admin team? This revokes their platform admin access.`
          : `Change "${pending.target.displayName ?? pending.target.email ?? pending.target.user_id}" role to ${(pending.role ?? pending.target.role).replace(/_/g, ' ')}?`) : ''}
        confirmLabel={pending?.type === 'deactivate' ? 'Remove' : 'Change role'}
        variant={pending?.type === 'deactivate' || (pending?.type === 'role' && pending.target.role === 'super_admin' && pending.role !== 'super_admin') ? 'danger' : 'primary'}
        loading={busy}
      />
    </div>
  );
}

export function AuditTab() {
  const admin = useAdmin();
  const canView = hasPermission(admin, 'audit.read');
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await adminApi.auditList({ query: query || undefined, actionFilter: actionFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, pageSize });
    if (res.ok) { setEvents(res.data.events); setActions(res.data.actions); setTotal(res.data.total); }
    else setError(res.message);
    setLoading(false);
  }, [query, actionFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const applyFilter = (setter: (v: string) => void, value: string) => { setter(value); setPage(1); };

  if (!canView) return <EmptyState message="You do not have permission to view the audit trail." />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={query} onChange={(e) => applyFilter(setQuery, e.target.value)} placeholder="Search action or target…" className="h-8 w-56 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
        <select value={actionFilter} onChange={(e) => applyFilter(setActionFilter, e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => applyFilter(setDateFrom, e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber" aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => applyFilter(setDateTo, e.target.value)} className="h-8 px-2 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary focus:outline-none focus:border-forge-amber" aria-label="To date" />
      </div>

      {!events || events.length === 0 ? <EmptyState message="No audit events match." /> : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead className="bg-forge-panel-elevated border-b border-forge-border-subtle">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Time</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Admin</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Action</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Target</th>
                    <th className="px-3 py-2 text-xs font-medium text-forge-text-muted">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-forge-border-subtle last:border-0 hover:bg-forge-hover/40">
                      <td className="px-3 py-2 text-xs text-forge-text-muted whitespace-nowrap">{formatDate(e.createdAt)}</td>
                      <td className="px-3 py-2">
                        <p className="text-xs text-forge-text-primary">{e.adminName ?? e.adminEmail ?? '—'}</p>
                        {e.adminRole && <p className="text-[10px] text-forge-text-muted capitalize">{e.adminRole.replace(/_/g, ' ')}</p>}
                      </td>
                      <td className="px-3 py-2 text-xs text-forge-text-primary font-mono">{e.action}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-secondary">{e.targetType ? `${e.targetType}${e.targetId ? ':' + e.targetId.slice(0, 8) : ''}` : '—'}</td>
                      <td className="px-3 py-2 text-xs text-forge-text-muted max-w-[280px] truncate" title={e.reason ?? ''}>{e.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-center justify-between mt-3 text-xs text-forge-text-muted">
            <span>{total} event{total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ri-arrow-left-s-line" /> Prev</Button>
              <span>Page {page} of {totalPages}</span>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <i className="ri-arrow-right-s-line" /></Button>
            </div>
          </div>

          <p className="text-[10px] text-forge-text-muted mt-3">Audit events record the acting admin, action and target. Passwords, tokens and API keys are never stored in the audit trail.</p>
        </>
      )}
    </div>
  );
}

export function DataTab() {
  const admin = useAdmin();
  const canExport = hasPermission(admin, 'data.export');
  const canDelete = hasPermission(admin, 'data.delete');
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'export' | 'delete') => {
    if (!userId || !reason) { setFeedback('User ID and reason are required.'); return; }
    if (kind === 'delete') {
      const confirm = window.confirm('This queues a full account/project deletion. Continue?');
      if (!confirm) return;
    }
    setBusy(true);
    setFeedback('');
    const res = kind === 'export' ? await adminApi.dataExport(userId, reason) : await adminApi.dataDelete(userId, reason, true);
    setBusy(false);
    setFeedback(res.ok ? `${kind === 'export' ? 'Export' : 'Deletion'} request queued (${res.data.affected.projects} projects, ${res.data.affected.subscriptions} subscriptions).` : res.message);
  };

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-forge-text-muted mb-4">Requests are verified, audited and queued — nothing destructive runs synchronously. Billing records are preserved for financial history.</p>
      <Card>
        <h3 className="text-sm font-semibold text-forge-text-primary mb-3">Data request</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (uuid)" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-8 px-3 rounded-md bg-forge-panel border border-forge-border-subtle text-sm text-forge-text-primary placeholder:text-forge-text-muted focus:outline-none focus:border-forge-amber" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canExport && <Button size="sm" loading={busy} onClick={() => run('export')} icon={<i className="ri-download-2-line" />}>Queue export</Button>}
          {canDelete && <Button size="sm" variant="danger" loading={busy} onClick={() => run('delete')} icon={<i className="ri-delete-bin-line" />}>Queue deletion</Button>}
          {feedback && <span className="text-xs text-forge-text-secondary">{feedback}</span>}
        </div>
      </Card>
    </div>
  );
}