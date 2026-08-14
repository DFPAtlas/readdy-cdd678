import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingPage() {
  const { setSetupComplete } = useAuthStore();

  const handleSkip = () => {
    setSetupComplete(true);
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-forge-text-primary mb-4">Welcome to Forge</h1>
        <p className="text-forge-text-secondary mb-8">
          Let's walk through setting up your local AI development workspace.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" onClick={handleSkip}>
            <span className="inline-flex items-center justify-center rounded-md bg-forge-amber text-forge-text-inverse hover:bg-forge-amber-dim px-4 py-2 text-sm font-medium transition-colors">
              Skip to workspace
            </span>
          </Link>
          <Link to="/setup">
            <span className="inline-flex items-center justify-center rounded-md bg-forge-border text-forge-text-primary hover:bg-forge-hover border border-forge-border-subtle px-4 py-2 text-sm font-medium transition-colors">
              Go to setup
            </span>
          </Link>
        </div>
      </div>
      <p className="mt-8 text-xs text-forge-text-muted">Demo module — Onboarding will be built in Phase 2</p>
    </div>
  );
}