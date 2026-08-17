import { Bot, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';

const CAPABILITY_CHIPS = ['Planning', 'Project Context', 'Tasks', 'Build Guidance', 'Review'];

interface MasterAgentCardProps {
  configured: boolean;
  providerLabel?: string | null;
  modelLabel?: string | null;
}

export function MasterAgentCard({ configured, providerLabel, modelLabel }: MasterAgentCardProps) {
  return (
    <div className="rounded-lg border border-forge-amber/25 bg-forge-panel p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-forge-amber/10 text-forge-amber shrink-0">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-forge-amber">
                Master Agent
              </span>
              <Badge variant={configured ? 'success' : 'warning'} size="sm">
                {configured ? 'Ready' : 'Provider required'}
              </Badge>
            </div>
            <h2 className="text-base font-semibold text-forge-text-primary mt-0.5">
              Project coordination and build guidance
            </h2>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-forge-text-secondary leading-relaxed">
        The Master Agent keeps project context, supports planning and coordinates AI-assisted
        work across the Forge development workflow.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {CAPABILITY_CHIPS.map((chip) => (
          <span
            key={chip}
            className="px-2.5 py-1 rounded-full border border-forge-border-subtle bg-forge-bg text-xs text-forge-text-secondary"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-forge-border-subtle flex flex-wrap items-center justify-between gap-3">
        {configured && providerLabel ? (
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-forge-text-muted">Provider</p>
              <p className="text-sm text-forge-text-primary font-medium mt-0.5">{providerLabel}</p>
            </div>
            {modelLabel && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-forge-text-muted">Model</p>
                <p className="text-sm text-forge-text-primary font-mono mt-0.5">{modelLabel}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-forge-text-muted">AI provider not configured</p>
        )}

        {!configured && (
          <LinkButton to="/settings/providers" variant="primary" size="sm">
            <Settings className="h-3.5 w-3.5" />
            Configure provider
          </LinkButton>
        )}
      </div>
    </div>
  );
}