import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Workflow, Play, Pencil, Pause, XCircle, LayoutTemplate, Plug, History, Settings,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Workflow as WorkflowType, WorkflowStatus, WorkflowTemplate } from './workflowTypes';
import { listWorkflows, createWorkflow, saveVersion, currentProjectRole } from './workflowData';
import { WorkflowsListSection } from './components/WorkflowsListSection';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { RunHistorySection } from './components/RunHistorySection';
import { ConnectionsSection } from './components/ConnectionsSection';
import { TemplatesSection } from './components/TemplatesSection';
import { WorkflowPlaceholder } from './components/WorkflowPlaceholder';

type SectionKey = 'all' | 'active' | 'draft' | 'paused' | 'failed' | 'templates' | 'connections' | 'runs' | 'settings';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; filter: WorkflowStatus | null }[] = [
  { key: 'all', label: 'All workflows', icon: <Workflow className="h-3.5 w-3.5" />, filter: null },
  { key: 'active', label: 'Active', icon: <Play className="h-3.5 w-3.5" />, filter: 'active' },
  { key: 'draft', label: 'Draft', icon: <Pencil className="h-3.5 w-3.5" />, filter: 'draft' },
  { key: 'paused', label: 'Paused', icon: <Pause className="h-3.5 w-3.5" />, filter: 'paused' },
  { key: 'failed', label: 'Failed', icon: <XCircle className="h-3.5 w-3.5" />, filter: 'failed' },
  { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-3.5 w-3.5" />, filter: null },
  { key: 'connections', label: 'Connections', icon: <Plug className="h-3.5 w-3.5" />, filter: null },
  { key: 'runs', label: 'Run history', icon: <History className="h-3.5 w-3.5" />, filter: null },
  { key: 'settings', label: 'Settings', icon: <Settings className="h-3.5 w-3.5" />, filter: null },
];

export default function WorkflowsPage() {
  const { projectId } = useParams();
  const [section, setSection] = useState<SectionKey>('all');
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openWorkflowId, setOpenWorkflowId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    const [list, r] = await Promise.all([listWorkflows(projectId), currentProjectRole(projectId)]);
    setWorkflows(list);
    setRole(r);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const current = SECTIONS.find((s) => s.key === section)!;
  const filtered = current.filter ? workflows.filter((w) => w.status === current.filter) : workflows;
  const openWorkflow = workflows.find((w) => w.id === openWorkflowId) ?? null;

  const handleUseTemplate = async (t: WorkflowTemplate) => {
    if (!projectId) return;
    const res = await createWorkflow(projectId, { name: t.name, description: t.description });
    if (res.ok && res.workflow) {
      await saveVersion(res.workflow.id, t.definition, 'unvalidated');
    }
    await refresh();
    setSection('all');
  };

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Visual automations that connect site events to controlled actions — no code, no exposed secrets."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Workflows' },
        ]}
      />

      {openWorkflow ? (
        <WorkflowBuilder
          projectId={projectId ?? ''}
          workflow={openWorkflow}
          role={role}
          onBack={() => { setOpenWorkflowId(null); void refresh(); }}
          onRefresh={refresh}
        />
      ) : (
        <>
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

          {(section === 'all' || section === 'active' || section === 'draft' || section === 'paused' || section === 'failed') && (
            <WorkflowsListSection
              projectId={projectId ?? ''}
              workflows={filtered}
              role={role}
              loading={loading}
              error={error}
              onRefresh={refresh}
              onOpen={(w) => setOpenWorkflowId(w.id)}
            />
          )}

          {section === 'templates' && <TemplatesSection onUse={handleUseTemplate} />}
          {section === 'connections' && <ConnectionsSection projectId={projectId ?? ''} role={role} onRefresh={refresh} />}
          {section === 'runs' && <RunHistorySection projectId={projectId ?? ''} />}
          {section === 'settings' && <WorkflowPlaceholder section="settings" />}
        </>
      )}
    </div>
  );
}