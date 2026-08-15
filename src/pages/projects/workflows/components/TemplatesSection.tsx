import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Workflow, Zap } from 'lucide-react';
import type { WorkflowTemplate } from '../workflowTypes';
import { WORKFLOW_TEMPLATES } from '../workflowTypes';

export function TemplatesSection({ onUse }: { onUse: (t: WorkflowTemplate) => Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleUse = async (t: WorkflowTemplate) => {
    setBusyId(t.id);
    await onUse(t);
    setBusyId(null);
  };

  return (
    <div>
      <p className="text-xs text-forge-text-muted mb-4">
        Safe starter workflows. Each still requires connection mapping and validation before it can be activated.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {WORKFLOW_TEMPLATES.map((t) => (
          <div key={t.id} className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Workflow className="h-4 w-4 text-forge-amber" />
              <Badge>{t.category}</Badge>
            </div>
            <h3 className="text-sm font-medium text-forge-text-primary">{t.name}</h3>
            <p className="text-xs text-forge-text-muted mt-1 flex-1">{t.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" icon={<Zap className="h-3.5 w-3.5" />} loading={busyId === t.id} onClick={() => handleUse(t)}>Use template</Button>
              <span className="text-[11px] text-forge-text-muted">{t.definition.nodes.length} nodes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}