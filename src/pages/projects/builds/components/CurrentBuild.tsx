import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  buildBadgeVariant,
  buildReference,
  buildStatusKind,
  buildStatusLabel,
  BUILD_PIPELINE_STAGES,
  formatBuildRelativeTime,
  pipelineStageIndex,
  type ProjectBuildRecord,
} from '@/services/projectBuildsService';
import { Hammer, CheckCircle2, Loader2, Circle } from 'lucide-react';

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return '—';
  const then = new Date(startedAt).getTime();
  if (Number.isNaN(then)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function CurrentBuild({
  build,
  projectId,
}: {
  build: ProjectBuildRecord | null;
  projectId: string;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!build) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, [build]);

  if (!build) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel px-4 py-3 flex items-center gap-3">
        <span className="h-8 w-8 rounded-md bg-forge-border/40 flex items-center justify-center text-forge-text-muted">
          <Hammer className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-forge-text-primary">No build currently running</p>
          <p className="text-xs text-forge-text-muted">Start a build from the Forge Sandbox.</p>
        </div>
        <LinkButton to={`/projects/${projectId}/sandbox`} size="sm">
          Open Sandbox
        </LinkButton>
      </div>
    );
  }

  const kind = buildStatusKind(build.status);
  const stageIndex = pipelineStageIndex(build.status);

  return (
    <div className="rounded-lg border border-forge-amber/30 bg-forge-panel p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-forge-amber animate-pulse" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-amber">
              Build in progress
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold font-mono text-forge-text-primary">
              Build {buildReference(build)}
            </h2>
            <Badge variant={buildBadgeVariant(kind)} size="sm">
              {buildStatusLabel(build.status)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] text-forge-text-muted">Started</p>
            <p className="text-sm text-forge-text-primary">
              {formatBuildRelativeTime(build.startedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-forge-text-muted">Elapsed</p>
            <p className="text-sm font-mono text-forge-text-primary">
              {elapsedLabel(build.startedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {BUILD_PIPELINE_STAGES.map((stage, i) => {
          const isDone = i < stageIndex;
          const isActive = i === stageIndex;
          return (
            <div key={stage} className="flex items-center gap-1">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${
                  isActive
                    ? 'border-forge-amber/40 bg-forge-amber/10'
                    : isDone
                      ? 'border-forge-border-subtle bg-forge-panel'
                      : 'border-forge-border-subtle bg-transparent'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-forge-success" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 text-forge-amber animate-spin" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-forge-text-muted" />
                )}
                <span
                  className={`text-xs whitespace-nowrap ${
                    isActive
                      ? 'text-forge-amber'
                      : isDone
                        ? 'text-forge-text-primary'
                        : 'text-forge-text-muted'
                  }`}
                >
                  {stage}
                </span>
              </div>
              {i < BUILD_PIPELINE_STAGES.length - 1 && (
                <span className="text-forge-text-muted text-xs">›</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}