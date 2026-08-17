import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CmsCollection } from '../cmsTypes';
import { CmsIcon } from './CmsIcon';

type Props = {
  collections: CmsCollection[];
  selectedId: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onNewCollection: () => void;
  onDelete: (id: string) => Promise<{ ok: boolean; message: string }>;
};

export function CmsNavRail({ collections, selectedId, canManage, onSelect, onNewCollection, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<CmsCollection | null>(null);

  return (
    <aside className="rounded-lg border border-forge-border-subtle bg-forge-panel self-start">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-forge-border-subtle">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-forge-text-muted">Content types</span>
        <span className="text-[11px] text-forge-text-muted">{collections.length}</span>
      </div>

      <nav className="p-1.5" aria-label="Content types">
        {collections.length === 0 ? (
          <div className="py-6">
            <EmptyState title="No collections" description="Create a content type to get started." />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {collections.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <div
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      active ? 'bg-forge-amber/10 text-forge-amber' : 'text-forge-text-primary hover:bg-forge-hover'
                    }`}
                    onClick={() => onSelect(c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelect(c.id); }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <CmsIcon name={c.icon} className={`h-4 w-4 shrink-0 ${active ? 'text-forge-amber' : 'text-forge-text-muted'}`} />
                    <span className="flex-1 text-sm truncate">{c.name}</span>
                    <span className={`text-[10px] ${active ? 'text-forge-amber' : 'text-forge-text-muted'}`}>{c.itemCount ?? 0}</span>
                    {canManage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                        className="h-5 w-5 hidden group-hover:flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error transition-colors"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {canManage && (
        <div className="p-2 border-t border-forge-border-subtle">
          <Button size="sm" variant="secondary" className="w-full" icon={<Plus className="h-3.5 w-3.5" />} onClick={onNewCollection}>
            New collection
          </Button>
        </div>
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Delete collection" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete <strong className="text-forge-text-primary">{confirmDelete.name}</strong> and all {confirmDelete.itemCount ?? 0} item(s)? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await onDelete(confirmDelete.id);
              setConfirmDelete(null);
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </aside>
  );
}