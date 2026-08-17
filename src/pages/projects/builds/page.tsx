import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectBuilds } from '@/hooks/useProjectBuilds';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { CurrentBuild } from './components/CurrentBuild';
import { BuildHealth } from './components/BuildHealth';
import { BuildHistory } from './components/BuildHistory';
import { BuildPipeline } from './components/BuildPipeline';
import { RelatedVersion } from './components/RelatedVersion';
import { BuildDetailDrawer } from './components/BuildDetailDrawer';
import { Hammer, RefreshCw, Lock, AlertTriangle, Code } from 'lucide-react';

function BuildsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </div>
  );
}

export default function BuildsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectBuilds(projectId);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  if (loading) return <BuildsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load build history"
        message="Something went wrong while loading this project's builds. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to see your Forge project builds."
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

  const project = data.project;

  const selectedBuild = data.builds.find((b) => b.id === selectedBuildId) ?? null;

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project"
        title="Builds"
        description="Track project build activity, progress, results and failures from one place."
        projectId={project.id}
        projectName={project.name}
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
            <LinkButton to={`/projects/${project.id}/sandbox`} size="sm">
              <Code className="h-3.5 w-3.5" />
              Open Sandbox
            </LinkButton>
          </>
        }
      />

      {data.builds.length === 0 ? (
        <EmptyState
          icon={<Hammer className="h-8 w-8" />}
          title="No builds yet"
          description="Start working in the Forge Sandbox and build activity will appear here when the project runs its first build."
          action={
            <LinkButton to={`/projects/${project.id}/sandbox`}>
              <Code className="h-3.5 w-3.5" />
              Open Sandbox
            </LinkButton>
          }
        />
      ) : (
        <>
          <div className="mb-4">
            <CurrentBuild build={data.currentBuild} projectId={project.id} />
          </div>

          <div className="mb-4">
            <BuildHealth data={data} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <BuildHistory
                builds={data.builds}
                versionByBuildId={data.versionByBuildId}
                onSelect={(b) => setSelectedBuildId(b.id)}
              />
            </div>
            <div className="space-y-4">
              <BuildPipeline />
              <RelatedVersion
                builds={data.builds}
                versionByBuildId={data.versionByBuildId}
                projectId={project.id}
              />
            </div>
          </div>
        </>
      )}

      <BuildDetailDrawer
        build={selectedBuild}
        versionLink={selectedBuild ? data.versionByBuildId[selectedBuild.id] : undefined}
        projectId={project.id}
        projectName={project.name}
        onClose={() => setSelectedBuildId(null)}
      />
    </>
  );
}