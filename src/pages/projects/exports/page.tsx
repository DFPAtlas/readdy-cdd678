import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectExports } from '@/hooks/useProjectExports';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { ExportHistory } from './components/ExportHistory';
import { ExportDetailDrawer } from './components/ExportDetailDrawer';
import { ExportReadiness } from './components/ExportReadiness';
import { DeploymentHandoff } from './components/DeploymentHandoff';
import { SourceOwnership } from './components/SourceOwnership';
import { Package, RefreshCw, Lock, AlertTriangle, Code, Info } from 'lucide-react';

function ExportsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-40 mb-3" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}

export default function ExportsPage() {
  const { projectId } = useParams();
  const { data, loading, error, retry, refresh, refreshing } = useProjectExports(projectId);
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);

  if (loading) return <ExportsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load exports"
        message="Something went wrong while loading this project's exports. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to see your Forge project exports."
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
  const selectedExport = data.exports.find((e) => e.id === selectedExportId) ?? null;

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project delivery"
        title="Exports"
        description="Package your Forge project for handoff, backup or deployment using the export options currently available to this project."
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

      {data.exports.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-forge-text-muted mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-forge-text-primary">
                Source export isn't wired up in this workspace yet.
              </p>
              <p className="mt-1 text-sm text-forge-text-muted">
                Forge currently delivers projects through publishing rather than downloadable
                source packages. To take your project live, open the Sandbox and publish it.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <ExportHistory exports={data.exports} onSelect={(record) => setSelectedExportId(record.id)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {data.exports.length > 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="Export history"
              description="Select an export above to inspect its details. Exports are read-only project packages."
            />
          ) : (
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="No exports yet"
              description="When you're ready to take a project out of Forge, an available project version can be turned into an export here."
              action={
                <LinkButton to={`/projects/${project.id}/builds`}>
                  <Code className="h-3.5 w-3.5" />
                  View Builds
                </LinkButton>
              }
            />
          )}
        </div>

        <div className="space-y-4">
          <ExportReadiness
            currentVersion={data.currentVersion}
            latestBuild={data.latestBuild}
          />
          <DeploymentHandoff projectId={project.id} />
          <SourceOwnership />
        </div>
      </div>

      <ExportDetailDrawer record={selectedExport} onClose={() => setSelectedExportId(null)} />
    </>
  );
}