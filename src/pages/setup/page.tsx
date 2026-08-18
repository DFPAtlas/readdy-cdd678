import { useNavigate } from 'react-router-dom';
import { useForgeAi } from '@/hooks/useForgeAi';
import { Button } from '@/components/ui/Button';
import { Zap, Cpu, Database, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SetupPage() {
  const navigate = useNavigate();
  const { data: forgeAi } = useForgeAi();

  const operational = forgeAi.activeProviders.length > 0;

  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="h-5 w-5 text-forge-amber" />
          <span className="text-base font-bold text-forge-text-primary">FORGE</span>
        </div>

        <p className="text-xs font-semibold tracking-widest text-forge-amber uppercase mb-2">Setup</p>
        <h1 className="text-2xl font-bold text-forge-text-primary">Set up Forge</h1>
        <p className="text-sm text-forge-text-muted mt-1 max-w-xl">
          Forge is ready to use. AI and your workspace data are provisioned automatically — nothing to
          configure here.
        </p>

        <div className="mt-8 space-y-4">
          <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-forge-amber" />
              <h2 className="text-sm font-semibold text-forge-text-primary">Forge AI</h2>
            </div>
            <p className="text-xs text-forge-text-muted mb-4">
              Forge securely manages the AI providers used by your projects. Access is included
              according to your subscription plan.
            </p>

            <div
              className={`rounded-md border px-3 py-2.5 flex items-start gap-2 ${
                operational ? 'bg-forge-success/10 border-forge-success/20' : 'bg-forge-bg border-forge-border-subtle'
              }`}
            >
              <Cpu className={`h-4 w-4 mt-0.5 shrink-0 ${operational ? 'text-forge-success' : 'text-forge-text-muted'}`} />
              <div>
                <p className="text-sm font-medium text-forge-text-primary">
                  {operational ? 'Forge AI is ready' : 'Forge AI is managed for you'}
                </p>
                <p className="text-xs text-forge-text-muted mt-0.5">
                  {forgeAi.planLabel} plan · {forgeAi.monthlyCreditLimit.toLocaleString('en-US')} monthly credits
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5 flex items-start gap-3">
            <Database className="h-4 w-4 text-forge-text-muted shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-forge-text-primary">Workspace &amp; data</h2>
              <p className="text-xs text-forge-text-muted mt-1 leading-relaxed">
                Your workspace, database and storage are provisioned automatically when you create your first
                project — nothing to configure here.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex items-center gap-3 justify-end">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Set up later
          </Button>
          <Button
            onClick={() => navigate('/onboarding')}
            icon={<CheckCircle2 className="h-4 w-4" />}
            iconPosition="right"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}