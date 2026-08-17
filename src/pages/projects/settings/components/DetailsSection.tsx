import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ProjectSettingsProject } from '@/services/projectSettingsService';

interface DetailsSectionProps {
  project: ProjectSettingsProject;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string | null): string {
  if (!status) return '—';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-forge-border-subtle last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-forge-text-muted">{label}</span>
      <div className="text-sm text-forge-text-primary">{children}</div>
    </div>
  );
}

export function DetailsSection({ project }: DetailsSectionProps) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(project.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  };

  return (
    <div>
      <div className="mb-2">
        <span className="text-[11px] uppercase tracking-wider text-forge-text-muted">Project ID</span>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="text-sm text-forge-text-secondary font-mono break-all">{project.id}</code>
          <button
            type="button"
            onClick={copyId}
            aria-label="Copy project ID"
            className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-amber"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-forge-amber" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <Row label="Created">{formatDate(project.createdAt)}</Row>
        <Row label="Last updated">{formatDate(project.updatedAt)}</Row>
        <Row label="Status">{statusLabel(project.status)}</Row>
        <Row label="Slug">
          <code className="font-mono text-forge-text-secondary">{project.slug}</code>
        </Row>
      </div>
    </div>
  );
}