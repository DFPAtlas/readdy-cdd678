import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectWorkflows } from '@/hooks/useProjectWorkflows';
import { canManageWorkflows } from '@/services/projectWorkflowsService';
import type { WorkflowSummary } from '@/services/projectWorkflowsService';
import type { Workflow } from './workflowTypes';
import { createWorkflow, saveVersion } from './workflowData';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { WorkflowsOverview } from './components/WorkflowsOverview';
import { WorkflowsListSection } from './components/WorkflowsListSection';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { RunHistorySection } from './components/RunHistorySection';
import { TemplatesSection } from './components/TemplatesSection';
import { ConnectionsSection } from './components/ConnectionsSection';
import { CreateWorkflowModal } from './components/CreateWorkflowModal';
import {
  RefreshCw, Plus, Workflow as WorkflowIcon, History, LayoutTemplate, Plug, Lock, AlertTriangle,
} from 'lucide-react';

type SectionKey = 'workflows' | 'runs' | 'templates' | 'connections';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'workflows', label: 'Workflows', icon: <WorkflowIcon className="h-3.5 w-3.5" /> },
  { key: 'runs', label: 'Run history', icon: <History className="h-3.5 w-3.5" /> },
  { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
  { key: 'connections', label: 'Connections', icon: <Plug className="h-3.5 w-3.5" /> },
];

function WorkflowsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-32" />
    </div>
  );
}

function toWorkflow(summary: WorkflowSummary, projectId: string): Workflow {
  return {
    id: summary.id,
    projectId,
    name: summary.name,
    description: summary.description,
    status: summary.status,
    currentVersionId: null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

export default function WorkflowsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectWorkflows(projectId);

  const [section, setSection] = useState<SectionKey>('workflows');
  const [openWorkflowId, setOpenWorkflowId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = useCallback(
    async (name: string, description: string) => {
      if (!projectId) return false;
      const res = await createWorkflow(projectId, { name, description });
      if (res.ok) await refresh();
      return res.ok;
    },
    [projectId, refresh],
  );

  if (loading) return <WorkflowsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project workflows"
        message="Something went wrong while loading this project's workflows. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to manage your Forge project workflows."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  if (!data.found || !data.project) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={
          <LinkButton variant="secondary" to="/projects">
            Back to Projects
          </LinkButton>
        }
      />
    );
  }

  const project = data.project;
  const canManage = canManageWorkflows(data.currentUserRole);
  const openSummary = data.workflows.find((w) => w.id === openWorkflowId) ?? null;

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Automation"
        title="Workflows"
        description="Connect repeatable project actions into visible workflows and track what happens when they run."
        projectId={project.id}
        projectName={project.name}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              loading={refreshing}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
                New workflow
              </Button>
            )}
          </>
        }
      />

      {openSummary ? (
        <WorkflowBuilder
          projectId={project.id}
          workflow={toWorkflow(openSummary, project.id)}
          role={data.currentUserRole}
          onBack={() => {
            setOpenWorkflowId(null);
            void refresh();
          }}
          onRefresh={refresh}
        />
      ) : (
        <>
          <WorkflowsOverview counts={data.counts} runCount={data.runCount} />

          <nav className="flex flex-wrap items-center gap-1 mb-5 border-b border-forge-border-subtle" role="navigation" aria-label="Workflow sections">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  section === s.key
                    ? 'border-forge-amber text-forge-amber'
                    : 'border-transparent text-forge-text-muted hover:text-forge-text-primary'
                }`}
                aria-current={section === s.key ? 'page' : undefined}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>

          {section === 'workflows' && (
            <WorkflowsListSection
              projectId={project.id}
              workflows={data.workflows}
              role={data.currentUserRole}
              onCreateRequest={() => setCreateOpen(true)}
              onRefresh={refresh}
              onOpen={(w) => setOpenWorkflowId(w.id)}
            />
          )}

          {section === 'runs' && <RunHistorySection projectId={project.id} />}
          {section === 'templates' && (
            <TemplatesSection
              onUse={async (t) => {
                const res = await createWorkflow(project.id, { name: t.name, description: t.description });
                if (res.ok && res.workflow) {
                  await saveVersion(res.workflow.id, t.definition, 'unvalidated');
                }
                await refresh();
              }}
            />
          )}
          {section === 'connections' && <ConnectionsSection projectId={project.id} role={data.currentUserRole} onRefresh={refresh} />}
        </>
      )}

      <CreateWorkflowModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}