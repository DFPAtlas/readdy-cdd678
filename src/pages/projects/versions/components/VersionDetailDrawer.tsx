import { useEffect, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import {
  fetchVersionBlueprint,
  formatVersionDate,
  sourceLabel,
  summarizeSnapshot,
  versionLabel,
  type ProjectVersionRecord,
  type VersionSnapshot,
} from '@/services/projectVersionsService';
import {
  Calendar,
  User,
  Hash,
  FileText,
  Layers,
  GitBranch,
  CheckCircle2,
  Flag,
  RotateCcw,
} from 'lucide-react';

interface VersionDetailDrawerProps {
  version: ProjectVersionRecord | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-forge-text-muted uppercase tracking-wider">{label}</p>
      <div className="mt-0.5 text-sm text-forge-text-primary">{children}</div>
    </div>
  );
}

export function VersionDetailDrawer({
  version,
  projectId,
  open,
  onClose,
}: VersionDetailDrawerProps) {
  const [snapshot, setSnapshot] = useState<VersionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open || !version) {
      setSnapshot(null);
      setUnavailable(false);
      return;
    }
    let active = true;
    setLoading(true);
    setSnapshot(null);
    setUnavailable(false);
    fetchVersionBlueprint(projectId, version.id)
      .then((blueprint) => {
        if (!active) return;
        const summary = summarizeSnapshot(blueprint);
        if (summary) setSnapshot(summary);
        else setUnavailable(true);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, version, projectId]);

  const buildRef =
    version?.buildNumber != null
      ? `#${version.buildNumber}`
      : version?.buildVersion
        ? version.buildVersion
        : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={version ? `Version ${versionLabel(version)}` : 'Version details'}
      position="right"
      width="w-full sm:w-[30rem]"
    >
      {version && (
        <div className="p-4 space-y-5">
          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {version.isCheckpoint && (
                <Badge variant="amber" size="sm">
                  <Flag className="h-3 w-3 mr-1" />
                  Checkpoint
                </Badge>
              )}
              {version.publishedAt && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Published
                </Badge>
              )}
              {version.restoredFromVersionId && (
                <Badge variant="accent" size="sm">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restored
                </Badge>
              )}
            </div>
            {version.label && (
              <p className="text-base font-semibold text-forge-text-primary">{version.label}</p>
            )}
            {version.description && (
              <p className="mt-1 text-sm text-forge-text-secondary">{version.description}</p>
            )}
            {version.changeSummary && (
              <p className="mt-1 text-sm text-forge-text-secondary">
                {version.changeSummary}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Created">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-forge-text-muted" />
                {formatVersionDate(version.createdAt)}
              </span>
            </Field>
            <Field label="Source">{sourceLabel(version.source)}</Field>
            <Field label="Created by">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-forge-text-muted" />
                {version.createdBy ?? '—'}
              </span>
            </Field>
            <Field label="Related build">
              {buildRef ? (
                <LinkButton
                  variant="ghost"
                  size="sm"
                  to={`/projects/${projectId}/builds`}
                  className="!h-auto !p-0 text-sm font-normal"
                >
                  <Hash className="h-3.5 w-3.5" />
                  {buildRef}
                </LinkButton>
              ) : (
                '—'
              )}
            </Field>
            {version.checksum && (
              <Field label="Checksum">
                <span className="font-mono text-xs text-forge-text-secondary">
                  {version.checksum}
                </span>
              </Field>
            )}
          </div>

          {/* Snapshot */}
          <div className="rounded-lg border border-forge-border-subtle bg-forge-bg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-forge-text-muted" />
              <p className="text-sm font-semibold text-forge-text-primary">Snapshot</p>
            </div>

            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}

            {!loading && unavailable && (
              <p className="text-sm text-forge-text-muted">
                Snapshot details are not available for this version.
              </p>
            )}

            {!loading && snapshot && (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <span className="flex items-center gap-1.5 text-sm text-forge-text-primary">
                    <Layers className="h-3.5 w-3.5 text-forge-text-muted" />
                    {snapshot.pageCount} page{snapshot.pageCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-sm text-forge-text-secondary">
                    {snapshot.elementCount} element{snapshot.elementCount === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="space-y-1">
                  {snapshot.pages.map((page) => (
                    <li
                      key={page.id}
                      className="flex items-center justify-between text-sm py-1 border-b border-forge-border-subtle last:border-0"
                    >
                      <span className="text-forge-text-primary truncate">
                        {page.name}
                        <span className="ml-2 text-forge-text-muted font-mono text-xs">
                          {page.slug}
                        </span>
                      </span>
                      <span className="text-forge-text-muted text-xs flex-shrink-0">
                        {page.elementCount} element{page.elementCount === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <LinkButton variant="primary" size="sm" to={`/projects/${projectId}/sandbox`}>
              <GitBranch className="h-3.5 w-3.5" />
              Open in Sandbox
            </LinkButton>
          </div>
        </div>
      )}
    </Drawer>
  );
}