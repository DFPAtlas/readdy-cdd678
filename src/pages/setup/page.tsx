import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Zap, Wrench } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setSetupComplete } = useAuthStore();

  const handleContinue = () => {
    setSetupComplete(true);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <Zap className="h-6 w-6 text-forge-amber" />
        <h1 className="text-xl font-bold text-forge-text-primary">FORGE</h1>
      </div>
      <Card className="max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="h-8 w-8 text-forge-amber" />
          <h2 className="text-lg font-semibold text-forge-text-primary">First Run Setup</h2>
        </div>
        <p className="text-sm text-forge-text-secondary mb-6">
          Let's configure your Forge workspace to get started with local AI development.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-forge-bg border border-forge-border-subtle">
            <div className="h-2 w-2 rounded-full bg-forge-success" />
            <span className="text-sm text-forge-text-primary">Forge API — detected on localhost:3000</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-forge-bg border border-forge-border-subtle">
            <div className="h-2 w-2 rounded-full bg-forge-warning" />
            <span className="text-sm text-forge-text-primary">n8n — needs configuration</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-forge-bg border border-forge-border-subtle">
            <div className="h-2 w-2 rounded-full bg-forge-text-muted" />
            <span className="text-sm text-forge-text-primary">Ollama — not detected</span>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={handleContinue}>Continue in mock mode</Button>
          <Button variant="secondary" onClick={() => navigate('/onboarding')}>Run setup wizard</Button>
        </div>
      </Card>
      <p className="mt-8 text-xs text-forge-text-muted">Demo module — Setup wizard will be built in Phase 2</p>
    </div>
  );
}