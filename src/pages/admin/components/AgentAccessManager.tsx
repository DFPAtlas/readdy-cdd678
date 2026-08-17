import { useCallback, useEffect, useMemo, useState } from 'react';
import { integrationsApi, ACCESS_LEVELS, type AccessLevel, type ForgeAgent, type IntegrationConnection } from '../forgeIntegrations';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Props = { connection: IntegrationConnection; onChanged?: () => void };

type LocalPerm = { accessLevel: AccessLevel; enabled: boolean };

const FILTERS = ['All', 'Allowed', 'Denied', 'Active', 'Disabled'] as const;
type Filter = (typeof FILTERS)[number];

export function AgentAccessManager({ connection, onChanged }: Props) {
  const [agents, setAgents] = useState<ForgeAgent[]>([]);
  const [permMap, setPermMap] = useState<Record<string, LocalPerm>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [confirmSelectAll, setConfirmSelectAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [a, p] = await Promise.all([integrationsApi.agents(), integrationsApi.agentPermissions(connection.id)]);
    if (!a.ok || !p.ok) {
      setError(!a.ok ? a.message : p.message);
      setLoading(false);
      return;
    }
    setAgents(a.data.agents);
    const map: Record<string, LocalPerm> = {};
    a.data.agents.forEach((ag) => { map[ag.id] = { accessLevel: 'none', enabled: false }; });
    p.data.permissions.forEach((perm) => {
      if (map[perm.agent_id]) map[perm.agent_id] = { accessLevel: perm.access_level, enabled: perm.is_enabled };
    });
    setPermMap(map);
    setLoading(false);
  }, [connection.id]);

  useEffect(() => { void load(); }, [load]);

  const toggle = (agentId: string, enabled: boolean) => {
    setPermMap((m) => {
      const cur = m[agentId] ?? { accessLevel: 'none', enabled: false };
      const level: AccessLevel = enabled ? (cur.accessLevel === 'none' ? 'execute' : cur.accessLevel) : 'none';
      return { ...m, [agentId]: { accessLevel: level, enabled } };
    });
  };

  const setLevel = (agentId: string, accessLevel: AccessLevel) => {
    setPermMap((m) => ({ ...m, [agentId]: { ...(m[agentId] ?? { enabled: true }), accessLevel, enabled: accessLevel !== 'none' } }));
  };

  const saveAll = async () => {
    setSaving(true);
    setFeedback(null);
    for (const agent of agents) {
      const p = permMap[agent.id] ?? { accessLevel: 'none' as AccessLevel, enabled: false };
      const res = await integrationsApi.setAgentPermission({ connectionId: connection.id, agentId: agent.id, accessLevel: p.accessLevel, enabled: p.enabled });
      if (!res.ok) {
        setFeedback({ tone: 'error', text: res.message });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setFeedback({ tone: 'success', text: 'Permissions updated' });
    onChanged?.();
  };

  const selectAll = async () => {
    setFeedback(null);
    const res = await integrationsApi.bulkSetPermissions({ connectionId: connection.id, agentIds: agents.map((a) => a.id), accessLevel: 'execute', enabled: true, confirmSensitive: true });
    if (res.ok) {
      setFeedback({ tone: 'success', text: 'Permissions updated' });
      onChanged?.();
      void load();
    } else {
      setFeedback({ tone: 'error', text: res.message });
    }
  };

  const clearAll = async () => {
    setFeedback(null);
    const res = await integrationsApi.bulkSetPermissions({ connectionId: connection.id, agentIds: agents.map((a) => a.id), accessLevel: 'none', enabled: false });
    if (res.ok) {
      setFeedback({ tone: 'success', text: 'Permissions updated' });
      onChanged?.();
      void load();
    } else {
      setFeedback({ tone: 'error', text: res.message });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      const p = permMap[a.id] ?? { accessLevel: 'none', enabled: false };
      const allowed = p.enabled && p.accessLevel !== 'none';
      if (filter === 'Allowed' && !allowed) return false;
      if (filter === 'Denied' && allowed) return false;
      if (filter === 'Active' && a.status !== 'active') return false;
      if (filter === 'Disabled' && a.status !== 'disabled') return false;
      if (q && !(`${a.name} ${a.description ?? ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [agents, permMap, search, filter]);

  if (loading) return <p className="text-xs text-forge-text-muted py-4">Loading agents…</p>;
  if (error) return <p className="text-xs text-forge-error py-4">{error}</p>;

  const isProduction = connection.environment === 'production';
  const canAccessEnv = (agent: ForgeAgent, env: string) => Array.isArray(agent.allowed_environments) ? agent.allowed_environments.includes(env) : false;

  return (
    <div className="space-y-3">
      {connection.sensitive && (
        <div className="rounded-md border border-forge-warning/30 bg-forge-warning/10 px-3 py-2.5 text-xs text-forge-warning" role="note">
          <div className="flex items-start gap-2">
            <i className="ri-alert-line text-sm shrink-0 mt-px" />
            <span>This integration can access sensitive Forge systems or customer data. Grant access only to agents that require it.</span>
          </div>
        </div>
      )}

      {isProduction && (
        <div className="rounded-md border border-forge-amber/30 bg-forge-amber/10 px-3 py-2.5 text-xs text-forge-amber" role="note">
          <div className="flex items-start gap-2">
            <i className="ri-shield-flash-line text-sm shrink-0 mt-px" />
            <span><strong>Production access.</strong> Agents granted access here will be able to execute actions against a live Forge integration. Production access is never inherited — an agent must be explicitly allowed to use production.</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-text-muted text-xs" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents" className="w-full pl-8" autoComplete="off" />
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-forge-border p-0.5" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${filter === f ? 'bg-forge-panel text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-primary'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setConfirmSelectAll(true)} icon={<i className="ri-check-double-line" />}>Select all</Button>
        <Button size="sm" variant="ghost" onClick={() => void clearAll()} icon={<i className="ri-close-line" />}>Clear all</Button>
        <span className="flex-1" />
        <Button size="sm" onClick={() => void saveAll()} loading={saving}>Save permissions</Button>
      </div>

      {feedback && (
        <p className={`text-xs ${feedback.tone === 'success' ? 'text-forge-success' : 'text-forge-error'}`} role="status">{feedback.text}</p>
      )}

      <div className="rounded-md border border-forge-border-subtle divide-y divide-forge-border-subtle overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-xs text-forge-text-muted px-3 py-4">No agents match your search.</p>
        ) : filtered.map((agent) => {
          const p = permMap[agent.id] ?? { accessLevel: 'none' as AccessLevel, enabled: false };
          const allowed = p.enabled && p.accessLevel !== 'none';
          const disabledAgent = agent.status !== 'active';
          const blockedProd = isProduction && !canAccessEnv(agent, 'production');
          return (
            <div key={agent.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-forge-text-primary">{agent.name}</span>
                  {agent.sensitivity_level === 'high' && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-forge-error/10 text-forge-error font-medium uppercase tracking-wide">Sensitive</span>
                  )}
                  {disabledAgent && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-forge-border text-forge-text-muted font-medium uppercase tracking-wide">Disabled</span>
                  )}
                  {blockedProd && (
                    <span className="text-[9px] px-1.5 py-px rounded bg-forge-amber/10 text-forge-amber font-medium uppercase tracking-wide" title="This agent is not allowed to use production. Enable production in its allowed environments first.">No production access</span>
                  )}
                </div>
                {agent.description && <p className="text-[11px] text-forge-text-muted mt-0.5 truncate">{agent.description}</p>}
              </div>

              {allowed && !disabledAgent && (
                <Select
                  value={p.accessLevel}
                  onChange={(e) => setLevel(agent.id, e.target.value as AccessLevel)}
                  options={ACCESS_LEVELS.filter((l) => l.value !== 'none').map((l) => ({ value: l.value, label: l.label }))}
                  className="text-xs h-7 w-24"
                />
              )}

              <Switch checked={allowed} disabled={disabledAgent || blockedProd} onChange={(e) => toggle(agent.id, e.target.checked)} aria-label={`${agent.name} access`} />
            </div>
          );
        })}
      </div>

      <ConfirmationModal
        open={confirmSelectAll}
        onClose={() => setConfirmSelectAll(false)}
        onConfirm={() => { setConfirmSelectAll(false); void selectAll(); }}
        title={connection.sensitive ? 'Grant this sensitive integration to multiple Forge agents?' : 'Grant access to all agents?'}
        message={connection.sensitive
          ? 'This integration can access sensitive Forge systems or customer data. Every agent will receive Execute access.'
          : 'Every agent will receive Execute access to this integration.'}
        confirmLabel="Grant access"
        cancelLabel="Cancel"
        variant="primary"
      />
    </div>
  );
}