import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectSettings } from '@/hooks/useProjectSettings';
import { updateProjectDetails, updateProjectAccess } from '@/services/projectSettingsService';
import { ProjectSectionHeader } from '@/pages/projects/components/ProjectSectionHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { GeneralSection } from './components/GeneralSection';
import { DetailsSection } from './components/DetailsSection';
import { AiConfigSection } from './components/AiConfigSection';
import { AccessSection } from './components/AccessSection';
import { RefreshCw, Lock, AlertTriangle, Settings2 } from 'lucide-react';

type SectionId = 'general' | 'details' | 'ai' | 'access';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'details', label: 'Details' },
  { id: 'ai', label: 'AI' },
  { id: 'access', label: 'Access' },
];

const SECTION_TITLES: Record<SectionId, string> = {
  general: 'General',
  details: 'Details',
  ai: 'AI',
  access: 'Access',
};

function SettingsSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-6">
        <Skeleton className="h-48 w-44 hidden lg:block" />
        <Skeleton className="h-72 flex-1" />
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, loading, error, retry, refresh, refreshing } = useProjectSettings(projectId);
  const [activeSection, setActiveSection] = useState<SectionId>('general');

  if (loading) return <SettingsSkeleton />;

  if (error) {
    return (
      <ErrorState
        title="Unable to load project settings"
        message="Something went wrong while loading this project's configuration. Please try again."
        onRetry={retry}
      />
    );
  }

  if (!data.authenticated) {
    return (
      <EmptyState
        icon={<Lock className="h-8 w-8" />}
        title="Sign in to view this project"
        description="You need to be signed in to manage your Forge project settings."
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

  const handleSaveDetails = async (input: { name: string; description: string }) => {
    const res = await updateProjectDetails(project.id, input);
    if (res.ok) await refresh();
    return res;
  };

  const handleSaveAccess = async (next: Parameters<typeof updateProjectAccess>[1]) => {
    const res = await updateProjectAccess(project.id, next);
    if (res.ok) await refresh();
    return res;
  };

  return (
    <>
      <ProjectSectionHeader
        eyebrow="Project"
        title="Settings"
        description="Manage project details, configuration and project-level preferences."
        projectId={project.id}
        projectName={project.name}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={refresh}
            loading={refreshing}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="lg:flex lg:gap-6">
        {/* Desktop section nav */}
        <nav aria-label="Settings sections" className="hidden lg:block w-44 flex-shrink-0">
          <div className="space-y-0.5 sticky top-0">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-amber ${
                  activeSection === s.id
                    ? 'bg-forge-amber/10 text-forge-amber font-medium'
                    : 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-lg border border-forge-border-subtle bg-forge-panel">
            <p className="text-[11px] text-forge-text-muted leading-relaxed">
              Project settings apply only to this project. Account-level preferences live in Forge Settings.
            </p>
            <LinkButton to="/settings/profile" variant="ghost" size="sm" className="mt-2 !px-0 !h-6">
              Open Forge Settings
            </LinkButton>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 mt-6 lg:mt-0">
          {/* Mobile section selector */}
          <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-amber ${
                  activeSection === s.id
                    ? 'border-forge-amber bg-forge-amber/10 text-forge-amber font-medium'
                    : 'border-forge-border-subtle text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4 md:p-5">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 className="h-4 w-4 text-forge-text-muted" />
              <h2 className="text-sm font-semibold text-forge-text-primary">{SECTION_TITLES[activeSection]}</h2>
            </div>

            {activeSection === 'general' && (
              <GeneralSection project={project} canEdit={data.canEdit} onSave={handleSaveDetails} />
            )}
            {activeSection === 'details' && <DetailsSection project={project} />}
            {activeSection === 'ai' && <AiConfigSection />}
            {activeSection === 'access' && (
              <AccessSection
                projectId={project.id}
                settings={data.accessSettings}
                canEdit={data.canEdit}
                onSave={handleSaveAccess}
              />
            )}
          </div>

          {/* Global vs project note (mobile only, desktop note lives in the nav rail) */}
          <div className="lg:hidden mt-4 p-3 rounded-lg border border-forge-border-subtle bg-forge-panel">
            <p className="text-[11px] text-forge-text-muted leading-relaxed">
              Project settings apply only to this project. Account-level preferences live in Forge Settings.
            </p>
            <LinkButton to="/settings/profile" variant="ghost" size="sm" className="mt-2 !px-0 !h-6">
              Open Forge Settings
            </LinkButton>
          </div>
        </div>
      </div>
    </>
  );
}