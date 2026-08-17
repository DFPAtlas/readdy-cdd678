import { Badge } from '@/components/ui/Badge';
import {
  exportBadgeVariant,
  exportStatusKind,
  exportStatusLabel,
  formatExportBytes,
  formatExportDate,
  type ProjectExportRecord,
} from '@/services/projectExportsService';
import { FileArchive, ChevronRight } from 'lucide-react';

interface ExportHistoryProps {
  exports: ProjectExportRecord[];
  onSelect: (record: ProjectExportRecord) => void;
}

export function ExportHistory({ exports, onSelect }: ExportHistoryProps) {
  if (exports.length === 0) return null;

  return (
    <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border-subtle">
        <h2 className="text-sm font-semibold text-forge-text-primary">Export history</h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-forge-border-subtle bg-forge-bg">
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Export</th>
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Version</th>
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Format</th>
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Size</th>
              <th className="text-left px-4 py-2.5 font-medium text-forge-text-muted">Created</th>
              <th className="text-right px-4 py-2.5 font-medium text-forge-text-muted">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forge-border-subtle">
            {exports.map((record) => {
              const kind = exportStatusKind(record.status);
              return (
                <tr
                  key={record.id}
                  className="hover:bg-forge-hover transition-colors cursor-pointer"
                  onClick={() => onSelect(record)}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-forge-text-primary">
                      {record.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-forge-text-secondary">
                    {record.versionLabel ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-forge-text-primary uppercase text-[10px] font-medium">
                      <FileArchive className="h-3.5 w-3.5 text-forge-text-muted" />
                      {record.format ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={exportBadgeVariant(kind)} size="sm">
                      {exportStatusLabel(record.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-forge-text-secondary">
                    {formatExportBytes(record.fileSize)}
                  </td>
                  <td className="px-4 py-2.5 text-forge-text-secondary whitespace-nowrap">
                    {formatExportDate(record.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ChevronRight className="h-3.5 w-3.5 text-forge-text-muted ml-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-forge-border-subtle">
        {exports.map((record) => {
          const kind = exportStatusKind(record.status);
          return (
            <button
              key={record.id}
              onClick={() => onSelect(record)}
              className="w-full text-left px-4 py-3 hover:bg-forge-hover transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-forge-text-primary text-xs">
                  {record.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant={exportBadgeVariant(kind)} size="sm">
                  {exportStatusLabel(record.status)}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-forge-text-secondary">
                <span className="uppercase font-medium">{record.format ?? '—'}</span>
                {record.versionLabel && <span>· {record.versionLabel}</span>}
                <span>· {formatExportBytes(record.fileSize)}</span>
              </div>
              <div className="mt-1 text-[11px] text-forge-text-muted">
                {formatExportDate(record.createdAt)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}