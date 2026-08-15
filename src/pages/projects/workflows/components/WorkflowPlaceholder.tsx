import { EmptyState } from '@/components/ui/EmptyState';
import { Settings } from 'lucide-react';

export function WorkflowPlaceholder({ section }: { section: string }) {
  const detail: Record<string, { title: string; description: string }> = {
    settings: {
      title: 'Workflow settings',
      description: 'Per-project rate limits, maximum workflow duration, node count, and inbound webhook endpoint configuration.',
    },
  };

  const d = detail[section] ?? { title: section, description: 'This area ships in the next Workflows milestone.' };

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
      <EmptyState
        icon={<Settings className="h-8 w-8" />}
        title={d.title}
        description={`${d.description} This ships together with the execution engine.`}
      />
    </div>
  );
}