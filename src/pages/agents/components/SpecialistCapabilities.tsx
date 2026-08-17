import type { SpecialistAgent } from '@/services/agentsService';
import { Badge } from '@/components/ui/Badge';
import {
  ListChecks,
  LayoutGrid,
  Palette,
  PenLine,
  Code2,
  TrendingUp,
  Accessibility,
  CheckCircle2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  planner: ListChecks,
  layout: LayoutGrid,
  design: Palette,
  copy: PenLine,
  developer: Code2,
  seo: TrendingUp,
  accessibility: Accessibility,
  qa: CheckCircle2,
  security: ShieldCheck,
};

export function SpecialistCapabilities({ agents }: { agents: SpecialistAgent[] }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-forge-text-primary">Specialist capabilities</h2>
        <p className="text-xs text-forge-text-muted mt-0.5">
          Focused agents that execute through your configured provider when a build runs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {agents.map((agent) => {
          const Icon = ICONS[agent.key] ?? Code2;
          return (
            <div
              key={agent.key}
              className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 flex flex-col hover:border-forge-border transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-md bg-forge-amber/10 text-forge-amber shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-forge-text-primary">{agent.label}</h3>
                  <p className="text-[10px] uppercase tracking-wider text-forge-text-muted">
                    {agent.capability}
                  </p>
                </div>
                <Badge variant="default" size="sm" className="ml-auto shrink-0">
                  Available
                </Badge>
              </div>

              <p className="text-xs text-forge-text-secondary leading-relaxed">{agent.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.chips.map((chip) => (
                  <span
                    key={chip}
                    className="px-2 py-0.5 rounded bg-forge-bg border border-forge-border-subtle text-[11px] text-forge-text-muted"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}