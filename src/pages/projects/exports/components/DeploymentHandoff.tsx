import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { Rocket, Info } from 'lucide-react';

interface DeploymentHandoffProps {
  projectId: string;
}

const CHECKLIST = [
  'Download the project package',
  'Review the README and configuration',
  'Add environment variables',
  'Install dependencies',
  'Build and test',
  'Deploy to your chosen host',
];

export function DeploymentHandoff({ projectId }: DeploymentHandoffProps) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-center gap-2 mb-1">
        <Rocket className="h-4 w-4 text-forge-amber" />
        <h2 className="text-sm font-semibold text-forge-text-primary">Take it from here</h2>
      </div>
      <p className="text-xs text-forge-text-muted mb-4">
        Your export is ready to deploy with the hosting provider or infrastructure you choose.
      </p>

      <ol className="space-y-1.5 mb-4">
        {CHECKLIST.map((step, index) => (
          <li key={step} className="flex items-start gap-2 text-sm text-forge-text-secondary">
            <span className="font-mono text-xs text-forge-text-muted mt-0.5 flex-shrink-0">
              {index + 1}.
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-2 rounded-md border border-forge-border-subtle bg-forge-bg p-3 mb-4">
        <Info className="h-3.5 w-3.5 text-forge-text-muted mt-0.5 flex-shrink-0" />
        <p className="text-xs text-forge-text-secondary">
          Environment secrets are not included in source exports. Configure them separately with
          your deployment provider.
        </p>
      </div>

      <LinkButton variant="secondary" size="sm" to={`/projects/${projectId}/sandbox`}>
        <Rocket className="h-3.5 w-3.5" />
        Publish from Sandbox
      </LinkButton>
    </div>
  );
}