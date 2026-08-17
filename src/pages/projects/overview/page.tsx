import { useParams } from 'react-router-dom';
import { useProjectOverview } from '@/hooks/useProjectOverview';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectHealth } from './components/ProjectHealth';
import { ContinueBuilding } from './components/ContinueBuilding';
import { ProjectProgress } from './components/ProjectProgress';
import { RecentActivity } from './components/RecentActivity';
import { NeedsAttention } from './components/NeedsAttention';
import { QuickAccess } from './components/QuickAccess';
import { VersionSnapshot } from './components/VersionSnapshot';
import { Code, FolderPlus, AlertTriangle, Lock } from 'lucide-react';

function OverviewSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-4 w-48 mb-3" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-96 max-w-full mb-3" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
          <Skeleton className="h-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry } = useProjectOverview(projectId);

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load project overview"
        message="Something went wrong while loading this project. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to see your Forge project."
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
  const isFresh = data.builds.length === 0 && data.versions.length === 0 && data.aiJobs.length === 0;

  return (
    <>
      <ProjectHeader data={data} />
      <ProjectHealth data={data} />

      {isFresh && (
        <div className="mb-4 rounded-lg border border-forge-border-subtle bg-forge-panel p-6 flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-forge-amber" />
            <h2 className="text-sm font-semibold text-forge-text-primary">Your project is ready to start</h2>
          </div>
          <p className="text-sm text-forge-text-muted">
            Open the Forge Sandbox to begin planning and building.
          </p>
          <LinkButton to={`/projects/${project.id}/sandbox`}>
            <Code className="h-3.5 w-3.5" />
            Open Sandbox
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ContinueBuilding data={data} />
          <ProjectProgress data={data} />
          <RecentActivity activity={data.activity} />
        </div>
        <div className="space-y-4">
          <NeedsAttention items={data.attention} projectId={project.id} />
          <QuickAccess projectId={project.id} />
          <VersionSnapshot data={data} />
        </div>
      </div>
    </>
  );
}