import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import {
  exportStatusKind,
  exportStatusLabel,
  exportBadgeVariant,
  formatExportBytes,
  formatExportDate,
  manifestEntryCount,
  type ProjectExportRecord,
} from '@/services/projectExportsService';
import { FileArchive, Hash, Link2, CheckCircle2 } from 'lucide-react';

interface ExportDetailDrawerProps {
  record: ProjectExportRecord | null;
  onClose: () => void;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-forge-text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-forge-text-primary break-all">{value}</p>
    </div>
  );
}

export function ExportDetailDrawer({ record, onClose }: ExportDetailDrawerProps) {
  const kind = record ? exportStatusKind(record.status) : 'default';
  const entryCount = record ? manifestEntryCount(record.manifest) : null;

  return (
    <Drawer open={record !== null} onClose={onClose} title="Export details" width="w-96">
      {record && (
        <div className="p-4 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-forge-border flex items-center justify-center flex-shrink-0">
              <FileArchive className="h-5 w-5 text-forge-text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm text-forge-text-primary">
                {record.id.slice(0, 8).toUpperCase()}
              </p>
              <div className="mt-1">
                <Badge variant={exportBadgeVariant(kind)} size="sm">
                  {exportStatusLabel(record.status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetaRow label="Format" value={record.format ?? '—'} />
            <MetaRow label="Version" value={record.versionLabel ?? '—'} />
            <MetaRow label="Created" value={formatExportDate(record.createdAt)} />
            <MetaRow label="Completed" value={formatExportDate(record.completedAt)} />
            <MetaRow label="Size" value={formatExportBytes(record.fileSize)} />
            <MetaRow label="Files" value={entryCount != null ? String(entryCount) : '—'} />
          </div>

          {record.buildRef && (
            <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3">
              <div className="flex items-center gap-2 text-forge-text-muted">
                <Hash className="h-3.5 w-3.5" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">Related build</p>
              </div>
              <p className="mt-1 font-mono text-sm text-forge-text-primary">{record.buildRef}</p>
            </div>
          )}

          {record.checksum && (
            <div>
              <p className="text-[11px] text-forge-text-muted">Checksum</p>
              <p className="mt-0.5 font-mono text-xs text-forge-text-secondary break-all">
                {record.checksum}
              </p>
            </div>
          )}

          {record.expiresAt && (
            <div>
              <p className="text-[11px] text-forge-text-muted">Download expires</p>
              <p className="mt-0.5 text-sm text-forge-text-primary">
                {formatExportDate(record.expiresAt)}
              </p>
            </div>
          )}

          {record.downloadUrl && (
            <div className="rounded-md border border-forge-border-subtle bg-forge-bg p-3">
              <div className="flex items-center gap-2 text-forge-text-muted">
                <Link2 className="h-3.5 w-3.5" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">Artifact</p>
              </div>
              <p className="mt-1 text-xs text-forge-text-secondary break-all">
                {record.artifactPath ?? 'Stored in Forge storage'}
              </p>
            </div>
          )}

          {record.failureMessage && (
            <div className="rounded-md border border-forge-error/20 bg-forge-error/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-forge-error">
                Failure
              </p>
              <p className="mt-1 text-sm text-forge-text-secondary break-words">
                {record.failureMessage}
              </p>
            </div>
          )}

          {record.completedAt && kind === 'success' && (
            <div className="flex items-center gap-2 text-forge-success text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Export completed successfully
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}