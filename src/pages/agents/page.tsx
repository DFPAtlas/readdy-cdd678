import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { demoAgents } from '@/services/mock/demoData';
import type { AgentDefinition } from '@/types';
import { Cpu, X, CheckCircle, Clock, AlertTriangle, Activity, Zap } from 'lucide-react';

const typeColorMap: Record<string, string> = {
  builder: 'bg-amber-500/10 text-amber-600',
  reviewer: 'bg-sky-500/10 text-sky-600',
  optimizer: 'bg-emerald-500/10 text-emerald-600',
  deployer: 'bg-violet-500/10 text-violet-600',
  custom: 'bg-foreground-100 text-foreground-600',
};

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  const filtered = demoAgents.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const demoRuns = {
    'agent-master': { successRate: 98, lastRun: '2 min ago', runs: 142 },
    'agent-planner': { successRate: 95, lastRun: '1 hour ago', runs: 89 },
    'agent-requirements': { successRate: 97, lastRun: '3 hours ago', runs: 76 },
    'agent-ui-design': { successRate: 92, lastRun: '30 min ago', runs: 110 },
    'agent-ux': { successRate: 94, lastRun: '5 hours ago', runs: 54 },
    'agent-frontend': { successRate: 96, lastRun: '10 min ago', runs: 198 },
    'agent-content': { successRate: 93, lastRun: '1 hour ago', runs: 134 },
    'agent-image': { successRate: 88, lastRun: '20 min ago', runs: 67 },
    'agent-accessibility': { successRate: 91, lastRun: '2 hours ago', runs: 42 },
    'agent-seo': { successRate: 90, lastRun: '4 hours ago', runs: 38 },
    'agent-qa': { successRate: 89, lastRun: '1 hour ago', runs: 65 },
    'agent-repair': { successRate: 85, lastRun: '3 days ago', runs: 12 },
    'agent-visual': { successRate: 87, lastRun: '6 hours ago', runs: 28 },
    'agent-export': { successRate: 99, lastRun: '1 day ago', runs: 31 },
  };

  return (
    <>
      <PageHeader
        title="Agents"
        description="Manage AI agents that power the Forge build pipeline"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Agents' }]}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agents..." className="w-48" />
        <div className="flex items-center gap-1.5">
          {['all', 'builder', 'reviewer', 'optimizer', 'deployer'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap capitalize ${
                typeFilter === t ? 'bg-amber-500 text-white' : 'bg-background-100 text-foreground-600 hover:bg-background-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((agent) => {
          const stats = (demoRuns as any)[agent.id] || { successRate: 90, lastRun: 'N/A', runs: 0 };
          return (
            <Card key={agent.id} hoverable className="cursor-pointer" onClick={() => setSelectedAgent(agent)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeColorMap[agent.type]}`}>
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground-950 truncate">{agent.name}</h3>
                    <Badge size="sm" variant="default">{agent.type}</Badge>
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full mt-1 ${agent.isActive ? 'bg-emerald-500' : 'bg-foreground-300'}`} title={agent.isActive ? 'Active' : 'Inactive'} />
              </div>
              <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{agent.description}</p>
              <div className="flex items-center gap-2 text-xs text-foreground-400">
                <span className="flex items-center gap-0.5"><Zap className="h-3 w-3" /> {stats.successRate}%</span>
                <span>·</span>
                <span>{agent.tools.length} tools</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {stats.lastRun}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedAgent(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative ml-auto w-full max-w-md bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-background-100 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeColorMap[selectedAgent.type]}`}>
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground-950">{selectedAgent.name}</h3>
                  <Badge size="sm" variant="default">{selectedAgent.type}</Badge>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-1 rounded-md hover:bg-background-100 transition-colors">
                <X className="h-4 w-4 text-foreground-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-foreground-500 mb-1">Description</p>
                <p className="text-sm text-foreground-950">{selectedAgent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Model</p>
                  <p className="text-sm font-mono font-medium text-foreground-950">{selectedAgent.model}</p>
                </div>
                <div className="bg-background-50 rounded-lg p-2.5">
                  <p className="text-xs text-foreground-500">Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${selectedAgent.isActive ? 'bg-emerald-500' : 'bg-foreground-300'}`} />
                    <span className="text-sm text-foreground-950">{selectedAgent.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground-500 mb-1">Allowed Tools ({selectedAgent.tools.length})</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAgent.tools.map((t) => (
                    <Badge key={t} size="sm" variant="default">{t}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground-500 mb-1">System Prompt</p>
                <div className="bg-background-50 rounded-lg p-3">
                  <p className="text-xs text-foreground-600 font-mono leading-relaxed">{selectedAgent.systemPrompt}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground-500 mb-1">Recent Runs</p>
                <div className="space-y-1">
                  {[
                    { status: 'completed', time: '10 min ago', build: 'Build #012' },
                    { status: 'completed', time: '2 hours ago', build: 'Build #011' },
                    { status: 'completed', time: '1 day ago', build: 'Build #010' },
                  ].map((run, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs bg-background-50">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      <span className="text-foreground-950">{run.build}</span>
                      <span className="text-foreground-400">{run.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}