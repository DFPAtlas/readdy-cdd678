import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  formatVersionDate,
  sourceLabel,
  versionLabel,
  type ProjectVersionRecord,
} from '@/services/projectVersionsService';
import { ArrowLeftRight, Eye, CheckCircle2, Flag, RotateCcw, Sparkles } from 'lucide-react';

interface VersionTimelineProps {
  versions: ProjectVersionRecord[];
  currentVersion: ProjectVersionRecord | null;
  projectId: string;
  onView: (version: ProjectVersionRecord) => void;
  onCompare: (version: ProjectVersionRecord) => void;
}

export function VersionTimeline({
  versions,
  currentVersion,
  projectId,
  onView,
  onCompare,
}: VersionTimelineProps) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
      <div className="px-4 py-3 border-b border-forge-border-subtle">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted">
          Version history
        </p>
      </div>
      <ol className="relative">
        {versions.map((version, index) => {
          const isCurrent = currentVersion?.id === version.id;
          const buildRef =
            version.buildNumber != null
              ? `#${version.buildNumber}`
              : version.buildVersion
                ? version.buildVersion
                : null;

          return (
            <li
              key={version.id}
              className={`relative flex items-start gap-4 px-4 py-3 ${
                index < versions.length - 1 ? 'border-b border-forge-border-subtle' : ''
              } ${isCurrent ? 'bg-forge-amber/[0.04]' : ''}`}
            >
              {/* Timeline rail + dot */}
              <div className="flex flex-col items-center self-stretch flex-shrink-0">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full border-2 flex-shrink-0 ${
                    isCurrent
                      ? 'bg-forge-amber border-forge-amber'
                      : 'bg-forge-bg border-forge-border'
                  }`}
                  aria-hidden="true"
                />
                {index < versions.length - 1 && (
                  <span className="flex-1 w-px bg-forge-border-subtle mt-1" aria-hidden="true" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-medium text-forge-text-primary">
                    {versionLabel(version)}
                  </span>
                  {version.label && (
                    <span className="text-sm text-forge-text-secondary">{version.label}</span>
                  )}
                  {isCurrent && <Badge variant="amber" size="sm">Current</Badge>}
                  {!isCurrent && <Badge variant="default" size="sm">Previous</Badge>}
                  {version.isCheckpoint && (
                    <Badge variant="amber" size="sm">
                      <Flag className="h-3 w-3 mr-1" />
                      Checkpoint
                    </Badge>
                  )}
                  {version.publishedAt && (
                    <Badge variant="success" size="sm">Published</Badge>
                  )}
                  {version.restoredFromVersionId && (
                    <Badge variant="accent" size="sm">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restored
                    </Badge>
                  )}
                  {version.source === 'ai' && (
                    <Badge variant="agent" size="sm">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>

                <p className="mt-1 text-xs text-forge-text-muted">
                  {sourceLabel(version.source)} · {formatVersionDate(version.createdAt)}
                </p>

                {version.changeSummary && (
                  <p className="mt-1 text-sm text-forge-text-secondary truncate">
                    {version.changeSummary}
                  </p>
                )}

                {buildRef && (
                  <div className="mt-1.5">
                    <LinkButton
                      variant="ghost"
                      size="sm"
                      to={`/projects/${projectId}/builds`}
                      className="!h-auto !p-0 text-xs font-normal"
                    >
                      Related build {buildRef}
                    </LinkButton>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(version)}
                  icon={<Eye className="h-3.5 w-3.5" />}
                  aria-label={`View ${versionLabel(version)} details`}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCompare(version)}
                  icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
                  aria-label={`Compare ${versionLabel(version)}`}
                >
                  Compare
                </Button>
              </div>
            </li>
          );
        })}

        {versions.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-forge-text-muted">
            No versions yet.
          </li>
        )}
      </ol>

      {currentVersion && (
        <div className="px-4 py-2 border-t border-forge-border-subtle flex items-center gap-2 text-xs text-forge-text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-forge-amber" />
          {versionLabel(currentVersion)} is the current version.
        </div>
      )}
    </div>
  );
}