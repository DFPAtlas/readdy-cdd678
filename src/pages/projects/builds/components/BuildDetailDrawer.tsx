import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  buildBadgeVariant,
  buildReference,
  buildStatusKind,
  buildStatusLabel,
  formatBuildDuration,
  formatBuildTimestamp,
  versionShortLabel,
  type BuildVersionLink,
  type ProjectBuildRecord,
} from '@/services/projectBuildsService';
import { AlertTriangle, GitBranch, Terminal } from 'lucide-react';

interface BuildDetailDrawerProps {
  build: ProjectBuildRecord | null;
  versionLink: BuildVersionLink | undefined;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-forge-bg/60 rounded-md px-3 py-2.5">
      <p className="text-[11px] text-forge-text-muted mb-0.5">{label}</p>
      <p className="text-sm text-forge-text-primary font-mono break-words">{value}</p>
    </div>
  );
}

export function BuildDetailDrawer({
  build,
  versionLink,
  projectId,
  projectName,
  onClose,
}: BuildDetailDrawerProps) {
  if (!build) return null;

  const kind = buildStatusKind(build.status);
  const isFailed = kind === 'failed';

  return (
    <Drawer
      open={!!build}
      onClose={onClose}
      title={`Build ${buildReference(build)}`}
      position="right"
      width="w-full max-w-lg"
    >
      <div className="p-4 space-y-4">
        {/* Status banner */}
        <div className="flex items-center gap-2">
          <Badge variant={buildBadgeVariant(kind)} size="md">
            {buildStatusLabel(build.status)}
          </Badge>
          {build.environment && (
            <span className="text-xs text-forge-text-muted">{build.environment}</span>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <MetaItem label="Started" value={formatBuildTimestamp(build.startedAt)} />
          <MetaItem label="Completed" value={formatBuildTimestamp(build.completedAt)} />
          <MetaItem label="Duration" value={formatBuildDuration(build.duration)} />
          <MetaItem label="Project" value={projectName} />
          <MetaItem
            label="Version"
            value={versionShortLabel(versionLink) ?? build.version ?? '—'}
          />
          <MetaItem
            label="Warnings / Errors"
            value={`${build.warningCount} / ${build.errorCount}`}
          />
        </div>

        {/* Failure */}
        {isFailed && (
          <div className="rounded-lg border border-forge-error/20 bg-forge-error/5 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="h-4 w-4 text-forge-error" />
              <p className="text-sm font-semibold text-forge-error">Build failed</p>
            </div>
            <p className="text-xs text-forge-text-secondary">
              {build.failureMessage || 'The build did not complete successfully.'}
            </p>

            {(build.failureCode || build.failureMessage) && (
              <details className="mt-2">
                <summary className="text-xs text-forge-text-muted cursor-pointer hover:text-forge-text-primary select-none">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 rounded-md bg-forge-bg/60 text-[11px] font-mono text-forge-text-secondary whitespace-pre-wrap break-words overflow-x-auto">
                  {build.failureCode ? `code: ${build.failureCode}\n` : ''}
                  {build.failureMessage ? `message: ${build.failureMessage}` : ''}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Resulting version */}
        {versionLink && (
          <div className="rounded-lg border border-forge-border-subtle bg-forge-bg/40 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="h-4 w-4 text-forge-amber flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-forge-text-muted">Resulting version</p>
                <p className="text-sm font-mono text-forge-text-primary">
                  {versionShortLabel(versionLink) ?? 'Unnamed version'}
                </p>
              </div>
            </div>
            <LinkButton to={`/projects/${projectId}/versions`} variant="secondary" size="sm">
              View Version
            </LinkButton>
          </div>
        )}

        {/* Logs */}
        <div className="rounded-lg border border-forge-border-subtle bg-forge-bg/40 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-3.5 w-3.5 text-forge-text-muted" />
            <p className="text-xs font-semibold text-forge-text-primary">Logs</p>
          </div>
          <p className="text-xs text-forge-text-muted">
            Detailed build logs are not available for this build.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isFailed ? (
            <LinkButton to={`/projects/${projectId}/sandbox`} size="sm">
              Open Sandbox
            </LinkButton>
          ) : (
            <LinkButton to={`/projects/${projectId}/sandbox`} variant="secondary" size="sm">
              Open Sandbox
            </LinkButton>
          )}
        </div>
      </div>
    </Drawer>
  );
}