import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/pages/dashboard/components/LinkButton';
import { MiniPreview } from './MiniPreview';
import { X, Layers, FilePlus2 } from 'lucide-react';
import type { StarterDisplay } from '../templatesData';

interface StarterPreviewModalProps {
  starter: StarterDisplay | null;
  onClose: () => void;
}

export function StarterPreviewModal({ starter, onClose }: StarterPreviewModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!starter) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [starter]);

  if (!starter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${starter.name} starter preview`}
        className="relative w-full max-w-md bg-forge-panel-elevated border border-forge-border rounded-xl shadow-lg max-h-[90vh] overflow-y-auto"
      >
        <MiniPreview manifest={starter.manifest} />

        <div className="absolute top-1.5 right-1.5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded bg-black/40 text-forge-text-primary hover:bg-black/60 transition-colors"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-forge-text-primary">{starter.name}</h2>
            <Badge variant="amber" size="sm" className="shrink-0">
              {starter.typeLabel}
            </Badge>
          </div>
          <p className="text-sm text-forge-text-secondary mt-1.5">{starter.description}</p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {starter.tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
          </div>

          {starter.pages.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-forge-text-primary flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-forge-amber" />
                Included pages
              </p>
              <ul className="mt-1.5 space-y-1">
                {starter.pages.map((page) => (
                  <li
                    key={page.slug}
                    className="text-xs text-forge-text-muted flex items-center gap-1.5"
                  >
                    <span className="h-1 w-1 rounded-full bg-forge-amber/60 shrink-0" />
                    {page.name}
                    <span className="text-forge-text-muted/60">{page.slug}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-md border border-forge-border-subtle bg-forge-bg/60 px-3 py-2.5">
            <p className="text-xs text-forge-text-muted">
              Install this starter from the Templates panel inside any Forge project. One-click
              project creation from a starter is being prepared.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <LinkButton to="/projects/new" variant="primary" size="md" className="w-full">
              <FilePlus2 className="h-4 w-4" />
              Create Blank Project
            </LinkButton>
            <Button variant="ghost" size="md" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}