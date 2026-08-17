import { useCallback, useEffect, useMemo, useState } from 'react';
import { integrationsApi, ACCESS_LEVELS, ENVIRONMENTS, type AccessLevel, type AgentPermission, type ForgeAgent, type IntegrationConnection, type Environment } from './forgeIntegrations';
import { useAdmin, hasPermission } from './AdminGuard';
import { SectionTitle, LoadingState, ErrorState, StatusPill, EnvironmentBadge } from './components';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function AgentsPage() {
  const admin = useAdmin();
  const canManage = hasPermission(admin, 'ai.operate');

  const [agents, setAgents] = useState<ForgeAgent[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [permissions, setPermissions] = useState<AgentPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [draftEnvs, setDraftEnvs] = useState<Environment[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [a, c, p] = await Promise.all([integrationsApi.agents(), integrationsApi.list(), integrationsApi.agentPermissions()]);
    if (!a.ok || !c.ok || !p.ok) {
      setError(!a.ok ? a.message : !c.ok ? c.message : p.message);
      setLoading(false);
      return;
    }
    setAgents(a.data.agents);
    setConnections(c.data.connections);
    setPermissions(p.data.permissions);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = agents.find((a) => a.id === selectedId) ?? agents[0] ?? null;

  useEffect(() => {
    if (selected) {
      setDraftEnvs((Array.isArray(selected.allowed_environments) ? selected.allowed_environments : ['development', 'staging']) as Environment[]);
    }
  }, [selected?.id]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => !q || `${a.name} ${a.description ?? ''}`.toLowerCase().includes(q));
  }, [agents, search]);

  const permFor = (agentId: string, connectionId: string): AccessLevel => {
    const p = permissions.find((x) => x.agent_id === agentId && x.integration_connection_id === connectionId);
    return p && p.is_enabled && p.access_level !== 'none' ? p.access_level : 'none';
  };

  const handleLevel = async (agentId: string, connectionId: string, level: AccessLevel) => {
    if (!canManage) return;
    setSaving(true);
    setFeedback('');
    const res = await integrationsApi.setAgentPermission({ connectionId, agentId, accessLevel: level, enabled: level !== 'none' });
    setSaving(false);
    if (res.ok) {
      setFeedback('Permissions updated');
      void load();
    } else {
      setFeedback(res.message);
    }
  };

  const handleStatus = async (agentId: string, active: boolean) => {
    if (!canManage) return;
    setSaving(true);
    setFeedback('');
    const res = await integrationsApi.setAgentStatus(agentId, active ? 'active' : 'disabled');
    setSaving(false);
    if (res.ok) {
      setFeedback('Agent status updated');
      void load();
    } else {
      setFeedback(res.message);
    }
  };

  const toggleEnv = (env: Environment) => {
    setDraftEnvs((cur) => (cur.includes(env) ? cur.filter((e) => e !== env) : [...cur, env]));
  };

  const saveEnvs = async () => {
    if (!selected || !canManage) return;
    setSaving(true);
    setFeedback('');
    const res = await integrationsApi.setAgentEnvironments(selected.id, draftEnvs);
    setSaving(false);
    if (res.ok) {
      setFeedback('Environments updated');
      void load();
    } else {
      setFeedback(res.message);
    }
  };

  if (loading) return <LoadingState label="Loading agents…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <SectionTitle title="Agents" description="Manage the Forge agent directory and which integrations each agent may access." />
      {!canManage && <p className="text-xs text-forge-warning mb-4">You have read-only access to agents.</p>}
      {feedback && <p className="text-xs text-forge-success mb-3" role="status">{feedback}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          <div className="relative">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted text-xs" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents" className="w-full pl-8" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            {filteredAgents.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selected?.id === a.id ? 'border-forge-amber bg-forge-hover' : 'border-forge-border-subtle bg-forge-panel hover:bg-forge-hover/50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-forge-text-primary truncate">{a.name}</span>
                  {a.status !== 'active' && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-forge-border text-forge-text-muted uppercase tracking-wide">Disabled</span>
                  )}
                </div>
                <p className="text-[10px] text-forge-text-muted mt-0.5 truncate">{a.agent_type}</p>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <Card className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-forge-border flex items-center justify-center text-forge-text-secondary shrink-0">
                <i className="ri-robot-2-line text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-forge-text-primary">{selected.name}</h3>
                  {selected.sensitivity_level === 'high' && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-forge-error/10 text-forge-error font-medium uppercase tracking-wide">Sensitive</span>
                  )}
                </div>
                <p className="text-xs text-forge-text-muted mt-0.5">{selected.description ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-forge-text-muted">Active</span>
                <Switch checked={selected.status === 'active'} disabled={!canManage || saving} onChange={(e) => void handleStatus(selected.id, e.target.checked)} aria-label={`${selected.name} active`} />
              </div>
            </div>

            <div className="border-t border-forge-border-subtle pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-forge-text-primary">Allowed environments</p>
                <Button size="sm" variant="ghost" onClick={() => void saveEnvs()} loading={saving}>Save</Button>
              </div>
              <p className="text-[11px] text-forge-text-muted mb-2.5">Which environments this agent may use. Production access is explicit and never inherited.</p>
              <div className="flex flex-wrap gap-1.5">
                {ENVIRONMENTS.map((env) => {
                  const on = draftEnvs.includes(env);
                  const isProd = env === 'production';
                  const label = env === 'development' ? 'Development' : env === 'staging' ? 'Staging' : env === 'production' ? 'Production' : 'Sandbox';
                  return (
                    <button
                      key={env}
                      onClick={() => toggleEnv(env)}
                      disabled={!canManage}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50 ${on ? (isProd ? 'border-forge-amber/40 bg-forge-amber/15 text-forge-amber' : 'border-forge-border bg-forge-hover text-forge-text-primary') : 'border-forge-border-subtle text-forge-text-muted hover:text-forge-text-secondary'}`}
                    >
                      <i className={`${on ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} text-xs`} />
                      {label}
                    </button>
                  );
                })}
              </div>
              {draftEnvs.includes('production')
                ? <p className="text-[10px] text-forge-amber mt-2"><strong>Production access</strong> — this agent can execute actions against live Forge integrations.</p>
                : <p className="text-[10px] text-forge-text-muted mt-2">This agent has no production access.</p>}
            </div>

            <div className="border-t border-forge-border-subtle pt-3">
              <p className="text-xs font-semibold text-forge-text-primary mb-2">Integration Access</p>
              {connections.length === 0 ? (
                <p className="text-xs text-forge-text-muted">No integrations connected yet.</p>
              ) : (
                <div className="rounded-md border border-forge-border-subtle divide-y divide-forge-border-subtle overflow-hidden">
                  {connections.map((c) => {
                    const level = permFor(selected.id, c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-forge-text-primary truncate">{c.connection_name}</span>
                            {c.sensitive && (
                              <span className="text-[9px] px-1.5 py-px rounded bg-forge-warning/10 text-forge-warning uppercase tracking-wide">Sensitive</span>
                            )}
                            <StatusPill status={c.status} />
                          </div>
                          <p className="text-[10px] text-forge-text-muted mt-0.5">{c.provider_id} · <span className="capitalize">{c.environment}</span></p>
                        </div>
                        <Select
                          value={level}
                          disabled={!canManage}
                          onChange={(e) => void handleLevel(selected.id, c.id, e.target.value as AccessLevel)}
                          options={ACCESS_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                          className="text-xs h-7 w-24"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}