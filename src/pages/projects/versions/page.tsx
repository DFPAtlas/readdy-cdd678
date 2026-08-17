import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectVersions } from '@/hooks/useProjectVersions';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { CurrentVersionCard } from './components/CurrentVersionCard';
import { VersionStats } from './components/VersionStats';
import { VersionTimeline } from './components/VersionTimeline';
import { VersionSafety } from './components/VersionSafety';
import { VersionDetailDrawer } from './components/VersionDetailDrawer';
import { VersionCompareModal } from './components/VersionCompareModal';
import type { ProjectVersionRecord } from '@/services/projectVersionsService';
import { History, Lock, AlertTriangle, RefreshCw, TerminalSquare } from 'lucide-react';

function VersionsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function VersionsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectVersions(projectId);
  const [viewVersion, setViewVersion] = useState<ProjectVersionRecord | null>(null);
  const [compareFrom, setCompareFrom] = useState<ProjectVersionRecord | null>(null);

  if (loading) return <VersionsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project versions"
        message="Something went wrong while loading this project's version history. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to see your Forge project history."
        action={
          <LinkButton variant="secondary" to="/login">
            Sign in
          </LinkButton>
        }
      />
    );
  }

  if (!data.found || !data.project) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Project not found"
        description="The project you're looking for doesn't exist or has been removed."
        action={
          <LinkButton variant="secondary" to="/projects">
            Back to Projects
          </LinkButton>
        }
      />
    );
  }

  const handleCompare = (version: ProjectVersionRecord) => {
    const isCurrent = data.currentVersion?.id === version.id;
    const from = isCurrent ? (data.versions[1] ?? version) : version;
    setCompareFrom(from);
  };

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project History"
        title="Versions"
        description="Review project history, inspect previous states and safely return to an earlier version when Forge supports it."
        projectId={data.project.id}
        projectName={data.project.name}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              loading={refreshing}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <LinkButton variant="secondary" size="sm" to={`/projects/${data.project.id}/sandbox`}>
              <TerminalSquare className="h-3.5 w-3.5" />
              Open Sandbox
            </LinkButton>
          </>
        }
      />

      {data.versions.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No versions yet"
          description="Versions will appear here when Forge creates project snapshots through the supported workflow."
          action={
            <LinkButton to={`/projects/${data.project.id}/builds`}>
              <TerminalSquare className="h-3.5 w-3.5" />
              View Builds
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            <CurrentVersionCard
              version={data.currentVersion}
              projectId={data.project.id}
            />

            <VersionStats
              versions={data.versions}
              currentVersion={data.currentVersion}
              latestCreatedAt={data.latestCreatedAt}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <VersionTimeline
                  versions={data.versions}
                  currentVersion={data.currentVersion}
                  projectId={data.project.id}
                  onView={setViewVersion}
                  onCompare={handleCompare}
                />
              </div>
              <div>
                <VersionSafety projectId={data.project.id} />
              </div>
            </div>
          </div>
        </>
      )}

      <VersionDetailDrawer
        version={viewVersion}
        projectId={data.project.id}
        open={viewVersion !== null}
        onClose={() => setViewVersion(null)}
      />

      <VersionCompareModal
        versions={data.versions}
        projectId={data.project.id}
        open={compareFrom !== null}
        onClose={() => setCompareFrom(null)}
        initialFrom={compareFrom}
        initialTo={data.currentVersion}
      />
    </>
  );
}