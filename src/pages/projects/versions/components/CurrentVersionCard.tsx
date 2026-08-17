import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  formatVersionDate,
  sourceLabel,
  versionLabel,
  type ProjectVersionRecord,
} from '@/services/projectVersionsService';
import { Calendar, CheckCircle2, Clock, Hash, User, GitBranch } from 'lucide-react';

interface CurrentVersionCardProps {
  version: ProjectVersionRecord | null;
  projectId: string;
}

export function CurrentVersionCard({ version, projectId }: CurrentVersionCardProps) {
  if (!version) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted mb-1">
              Current version
            </p>
            <h2 className="text-base font-semibold text-forge-text-primary">No versions yet</h2>
            <p className="mt-1 text-sm text-forge-text-muted max-w-xl">
              Forge creates project snapshots as you work in the Sandbox. Your first version will
              appear here once the project has been saved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const buildRef =
    version.buildNumber != null
      ? `#${version.buildNumber}`
      : version.buildVersion
        ? version.buildVersion
        : null;

  return (
    <div className="rounded-lg border border-forge-amber/30 bg-forge-panel p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-amber">
              Current version
            </p>
            <Badge variant="amber" size="sm">
              Current
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-forge-text-primary font-mono">
              {versionLabel(version)}
            </h2>
            {version.label && (
              <span className="text-sm text-forge-text-secondary">{version.label}</span>
            )}
          </div>
          {version.description && (
            <p className="mt-1.5 text-sm text-forge-text-secondary max-w-2xl">
              {version.description}
            </p>
          )}
          {version.changeSummary && !version.description && (
            <p className="mt-1.5 text-sm text-forge-text-secondary max-w-2xl">
              {version.changeSummary}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          <LinkButton variant="secondary" size="sm" to={`/projects/${projectId}/sandbox`}>
            <GitBranch className="h-3.5 w-3.5" />
            Open Sandbox
          </LinkButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-forge-text-muted mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-forge-text-muted">Created</p>
            <p className="text-sm text-forge-text-primary whitespace-nowrap">
              {formatVersionDate(version.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-forge-text-muted mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-forge-text-muted">Created by</p>
            <p className="text-sm text-forge-text-primary truncate">
              {version.createdBy ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Hash className="h-4 w-4 text-forge-text-muted mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-forge-text-muted">Related build</p>
            {buildRef ? (
              <LinkButton
                variant="ghost"
                size="sm"
                to={`/projects/${projectId}/builds`}
                className="!h-auto !p-0 text-sm font-normal"
              >
                {buildRef}
              </LinkButton>
            ) : (
              <p className="text-sm text-forge-text-primary">—</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-forge-text-muted mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-forge-text-muted">Source</p>
            <p className="text-sm text-forge-text-primary whitespace-nowrap">
              {sourceLabel(version.source)}
            </p>
          </div>
        </div>
      </div>

      {(version.isCheckpoint || version.publishedAt || version.restoredFromVersionId) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {version.isCheckpoint && <Badge variant="amber" size="sm">Checkpoint</Badge>}
          {version.publishedAt && (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Published
            </Badge>
          )}
          {version.restoredFromVersionId && (
            <Badge variant="accent" size="sm">Restored from earlier version</Badge>
          )}
        </div>
      )}
    </div>
  );
}