import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { BuildStatusBadge } from '@/pages/projects/components/ProjectStatusBadge';
import {
  formatOverviewRelativeTime,
  versionShortLabel,
  type ProjectOverviewData,
} from '@/services/projectOverviewService';
import { GitBranch, ArrowRight } from 'lucide-react';

interface VersionSnapshotProps {
  data: ProjectOverviewData;
}

export function VersionSnapshot({ data }: VersionSnapshotProps) {
  const project = data.project!;
  const version = data.latestVersion;

  if (!version) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-forge-text-primary mb-3">Version snapshot</h2>
        <p className="text-xs text-forge-text-muted">No version created yet.</p>
      </Card>
    );
  }

  const label = versionShortLabel(version);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-forge-text-primary">Version snapshot</h2>
        <GitBranch className="h-4 w-4 text-forge-accent" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        {label && (
          <span className="text-sm font-semibold text-forge-text-primary font-mono">{label}</span>
        )}
        {version.createdAt && (
          <span className="text-xs text-forge-text-muted">
            {formatOverviewRelativeTime(version.createdAt)}
          </span>
        )}
      </div>

      {data.latestBuild && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-forge-text-muted">Build</span>
          <BuildStatusBadge status={data.latestBuild.status} />
        </div>
      )}

      {version.changeSummary && (
        <p className="text-xs text-forge-text-secondary mt-2">{version.changeSummary}</p>
      )}

      <Link
        to={`/projects/${project.id}/versions`}
        className="inline-flex items-center gap-1 text-xs text-forge-amber hover:text-forge-amber-dim font-medium mt-3"
      >
        View Versions
        <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}