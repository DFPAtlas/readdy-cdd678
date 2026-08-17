import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  buildReference,
  formatBuildRelativeTime,
  versionShortLabel,
  type BuildVersionLink,
  type ProjectBuildRecord,
} from '@/services/projectBuildsService';
import { GitBranch } from 'lucide-react';

interface RelatedVersionProps {
  builds: ProjectBuildRecord[];
  versionByBuildId: Record<string, BuildVersionLink>;
  projectId: string;
}

export function RelatedVersion({ builds, versionByBuildId, projectId }: RelatedVersionProps) {
  const build = builds.find((b) => versionByBuildId[b.id]);
  if (!build) return null;

  const version = versionByBuildId[build.id];

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="h-3.5 w-3.5 text-forge-amber" />
        <h3 className="text-sm font-semibold text-forge-text-primary">Resulting version</h3>
      </div>
      <p className="text-base font-semibold font-mono text-forge-text-primary">
        {versionShortLabel(version) ?? 'Unnamed version'}
      </p>
      <p className="text-xs text-forge-text-muted mt-1">
        Created {formatBuildRelativeTime(version.createdAt)}
      </p>
      <p className="text-xs text-forge-text-muted mt-0.5">From build {buildReference(build)}</p>
      <LinkButton
        to={`/projects/${projectId}/versions`}
        variant="secondary"
        size="sm"
        className="mt-3"
      >
        View Version
      </LinkButton>
    </div>
  );
}