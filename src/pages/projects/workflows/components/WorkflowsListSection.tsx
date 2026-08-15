import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Plus, Play, Pause, Copy, Trash2, Workflow } from 'lucide-react';
import type { Workflow, WorkflowStatus } from '../workflowTypes';
import { createWorkflow, setWorkflowStatus, deleteWorkflow, duplicateWorkflow } from '../workflowData';

function statusVariant(s: WorkflowStatus): 'default' | 'success' | 'warning' | 'error' {
  if (s === 'active') return 'success';
  if (s === 'paused') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
}

export function WorkflowsListSection({ projectId, workflows, role, loading, error, onRefresh, onOpen }: {
  projectId: string;
  workflows: Workflow[];
  role: string | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onOpen: (w: Workflow) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = role === 'owner' || role === 'admin' || role === 'developer';

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await createWorkflow(projectId, { name, description });
    setCreating(false);
    setName('');
    setDescription('');
    setShowCreate(false);
    await onRefresh();
  };

  const toggleStatus = async (w: Workflow) => {
    setBusyId(w.id);
    await setWorkflowStatus(w.id, w.status === 'active' ? 'paused' : 'active');
    setBusyId(null);
    await onRefresh();
  };

  const handleDuplicate = async (w: Workflow) => {
    setBusyId(w.id);
    await duplicateWorkflow(projectId, w.id, w.name);
    setBusyId(null);
    await onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteWorkflow(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    await onRefresh();
  };

  if (loading) return <div className="py-16 flex justify-center"><Spinner /></div>;
  if (error) return <EmptyState title="Could not load workflows" description={error} action={<Button size="sm" onClick={onRefresh}>Retry</Button>} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-forge-text-muted">{workflows.length} workflow{workflows.length === 1 ? '' : 's'}</span>
        {canManage && (
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>New workflow</Button>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            icon={<Workflow className="h-8 w-8" />}
            title="No workflows here"
            description="Build an automation by connecting triggers to actions on a visual canvas."
            action={canManage ? <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>New workflow</Button> : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((w) => (
            <div key={w.id} className="rounded-lg border border-forge-border-subtle bg-forge-panel p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(w)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-forge-text-primary truncate">{w.name}</span>
                  <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
                </div>
                {w.description && <p className="text-xs text-forge-text-muted truncate mt-0.5">{w.description}</p>}
                <p className="text-[11px] text-forge-text-muted mt-0.5">Updated {new Date(w.updatedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onOpen(w)}>Open</Button>
                {canManage && (
                  <>
                    <Button variant="ghost" size="sm" icon={w.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} loading={busyId === w.id} onClick={() => toggleStatus(w)}>
                      {w.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="sm" icon={<Copy className="h-3.5 w-3.5" />} loading={busyId === w.id} onClick={() => handleDuplicate(w)}>Duplicate</Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} className="text-forge-error" onClick={() => setDeleteTarget(w)}>Delete</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New workflow">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-forge-text-secondary mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contact form notification" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-forge-text-secondary mb-1">Description</label>
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow do?" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>Create workflow</Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete workflow"
        message={`Delete "${deleteTarget?.name}"? This removes the workflow and all of its versions and runs.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}