import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useForgeAi } from '@/hooks/useForgeAi';
import { createProject, fetchProjects, type ProjectsProject } from '@/services/projectsService';
import { updateDisplayName } from '@/services/profileService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Spinner } from '@/components/ui/Spinner';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { StepIndicator } from './components/StepIndicator';
import { AiStatusStep } from './components/AiStatusStep';
import { Zap, ArrowLeft, ArrowRight, FilePlus2, CheckCircle2 } from 'lucide-react';

const STEPS = ['Workspace', 'AI status', 'Starting point', 'Project'];
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 200;

function AllSetScreen() {
  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-forge-success/10 text-forge-success flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-forge-text-primary">You&apos;re all set</h1>
        <p className="text-sm text-forge-text-muted mt-2">
          Your Forge workspace is ready. Head to your dashboard to keep building.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <LinkButton to="/dashboard" variant="primary" size="md">
            Go to dashboard
          </LinkButton>
          <LinkButton to="/projects/new" variant="secondary" size="md">
            Create another project
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function CompletionScreen({
  project,
  aiIncluded,
}: {
  project: ProjectsProject;
  aiIncluded: boolean;
}) {
  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-forge-success/10 text-forge-success flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-forge-text-primary">Your Forge workspace is ready</h1>

        <div className="mt-6 rounded-lg border border-forge-border-subtle bg-forge-panel p-4 text-left">
          <div className="flex items-center justify-between gap-3 py-2 border-b border-forge-border-subtle">
            <span className="text-xs text-forge-text-muted">Project</span>
            <span className="text-sm text-forge-text-primary font-medium text-right truncate">
              {project.name}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-forge-text-muted">AI</span>
            <span className="text-sm text-forge-text-primary text-right">
              {aiIncluded ? 'Included with your plan' : 'Not available'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-center">
          <LinkButton to={`/projects/${project.id}/overview`} variant="primary" size="md">
            Open project
          </LinkButton>
          <LinkButton to="/dashboard" variant="secondary" size="md">
            Go to dashboard
          </LinkButton>
        </div>

        {!aiIncluded && (
          <p className="mt-4 text-xs text-forge-text-muted">
            Upgrade your plan to include AI-assisted development.
          </p>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const hasCompletedSetup = useAuthStore((s) => s.hasCompletedSetup);
  const setSetupComplete = useAuthStore((s) => s.setSetupComplete);
  const forgeAi = useForgeAi();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');

  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createdProject, setCreatedProject] = useState<ProjectsProject | null>(null);
  const [existingProjects, setExistingProjects] = useState<ProjectsProject[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((p) => {
        if (active) setExistingProjects(p);
      })
      .catch(() => {
        if (active) setExistingProjects([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const aiOperational = forgeAi.data.activeProviders.length > 0;
  const alreadySetUp = hasCompletedSetup || (existingProjects !== null && existingProjects.length > 0);

  const goNextFromWorkspace = async () => {
    const trimmed = displayName.trim();
    if (trimmed) {
      try {
        await updateDisplayName(trimmed);
      } catch {
        // Best-effort: don't block onboarding if the profile update fails.
      }
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (creating || !projectName.trim()) return;
    setCreating(true);
    setCreateError(false);
    try {
      const project = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim(),
      });
      setCreatedProject(project);
      setSetupComplete(true);
      setStep(5);
    } catch {
      setCreateError(true);
    } finally {
      setCreating(false);
    }
  };

  if (alreadySetUp) {
    return <AllSetScreen />;
  }

  if (existingProjects === null) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (step === 5 && createdProject) {
    return (
      <CompletionScreen
        project={createdProject}
        aiIncluded={aiOperational}
      />
    );
  }

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-forge-amber" />
            <span className="text-base font-bold text-forge-text-primary">FORGE</span>
          </div>
          <Link
            to="/dashboard"
            className="text-xs text-forge-text-muted hover:text-forge-text-primary transition-colors"
          >
            Skip to dashboard
          </Link>
        </div>

        <StepIndicator current={step} labels={STEPS} />

        <div className="mt-8 rounded-lg border border-forge-border-subtle bg-forge-panel p-6">
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-forge-text-primary">Welcome to Forge</h1>
              <p className="text-sm text-forge-text-muted mt-1">
                Let&apos;s get your workspace ready and create your first project.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="onboarding-display-name"
                  className="block text-sm font-medium text-forge-text-primary mb-1.5"
                >
                  Display name <span className="text-forge-text-muted">(optional)</span>
                </label>
                <Input
                  id="onboarding-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ada Lovelace"
                  className="w-full"
                  autoFocus
                />
                <p className="mt-1 text-xs text-forge-text-muted">
                  This is how your name appears across Forge. You can change it later in Settings.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-base font-semibold text-forge-text-primary">AI status</h2>
              <p className="text-sm text-forge-text-muted mt-1 mb-5">
                Connect an AI provider now, or continue without AI.
              </p>
              <AiStatusStep
                data={forgeAi.data}
                loading={forgeAi.loading}
                error={forgeAi.error}
                onRetry={forgeAi.retry}
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold text-forge-text-primary">Starting point</h2>
              <p className="text-sm text-forge-text-muted mt-1 mb-5">Choose how you want to begin.</p>

              <div className="rounded-lg border border-forge-amber/40 bg-forge-bg p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center shrink-0">
                  <FilePlus2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-forge-text-primary">Blank project</p>
                  <p className="text-xs text-forge-text-muted mt-0.5">
                    Start empty and build your pages from scratch — the most flexible option.
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-forge-amber shrink-0" />
              </div>

              <p className="text-xs text-forge-text-muted mt-3 leading-relaxed">
                Prefer a head start? Starter templates install from inside any project&apos;s Templates panel
                after it&apos;s created.
              </p>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-base font-semibold text-forge-text-primary">Your first project</h2>
              <p className="text-sm text-forge-text-muted mt-1 mb-5">
                Give your project a name to get started.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreate();
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="onboarding-project-name"
                    className="block text-sm font-medium text-forge-text-primary mb-1.5"
                  >
                    Project name <span className="text-forge-error">*</span>
                  </label>
                  <Input
                    id="onboarding-project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My first project"
                    maxLength={MAX_NAME_LENGTH}
                    className="w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboarding-project-description"
                    className="block text-sm font-medium text-forge-text-primary mb-1.5"
                  >
                    Short description <span className="text-forge-text-muted">(optional)</span>
                  </label>
                  <TextArea
                    id="onboarding-project-description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="What will this project be about?"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    showCount
                  />
                </div>

                {createError && (
                  <div
                    role="alert"
                    className="rounded-md bg-forge-error/10 border border-forge-error/20 px-3 py-2.5 text-sm text-forge-error"
                  >
                    Unable to create project. Please try again.
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(3)}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                  <Button type="submit" loading={creating} disabled={!projectName.trim() || creating}>
                    {creating ? 'Creating project...' : 'Create project'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {step <= 3 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              onClick={() => {
                if (step === 1) void goNextFromWorkspace();
                else setStep((s) => s + 1);
              }}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              iconPosition="right"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}