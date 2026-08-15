import { useMemo, useState } from 'react';
import { Plus, Pencil, Copy, Trash2, LayoutGrid, List, EyeOff, CheckCircle2, Archive, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CmsCollection, CmsItem, CmsItemStatus } from '../cmsTypes';
import { updateItem, createItem, duplicateItem, setItemStatus, deleteItem } from '../cmsData';
import { ItemEditorModal } from './ItemEditorModal';

type Props = {
  collection: CmsCollection;
  items: CmsItem[];
  role: string | null;
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
};

const STATUS_META: Record<CmsItemStatus, { label: string; variant: 'default' | 'amber' | 'accent' | 'success' | 'warning' | 'error' | 'agent' }> = {
  draft: { label: 'Draft', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  archived: { label: 'Archived', variant: 'error' },
};

function displayValue(item: CmsItem, collection: CmsCollection): string {
  const key = collection.displayFieldKey;
  if (key && item.fieldValues[key] != null && String(item.fieldValues[key]).trim() !== '') {
    return String(item.fieldValues[key]);
  }
  return item.slug;
}

export function ContentSection({ collection, items, role, loading, error, onRefresh }: Props) {
  const [view, setView] = useState<'table' | 'card'>('table');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<CmsItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CmsItem | null>(null);
  const [busy, setBusy] = useState(false);

  const canPublish = role === 'owner' || role === 'admin';
  const canEdit = role === 'owner' || role === 'admin' || role === 'copywriter' || role === 'designer';

  const filtered = useMemo(() => {
    let list = items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false;
      if (query.trim()) {
        const hay = `${displayValue(it, collection)} ${it.slug}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'oldest') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      if (sortBy === 'title') return displayValue(a, collection).localeCompare(displayValue(b, collection));
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
    return list;
  }, [items, query, statusFilter, sortBy, collection]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id));

  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((it) => it.id)));
  };

  const runBulk = async (status: CmsItemStatus) => {
    setBusy(true);
    for (const id of Array.from(selected)) {
      await setItemStatus(id, status);
    }
    setSelected(new Set());
    setBusy(false);
    await onRefresh();
  };

  const doSave = async (slug: string, values: Record<string, unknown>): Promise<{ ok: boolean; message: string }> => {
    if (editingItem) {
      return updateItem(editingItem.id, values, { newSlug: slug });
    }
    return createItem(collection.projectId, collection.id, slug, values);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner /></div>;
  if (error) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState title="Couldn't load content" description={error} action={<Button size="sm" onClick={onRefresh}>Retry</Button>} />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search items…" className="w-56" />
        <Select
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'title', label: 'Title A–Z' },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        />
        <div className="flex-1" />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-forge-text-muted">{selected.size} selected</span>
            {canPublish && <Button size="sm" variant="ghost" loading={busy} onClick={() => runBulk('published')}>Publish</Button>}
            {canPublish && <Button size="sm" variant="ghost" loading={busy} onClick={() => runBulk('archived')}>Archive</Button>}
          </div>
        )}
        <div className="flex items-center gap-1 rounded-md border border-forge-border-subtle p-0.5">
          <button onClick={() => setView('table')} className={`h-6 w-6 flex items-center justify-center rounded ${view === 'table' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-primary'}`} aria-label="Table view">
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView('card')} className={`h-6 w-6 flex items-center justify-center rounded ${view === 'card' ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-muted hover:text-forge-text-primary'}`} aria-label="Card view">
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
        {canEdit && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditingItem(null); setShowCreate(true); }}>Add item</Button>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            title={items.length === 0 ? 'No items yet' : 'No items match'}
            description={items.length === 0 ? `Add your first ${collection.singularName.toLowerCase()} to this collection.` : 'Try adjusting your search or filters.'}
            action={items.length === 0 && canEdit ? <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditingItem(null); setShowCreate(true); }}>Add item</Button> : undefined}
          />
        </div>
      ) : view === 'table' ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-forge-border-subtle bg-forge-bg/40">
                <th className="w-8 px-3 py-2">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="accent-[hsl(var(--brand-amber))] cursor-pointer" />
                </th>
                <th className="text-left px-3 py-2 font-medium text-forge-text-muted">Title</th>
                <th className="text-left px-3 py-2 font-medium text-forge-text-muted">Slug</th>
                <th className="text-left px-3 py-2 font-medium text-forge-text-muted">Status</th>
                <th className="text-left px-3 py-2 font-medium text-forge-text-muted">Updated</th>
                <th className="text-right px-3 py-2 font-medium text-forge-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-border-subtle">
              {filtered.map((it) => (
                <tr key={it.id} className={`hover:bg-forge-hover/40 transition-colors ${selected.has(it.id) ? 'bg-forge-amber/5' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} className="accent-[hsl(var(--brand-amber))] cursor-pointer" />
                  </td>
                  <td className="px-3 py-2 font-medium text-forge-text-primary max-w-[240px] truncate">{displayValue(it, collection)}</td>
                  <td className="px-3 py-2 font-mono text-forge-text-muted">{it.slug}</td>
                  <td className="px-3 py-2"><StatusBadge status={it.status} /></td>
                  <td className="px-3 py-2 text-forge-text-muted">{new Date(it.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-3 py-2">
                    <ItemActions
                      item={it}
                      canEdit={canEdit}
                      canPublish={canPublish}
                      onEdit={() => { setEditingItem(it); setShowCreate(true); }}
                      onDuplicate={async () => { await duplicateItem(it); await onRefresh(); }}
                      onDelete={() => setConfirmDelete(it)}
                      onStatus={async (s) => { await setItemStatus(it.id, s); await onRefresh(); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((it) => (
            <div key={it.id} className={`rounded-lg border border-forge-border-subtle bg-forge-panel p-4 transition-colors hover:border-forge-border ${selected.has(it.id) ? 'ring-1 ring-forge-amber' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} className="accent-[hsl(var(--brand-amber))] cursor-pointer" />
                  <h3 className="text-sm font-medium text-forge-text-primary truncate">{displayValue(it, collection)}</h3>
                </div>
                <StatusBadge status={it.status} />
              </div>
              <p className="mt-1 font-mono text-[10px] text-forge-text-muted">{it.slug}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-forge-text-muted">{new Date(it.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <ItemActions
                  item={it}
                  canEdit={canEdit}
                  canPublish={canPublish}
                  onEdit={() => { setEditingItem(it); setShowCreate(true); }}
                  onDuplicate={async () => { await duplicateItem(it); await onRefresh(); }}
                  onDelete={() => setConfirmDelete(it)}
                  onStatus={async (s) => { await setItemStatus(it.id, s); await onRefresh(); }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate) && (
        <ItemEditorModal
          collection={collection}
          item={editingItem}
          onClose={() => { setShowCreate(false); setEditingItem(null); }}
          onSaved={async () => { setShowCreate(false); setEditingItem(null); await onRefresh(); }}
          onSave={doSave}
        />
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Delete item" size="sm">
          <p className="text-sm text-forge-text-secondary">Permanently delete this item? This cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await deleteItem(confirmDelete.id);
              setConfirmDelete(null);
              await onRefresh();
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CmsItemStatus }) {
  const meta = STATUS_META[status];
  return <Badge size="sm" variant={meta.variant}>{meta.label}</Badge>;
}

function ItemActions({ item, canEdit, canPublish, onEdit, onDuplicate, onDelete, onStatus }: {
  item: CmsItem;
  canEdit: boolean;
  canPublish: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStatus: (s: CmsItemStatus) => void;
}) {
  const iconBtn = 'h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors';
  return (
    <div className="flex items-center justify-end gap-0.5">
      {canEdit && (
        <button className={iconBtn} onClick={onEdit} aria-label="Edit"><Pencil className="h-3 w-3" /></button>
      )}
      {canEdit && (
        <button className={iconBtn} onClick={onDuplicate} aria-label="Duplicate"><Copy className="h-3 w-3" /></button>
      )}
      {canPublish && item.status !== 'published' && item.status !== 'archived' && (
        <button className={`${iconBtn} hover:text-forge-success`} onClick={() => onStatus('published')} aria-label="Publish"><Send className="h-3 w-3" /></button>
      )}
      {canPublish && item.status === 'published' && (
        <button className={`${iconBtn} hover:text-forge-warning`} onClick={() => onStatus('draft')} aria-label="Unpublish"><EyeOff className="h-3 w-3" /></button>
      )}
      {canPublish && item.status === 'archived' && (
        <button className={`${iconBtn} hover:text-forge-success`} onClick={() => onStatus('draft')} aria-label="Restore"><RotateCcw className="h-3 w-3" /></button>
      )}
      {canPublish && item.status !== 'archived' && (
        <button className={`${iconBtn} hover:text-forge-warning`} onClick={() => onStatus('archived')} aria-label="Archive"><Archive className="h-3 w-3" /></button>
      )}
      {canPublish && (
        <button className={`${iconBtn} hover:text-forge-error`} onClick={onDelete} aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
      )}
      {!canEdit && <span className="text-forge-text-muted px-1"><CheckCircle2 className="h-3 w-3" /></span>}
    </div>
  );
}