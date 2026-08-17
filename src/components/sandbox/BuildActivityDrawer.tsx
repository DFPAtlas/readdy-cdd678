import { useState } from 'react';
import {
  ChevronUp, ChevronDown, Activity, FileText, AlertTriangle,
  GitPullRequest, Terminal, X, Ban, CheckCircle, Clock,
  CircleDot, Filter, Trash2, ArrowRight,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { useToast } from '@/components/ui/Toast';
import {
  demoBuildTasks, demoLogs, demoProblems, demoChanges, demoConsoleMessages,
} from '@/services/mock/sandboxMock';

const DRAWER_TABS = [
  { id: 'activity', label: 'Build Activity', icon: Activity },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'problems', label: 'Problems', icon: AlertTriangle, count: 2 },
  { id: 'changes', label: 'Changes', icon: GitPullRequest },
  { id: 'console', label: 'Preview Console', icon: Terminal },
];

export function BuildActivityDrawer() {
  const { bottomDrawerOpen, toggleBottomDrawer, activeBuildTab, setActiveBuildTab, buildStatus, buildProgress } = useSandboxStore();

  if (!bottomDrawerOpen) {
    return (
      <div className="h-8 flex items-center justify-between px-3 border-t border-forge-border-subtle bg-forge-panel flex-shrink-0 cursor-pointer select-none"
        onClick={toggleBottomDrawer}
      >
        <div className="flex items-center gap-2"
        >
          <Activity className="h-3.5 w-3.5 text-forge-text-muted" />
          <span className="text-xs text-forge-text-secondary"
        >Build Activity</span>
          {buildStatus === 'running' && (
            <span className="text-[10px] text-forge-amber"
        >{Math.round(buildProgress)}%</span>
          )}
          <span className="text-[10px] text-forge-text-muted"
        >Example activity</span>
        </div>
        <ChevronUp className="h-3.5 w-3.5 text-forge-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-forge-panel"
    >
      {/* Header bar */}
      <div className="flex items-center h-8 px-2 border-b border-forge-border-subtle flex-shrink-0"
      >
        {DRAWER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveBuildTab(t.id as typeof activeBuildTab)}
            className={`flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
              activeBuildTab === t.id
                ? 'text-forge-amber bg-forge-amber/10'
                : 'text-forge-text-muted hover:text-forge-text-secondary hover:bg-forge-hover'
            }`}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
            {t.count !== undefined && (
              <span className="ml-0.5 px-1 rounded text-[10px] bg-forge-error/10 text-forge-error"
        >{t.count}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-forge-text-muted mr-2 whitespace-nowrap">Workspace preview</span>
        <button
          onClick={toggleBottomDrawer}
          className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3"
      >
        {activeBuildTab === 'activity' && <BuildActivityTab />}
        {activeBuildTab === 'logs' && <LogsTab />}
        {activeBuildTab === 'problems' && <ProblemsTab />}
        {activeBuildTab === 'changes' && <ChangesTab />}
        {activeBuildTab === 'console' && <ConsoleTab />}
      </div>
    </div>
  );
}

/* ─── Build Activity Tab ─── */

function BuildActivityTab() {
  const { buildStatus, buildProgress, buildNumber, buildElapsed, setBuildStatus } = useSandboxStore();
  const toast = useToast();
  const [tasks] = useState(demoBuildTasks);

  const handleCancel = () => {
    setBuildStatus('cancelled');
    toast.show('Build cancelled', 'warning');
  };

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const progress = buildStatus === 'running' ? buildProgress : buildStatus === 'success' ? 100 : 0;

  return (
    <div className="space-y-3"
    >
      <div className="flex items-center gap-4"
      >
        <div className="bg-forge-bg border border-forge-border-subtle rounded-lg p-3 flex-1"
        >
          <div className="flex items-center justify-between mb-2"
          >
            <span className="text-xs font-medium text-forge-text-primary"
        >Current Build</span>
            <span className="text-[10px] text-forge-text-muted"
        >Build #{buildNumber}</span>
          </div>
          <div className="flex items-center gap-2 mb-2"
          >
            <BuildStatusBadge status={buildStatus} />
            <span className="text-xs text-forge-text-muted tabular-nums"
        >{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-forge-bg rounded-full overflow-hidden mb-2"
          >
            <div
              className="h-full bg-forge-amber rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-forge-text-muted"
          >
            <span>2m 14s elapsed</span>
            <span>~1m 18s remaining</span>
          </div>
        </div>

        {buildStatus === 'running' && (
          <button
            onClick={handleCancel}
            className="h-10 px-3 rounded-lg border border-forge-error/30 text-forge-error text-xs hover:bg-forge-error/10 transition-colors flex items-center gap-1.5"
          >
            <Ban className="h-3.5 w-3.5" />
            Cancel Build
          </button>
        )}
      </div>

      {/* Task Table */}
      <div className="border border-forge-border-subtle rounded-lg overflow-hidden"
      >
        <table className="w-full text-[11px]"
        >
          <thead className="bg-forge-bg"
        >
            <tr className="border-b border-forge-border-subtle"
        >
              <th className="text-left px-3 py-1.5 text-forge-text-muted font-medium"
        >Task</th>
              <th className="text-left px-3 py-1.5 text-forge-text-muted font-medium"
        >Agent</th>
              <th className="text-left px-3 py-1.5 text-forge-text-muted font-medium"
        >Status</th>
              <th className="text-left px-3 py-1.5 text-forge-text-muted font-medium"
        >Progress</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-forge-border-subtle/50 hover:bg-forge-hover transition-colors"
        >
                <td className="px-3 py-1.5 text-forge-text-primary"
        >{t.name}</td>
                <td className="px-3 py-1.5 text-forge-text-secondary"
        >{t.agent}</td>
                <td className="px-3 py-1.5"
        >
                  <TaskStatusBadge status={t.status} />
                </td>
                <td className="px-3 py-1.5"
        >
                  <div className="flex items-center gap-2"
        >
                    <span className="tabular-nums text-forge-text-muted w-7"
        >{t.progress}%</span>
                    <div className="flex-1 h-1 bg-forge-bg rounded-full overflow-hidden"
        >
                      <div
                        className="h-full bg-forge-amber rounded-full transition-all"
                        style={{ width: `${t.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BuildStatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle; text: string; color: string }> = {
    idle: { icon: CircleDot, text: 'Idle', color: 'text-forge-text-muted' },
    queued: { icon: Clock, text: 'Queued', color: 'text-forge-text-muted' },
    running: { icon: CircleDot, text: 'In Progress', color: 'text-forge-amber' },
    success: { icon: CheckCircle, text: 'Completed', color: 'text-forge-success' },
    failed: { icon: AlertTriangle, text: 'Failed', color: 'text-forge-error' },
    cancelled: { icon: Ban, text: 'Cancelled', color: 'text-forge-text-muted' },
  };
  const s = map[status] || map.idle;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${s.color}`}
    >
      <s.icon className="h-3.5 w-3.5" />
      {s.text}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <span className="flex items-center gap-1 text-[10px] text-forge-success"
    ><CheckCircle className="h-3 w-3" /> Completed</span>;
    case 'running': return <span className="flex items-center gap-1 text-[10px] text-forge-amber"
    ><CircleDot className="h-3 w-3 animate-pulse" /> In Progress</span>;
    case 'failed': return <span className="flex items-center gap-1 text-[10px] text-forge-error"
    ><AlertTriangle className="h-3 w-3" /> Failed</span>;
    default: return <span className="flex items-center gap-1 text-[10px] text-forge-text-muted"
    ><Clock className="h-3 w-3" /> Queued</span>;
  }
}

/* ─── Logs Tab ─── */

function LogsTab() {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logs = filter === 'all' ? demoLogs : demoLogs.filter((l) => l.level === filter);

  return (
    <div className="space-y-2"
    >
      <div className="flex items-center gap-1"
    >
        {(['all', 'info', 'warn', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-forge-panel-elevated text-forge-text-primary'
                : 'text-forge-text-muted hover:text-forge-text-secondary hover:bg-forge-hover'
            }`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button className="p-0.5 rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
    >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-0.5"
    >
        {logs.map((l) => (
          <div
            key={l.id}
            className="flex items-start gap-2 px-2 py-1 rounded text-[11px] hover:bg-forge-hover transition-colors"
          >
            <LogLevelDot level={l.level} />
            <span className="text-forge-text-muted tabular-nums w-[50px] flex-shrink-0"
    >{l.timestamp}</span>
            <span className="text-forge-text-secondary w-[100px] flex-shrink-0"
    >{l.source}</span>
            <span className="text-forge-text-primary"
    >{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogLevelDot({ level }: { level: string }) {
  const color = level === 'error' ? 'bg-forge-error' : level === 'warn' ? 'bg-forge-warning' : 'bg-forge-accent';
  return <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${color} flex-shrink-0`} />;
}

/* ─── Problems Tab ─── */

function ProblemsTab() {
  return (
    <div className="space-y-1"
    >
      {demoProblems.map((p) => (
        <div
          key={p.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded bg-forge-bg border border-forge-border-subtle hover:border-forge-border transition-colors"
        >
          <ProblemSeverity severity={p.severity} />
          <div className="flex-1 min-w-0"
        >
            <div className="text-xs text-forge-text-primary"
    >{p.message}</div>
            <div className="text-[10px] text-forge-text-muted"
    >{p.source}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProblemSeverity({ severity }: { severity: string }) {
  if (severity === 'error') {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-forge-error/10 text-forge-error font-medium"
    >Error</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-forge-warning/10 text-forge-warning font-medium"
  >Warning</span>;
}

/* ─── Changes Tab ─── */

function ChangesTab() {
  return (
    <div className="space-y-1"
    >
      {demoChanges.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded bg-forge-bg border border-forge-border-subtle hover:border-forge-border transition-colors"
        >
          <ChangeBadge type={c.type} />
          <span className="text-xs text-forge-text-primary flex-1 truncate"
    >{c.file}</span>
          <span className="text-[10px] text-forge-text-muted truncate max-w-[200px]"
    >{c.description}</span>
        </div>
      ))}
    </div>
  );
}

function ChangeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    create: 'bg-forge-success/10 text-forge-success',
    modify: 'bg-forge-amber/10 text-forge-amber',
    delete: 'bg-forge-error/10 text-forge-error',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${map[type] || map.modify}`}
    >
      {type}
    </span>
  );
}

/* ─── Console Tab ─── */

function ConsoleTab() {
  return (
    <div className="space-y-0.5 font-mono"
    >
      {demoConsoleMessages.map((m) => (
        <div
          key={m.id}
          className={`flex items-start gap-2 px-2 py-0.5 text-[11px] ${
            m.level === 'error'
              ? 'text-forge-error'
              : m.level === 'warn'
              ? 'text-forge-warning'
              : 'text-forge-text-secondary'
          }`}
        >
          <span className="text-forge-text-muted"
    >&gt;&gt;</span>
          <span>{m.message}</span>
        </div>
      ))}
    </div>
  );
}