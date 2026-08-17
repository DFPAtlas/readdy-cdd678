import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { GitBranch, ShieldCheck } from 'lucide-react';

interface VersionSafetyProps {
  projectId: string;
}

export function VersionSafety({ projectId }: VersionSafetyProps) {
  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-5">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-4 w-4 text-forge-accent" />
        <h3 className="text-sm font-semibold text-forge-text-primary">
          History without guesswork
        </h3>
      </div>
      <p className="text-sm text-forge-text-secondary leading-relaxed">
        Forge keeps project versions visible so previous states can be reviewed before making
        significant changes. Each version is a full snapshot of your project&apos;s pages,
        components and theme at the moment it was saved.
      </p>
      <p className="mt-2 text-sm text-forge-text-secondary leading-relaxed">
        Restoring an older version happens in the Sandbox, where you can review the change before
        it is applied. Restoring never overwrites history — it always creates a new version.
      </p>
      <div className="mt-4">
        <LinkButton variant="secondary" size="sm" to={`/projects/${projectId}/sandbox`}>
          <GitBranch className="h-3.5 w-3.5" />
          Open Sandbox to restore
        </LinkButton>
      </div>
    </div>
  );
}