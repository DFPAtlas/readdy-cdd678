import {
  isCompletedBuildStatus,
  type ExportBuildRef,
  type ExportVersionRef,
} from '@/services/projectExportsService';
import { Check, Circle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ExportReadinessProps {
  currentVersion: ExportVersionRef | null;
  latestBuild: ExportBuildRef | null;
}

interface ReadinessItem {
  label: string;
  ok: boolean;
  note: string;
}

export function ExportReadiness({ currentVersion, latestBuild }: ExportReadinessProps) {
  const hasVersion = currentVersion !== null;
  const latestBuildCompleted = latestBuild !== null && isCompletedBuildStatus(latestBuild.status);
  const latestBuildFailed =
    latestBuild !== null &&
    latestBuild.status !== null &&
    latestBuild.status !== 'completed' &&
    latestBuild.status !== 'success';

  const items: ReadinessItem[] = [
    {
      label: 'Current version available',
      ok: hasVersion,
      note: hasVersion
        ? `v${currentVersion.versionNumber}`
        : 'Save your project in the Sandbox to create a version.',
    },
    {
      label: 'Latest build completed',
      ok: latestBuildCompleted,
      note: latestBuild
        ? latestBuildFailed
          ? 'The latest build did not complete successfully.'
          : 'Latest build finished cleanly.'
        : 'No build has run for this project yet.',
    },
  ];

  const readyCount = items.filter((item) => item.ok).length;

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-forge-text-muted" />
        <h2 className="text-sm font-semibold text-forge-text-primary">Export readiness</h2>
      </div>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex-shrink-0">
              {item.ok ? (
                <Check className="h-4 w-4 text-forge-success" />
              ) : item.label === 'Latest build completed' && latestBuildFailed ? (
                <AlertTriangle className="h-4 w-4 text-forge-warning" />
              ) : (
                <Circle className="h-4 w-4 text-forge-text-muted" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm ${
                  item.ok
                    ? 'text-forge-text-primary'
                    : latestBuildFailed && item.label === 'Latest build completed'
                      ? 'text-forge-warning'
                      : 'text-forge-text-secondary'
                }`}
              >
                {item.label}
              </p>
              <p className="text-xs text-forge-text-muted">{item.note}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 pt-3 border-t border-forge-border-subtle flex items-center justify-between">
        <span className="text-xs text-forge-text-muted">Ready checks</span>
        <span className="font-mono text-xs text-forge-text-primary">
          {readyCount}/{items.length}
        </span>
      </div>
    </div>
  );
}