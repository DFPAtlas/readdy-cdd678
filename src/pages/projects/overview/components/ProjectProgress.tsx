import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Badge } from '@/components/ui/Badge';
import type { ProjectOverviewData } from '@/services/projectOverviewService';
import { Code, Clock, CheckCircle, XCircle, ListTodo } from 'lucide-react';

interface ProjectProgressProps {
  data: ProjectOverviewData;
}

function taskStatusMeta(status: string | null): {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'default' | 'amber';
  icon: React.ReactNode;
} {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'success', icon: <CheckCircle className="h-3.5 w-3.5 text-forge-success" /> };
    case 'running':
      return { label: 'In progress', variant: 'amber', icon: <Clock className="h-3.5 w-3.5 text-forge-amber animate-pulse" /> };
    case 'failed':
      return { label: 'Failed', variant: 'error', icon: <XCircle className="h-3.5 w-3.5 text-forge-error" /> };
    case 'queued':
      return { label: 'Queued', variant: 'default', icon: <Clock className="h-3.5 w-3.5 text-forge-text-muted" /> };
    default:
      return { label: status ?? 'Pending', variant: 'default', icon: <ListTodo className="h-3.5 w-3.5 text-forge-text-muted" /> };
  }
}

export function ProjectProgress({ data }: ProjectProgressProps) {
  const project = data.project!;
  const activeJobs = data.aiJobs.filter((j) => j.status === 'running' || j.status === 'queued');

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="h-4 w-4 text-forge-amber" />
        <h2 className="text-sm font-semibold text-forge-text-primary">Project progress</h2>
      </div>

      {activeJobs.length > 0 ? (
        <ul className="space-y-2">
          {activeJobs.map((job) => {
            const meta = taskStatusMeta(job.status);
            return (
              <li
                key={job.id}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-forge-panel-elevated border border-forge-border-subtle"
              >
                <span className="flex items-center gap-2 text-xs text-forge-text-primary">
                  {meta.icon}
                  {job.taskType ?? 'AI task'}
                </span>
                <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-forge-text-muted">No active build plan</p>
          <LinkButton to={`/projects/${project.id}/sandbox`}>
            <Code className="h-3.5 w-3.5" />
            Open Sandbox
          </LinkButton>
        </div>
      )}
    </Card>
  );
}