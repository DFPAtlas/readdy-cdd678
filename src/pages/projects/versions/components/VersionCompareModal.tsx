import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchVersionBlueprint } from '@/services/projectVersionsService';
import { computeVersionDiff, type VersionDiff } from '@/pages/projects/sandbox/sandboxVersions';
import type { SandboxDocument } from '@/pages/projects/sandbox/sandboxPersistence';
import type { ProjectVersionRecord } from '@/services/projectVersionsService';
import { ArrowLeftRight, Plus, Minus, Edit3 } from 'lucide-react';

interface VersionCompareModalProps {
  versions: ProjectVersionRecord[];
  projectId: string;
  open: boolean;
  onClose: () => void;
  initialFrom: ProjectVersionRecord | null;
  initialTo: ProjectVersionRecord | null;
}

function isSandboxDocument(value: unknown): value is SandboxDocument {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as { pages?: unknown }).pages)
  );
}

function optionLabel(version: ProjectVersionRecord): string {
  return `v${version.versionNumber}${version.label ? ` — ${version.label}` : ''}`;
}

export function VersionCompareModal({
  versions,
  projectId,
  open,
  onClose,
  initialFrom,
  initialTo,
}: VersionCompareModalProps) {
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [blueprintA, setBlueprintA] = useState<unknown | null>(null);
  const [blueprintB, setBlueprintB] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialise selections when the modal opens.
  useEffect(() => {
    if (!open) return;
    setFromId(initialFrom?.id ?? '');
    setToId(initialTo?.id ?? '');
  }, [open, initialFrom, initialTo]);

  useEffect(() => {
    if (!open || !fromId || !toId || fromId === toId) {
      setBlueprintA(null);
      setBlueprintB(null);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      fetchVersionBlueprint(projectId, fromId),
      fetchVersionBlueprint(projectId, toId),
    ])
      .then(([a, b]) => {
        if (!active) return;
        setBlueprintA(a);
        setBlueprintB(b);
      })
      .catch(() => {
        if (!active) return;
        setBlueprintA(null);
        setBlueprintB(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, projectId, fromId, toId]);

  const diff: VersionDiff | null = useMemo(() => {
    if (!isSandboxDocument(blueprintA) || !isSandboxDocument(blueprintB)) return null;
    return computeVersionDiff(blueprintA, blueprintB);
  }, [blueprintA, blueprintB]);

  const fromVersion = versions.find((v) => v.id === fromId) ?? null;
  const toVersion = versions.find((v) => v.id === toId) ?? null;

  return (
    <Modal open={open} onClose={onClose} title="Compare versions" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted">
              From version
            </span>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="mt-1 h-8 w-full px-2 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30"
            >
              <option value="">Select a version…</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {optionLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted">
              To version
            </span>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="mt-1 h-8 w-full px-2 rounded-md bg-forge-bg border border-forge-border text-forge-text-primary text-sm focus:outline-none focus:border-forge-amber focus:ring-1 focus:ring-forge-amber/30"
            >
              <option value="">Select a version…</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {optionLabel(v)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!fromId || !toId ? (
          <p className="text-sm text-forge-text-muted">
            Choose two versions to compare their snapshots.
          </p>
        ) : fromId === toId ? (
          <p className="text-sm text-forge-text-muted">
            Choose two different versions to compare.
          </p>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !diff ? (
          <p className="text-sm text-forge-text-muted">
            Comparison is not available for these versions.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-forge-text-secondary">
              <ArrowLeftRight className="h-4 w-4 text-forge-amber" />
              Comparing {fromVersion ? `v${fromVersion.versionNumber}` : 'from'} →{' '}
              {toVersion ? `v${toVersion.versionNumber}` : 'to'}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DiffStat value={diff.pageAdditions.length} label="Pages added" />
              <DiffStat value={diff.pageRemovals.length} label="Pages removed" />
              <DiffStat value={diff.elementAdditions} label="Elements added" />
              <DiffStat value={diff.elementRemovals} label="Elements removed" />
              <DiffStat value={diff.changedText} label="Text changed" />
              <DiffStat value={diff.changedAssets} label="Assets changed" />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-forge-border-subtle bg-forge-bg divide-y divide-forge-border-subtle">
              {diff.pageAdditions.map((name) => (
                <ChangeLine key={`a-${name}`} kind="add" text={`Added page “${name}”`} />
              ))}
              {diff.pageRemovals.map((name) => (
                <ChangeLine key={`r-${name}`} kind="remove" text={`Removed page “${name}”`} />
              ))}
              {diff.elementAdditions > 0 && (
                <ChangeLine kind="add" text={`Added ${diff.elementAdditions} element${diff.elementAdditions > 1 ? 's' : ''}`} />
              )}
              {diff.elementRemovals > 0 && (
                <ChangeLine kind="remove" text={`Removed ${diff.elementRemovals} element${diff.elementRemovals > 1 ? 's' : ''}`} />
              )}
              {diff.changedText > 0 && (
                <ChangeLine kind="edit" text={`Updated ${diff.changedText} text block${diff.changedText > 1 ? 's' : ''}`} />
              )}
              {diff.changedAssets > 0 && (
                <ChangeLine kind="edit" text={`Replaced ${diff.changedAssets} asset${diff.changedAssets > 1 ? 's' : ''}`} />
              )}
              {diff.layoutChanges > 0 && (
                <ChangeLine kind="edit" text={`Adjusted ${diff.layoutChanges} layout${diff.layoutChanges > 1 ? 's' : ''}`} />
              )}
              {diff.navigationChanges && <ChangeLine kind="edit" text="Updated navigation" />}
              {diff.seoChanges && <ChangeLine kind="edit" text="Changed SEO settings" />}
              {diff.componentDefinitionChanges > 0 && (
                <ChangeLine kind="edit" text={`Changed ${diff.componentDefinitionChanges} component definition${diff.componentDefinitionChanges > 1 ? 's' : ''}`} />
              )}
              {diff.globalSectionChanges && <ChangeLine kind="edit" text="Updated global sections" />}

              {diff.summary.length === 0 &&
                diff.pageAdditions.length === 0 &&
                diff.pageRemovals.length === 0 &&
                diff.elementAdditions === 0 &&
                diff.elementRemovals === 0 &&
                diff.changedText === 0 &&
                diff.changedAssets === 0 &&
                !diff.navigationChanges &&
                !diff.seoChanges &&
                !diff.globalSectionChanges && (
                  <p className="px-3 py-4 text-sm text-forge-text-muted">
                    No detectable changes between these two versions.
                  </p>
                )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function DiffStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-2.5 text-center">
      <p className="text-lg font-semibold text-forge-text-primary font-mono">{value}</p>
      <p className="text-[11px] text-forge-text-muted">{label}</p>
    </div>
  );
}

function ChangeLine({ kind, text }: { kind: 'add' | 'remove' | 'edit'; text: string }) {
  const icon =
    kind === 'add' ? (
      <Plus className="h-3.5 w-3.5 text-forge-success flex-shrink-0" />
    ) : kind === 'remove' ? (
      <Minus className="h-3.5 w-3.5 text-forge-error flex-shrink-0" />
    ) : (
      <Edit3 className="h-3.5 w-3.5 text-forge-accent flex-shrink-0" />
    );

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-forge-text-primary">
      {icon}
      <span>{text}</span>
    </div>
  );
}