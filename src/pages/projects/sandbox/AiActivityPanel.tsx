import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Clock, RefreshCw, XCircle, Zap } from 'lucide-react';
import {
  listAiJobs, listAgentRuns, getChangeSet, agentsForTask, AGENT_LABELS,
  type AiJobRecord, type AiAgentRunRecord, type AiChangeSetRecord, type AgentType,
} from './sandboxAiOrchestration';

type JobDetail = {
  runs: AiAgentRunRecord[];
  changeSet: AiChangeSetRecord | null;
};

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'ok' },
  queued: { label: 'Queued', icon: CircleDashed, tone: 'pending' },
  running: { label: 'Running', icon: RefreshCw, tone: 'pending' },
  failed: { label: 'Failed', icon: XCircle, tone: 'error' },
  cancelled: { label: 'Cancelled', icon: XCircle, tone: 'error' },
};

function formatTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function countOperations(changeSet: AiChangeSetRecord | null): number {
  if (!changeSet?.operations) return 0;
  const ops = changeSet.operations as Record<string, unknown>;
  return ['operations', 'pageOperations', 'componentOperations'].reduce((sum, key) => {
    const value = ops[key];
    return sum + (Array.isArray(value) ? value.length : 0);
  }, 0);
}

export default function AiActivityPanel({ projectId, onNotify }: { projectId: string; onNotify: (message: string) => void }) {
  const [jobs, setJobs] = useState<AiJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, JobDetail>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listAiJobs(projectId);
      setJobs(rows);
      if (rows.length === 0) onNotify('No AI jobs recorded for this project yet');
    } catch {
      onNotify('Could not load AI jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggle = async (jobId: string) => {
    if (expandedId === jobId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(jobId);
    if (!details[jobId]) {
      const [runs, changeSet] = await Promise.all([listAgentRuns(jobId), getChangeSet(jobId)]);
      setDetails((current) => ({ ...current, [jobId]: { runs, changeSet } }));
    }
  };

  return (
    <div className="ai-jobs-panel">
      <div className="ai-jobs-toolbar">
        <span className="ai-jobs-count">{jobs.length} job{jobs.length === 1 ? '' : 's'}</span>
        <button className="ai-jobs-refresh" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {jobs.length === 0 && (
        <div className="ai-jobs-empty">
          <Bot size={30} />
          <p>No AI jobs yet.</p>
          <span>Run an AI request from the Assistant and it will appear here with its model, agents, credits and proposed changes.</span>
        </div>
      )}

      <div className="ai-jobs-list">
        {jobs.map((job) => {
          const meta = STATUS_META[job.status] ?? STATUS_META.failed;
          const StatusIcon = meta.icon;
          const agents = agentsForTask(job.task_type);
          const isExpanded = expandedId === job.id;
          const detail = details[job.id];
          return (
            <div key={job.id} className={`ai-job-row ${meta.tone}`}>
              <button className="ai-job-summary" onClick={() => void toggle(job.id)}>
                <span className="ai-job-chevron">{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                <span className="ai-job-status-icon"><StatusIcon size={16} /></span>
                <span className="ai-job-main">
                  <strong>{job.task_type}</strong>
                  <span className="ai-job-meta">
                    {job.selected_provider ? `${job.selected_provider} · ${job.selected_model_key}` : 'no model'} · {job.requested_scope}
                  </span>
                </span>
                <span className="ai-job-right">
                  <span className="ai-job-credits"><Zap size={12} /> {job.settled_credits}</span>
                  <span className="ai-job-time"><Clock size={12} /> {formatTime(job.created_at)}</span>
                </span>
              </button>

              {isExpanded && (
                <div className="ai-job-detail">
                  <div className="ai-job-stat-line">
                    <span>Status</span><b className={`tone-${meta.tone}`}>{meta.label}</b>
                  </div>
                  <div className="ai-job-stat-line">
                    <span>Credits</span><b>{job.settled_credits} settled / {job.estimated_credits} estimated</b>
                  </div>
                  <div className="ai-job-stat-line">
                    <span>Scope</span><b>{job.requested_scope}</b>
                  </div>
                  {job.safe_error && (
                    <div className="ai-job-stat-line">
                      <span>Reason</span><b className="tone-error">{job.safe_error}</b>
                    </div>
                  )}

                  <div className="ai-job-agents">
                    <span className="ai-job-detail-label">Agents</span>
                    {(detail ? detail.runs : []).map((run) => (
                      <div key={run.id} className="ai-agent-run">
                        <span className={`ai-agent-dot ${run.status}`} />
                        <b>{AGENT_LABELS[run.agent_type as AgentType] ?? run.agent_type}</b>
                        <em>{run.model_key ?? 'no model'}</em>
                        <span>{run.input_units + run.output_units} units · {run.duration_ms}ms</span>
                      </div>
                    ))}
                    {detail && detail.runs.length === 0 && (
                      <div className="ai-agent-run"><span className="ai-agent-dot failed" /><b>No agent runs recorded</b></div>
                    )}
                    {!detail && <div className="ai-agent-run muted"><RefreshCw size={12} className="spin" /> Loading…</div>}
                  </div>

                  <div className="ai-job-changes">
                    <span className="ai-job-detail-label">Proposed changes</span>
                    {detail ? (
                      <span className="ai-job-changes-count">
                        {countOperations(detail.changeSet)} operation{countOperations(detail.changeSet) === 1 ? '' : 's'} · {detail.changeSet?.validation_status ?? 'pending'} · {detail.changeSet?.decision_status ?? 'pending'}
                      </span>
                    ) : (
                      <span className="ai-job-changes-count muted">Loading…</span>
                    )}
                  </div>

                  <div className="ai-job-expected">
                    <span className="ai-job-detail-label">Expected agents</span>
                    <span className="ai-job-chips">{agents.map((agent) => <span key={agent} className="ai-job-chip">{AGENT_LABELS[agent]}</span>)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}