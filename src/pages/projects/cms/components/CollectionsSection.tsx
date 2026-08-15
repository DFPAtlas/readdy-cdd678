import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CmsCollection, CollectionPreset, CmsFieldType } from '../cmsTypes';
import { COLLECTION_PRESETS, COLLECTION_ICONS, fieldTypeLabel } from '../cmsTypes';
import { slugify } from '../cmsData';
import { CmsIcon } from './CmsIcon';

export type CreateCollectionInput = {
  name: string;
  singularName: string;
  slug: string;
  description: string;
  icon: string;
  fields: { fieldKey: string; fieldType: CmsFieldType; label: string; required?: boolean; configuration?: Record<string, unknown> }[];
};

type Props = {
  collections: CmsCollection[];
  role: string | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpen: (id: string) => void;
  onCreate: (input: CreateCollectionInput) => Promise<{ ok: boolean; message: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; message: string }>;
};

export function CollectionsSection({ collections, role, loading, error, onRetry, onOpen, onCreate, onDelete }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CmsCollection | null>(null);
  const canManage = role === 'owner' || role === 'admin';

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Spinner /></div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
        <EmptyState title="Couldn't load collections" description={error} action={<Button size="sm" onClick={onRetry}>Retry</Button>} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-forge-text-muted">
          {collections.length === 0 ? 'No collections yet' : `${collections.length} collection${collections.length === 1 ? '' : 's'}`}
        </p>
        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>New collection</Button>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            title="Create your first collection"
            description="Collections hold structured content — blog posts, services, team members, products and more. Pick a template to get started."
            action={<Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreate(true)}>New collection</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="group cursor-pointer rounded-lg border border-forge-border-subtle bg-forge-panel p-4 transition-colors hover:border-forge-border"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.id); }}
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-md bg-forge-amber/10 text-forge-amber flex items-center justify-center">
                  <CmsIcon name={c.icon} className="h-5 w-5" />
                </div>
                {canManage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-forge-text-muted opacity-0 group-hover:opacity-100 hover:text-forge-error hover:bg-forge-hover transition-all"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-medium text-forge-text-primary truncate">{c.name}</h3>
                {c.description && <p className="mt-1 text-xs text-forge-text-muted line-clamp-2">{c.description}</p>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant="default">{c.fields.length} fields</Badge>
                  <Badge size="sm" variant="amber">{c.itemCount ?? 0} items</Badge>
                </div>
                <ChevronRight className="h-4 w-4 text-forge-text-muted group-hover:text-forge-amber transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCollectionModal
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            const res = await onCreate(input);
            if (res.ok) setShowCreate(false);
            return res;
          }}
        />
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
    </div>
  );
}

/* ── Create collection modal (template picker → details) ── */

function CreateCollectionModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: CreateCollectionInput) => Promise<{ ok: boolean; message: string }> }) {
  const [step, setStep] = useState<'choose' | 'details'>('choose');
  const [preset, setPreset] = useState<CollectionPreset | null>(null);
  const [name, setName] = useState('');
  const [singularName, setSingularName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('layers');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const choosePreset = (p: CollectionPreset) => {
    setPreset(p);
    setName(p.name);
    setSingularName(p.singularName);
    setSlug(slugify(p.name));
    setSlugTouched(false);
    setDescription(p.description);
    setIcon(p.icon);
    setStep('details');
  };

  const chooseCustom = () => {
    setPreset(null);
    setName('');
    setSingularName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setIcon('layers');
    setStep('details');
  };

  const fields = useMemo(() => {
    if (preset) return preset.fields;
    return [{ fieldKey: 'title', fieldType: 'text' as CmsFieldType, label: 'Title', required: true }];
  }, [preset]);

  const handleName = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const submit = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!slug.trim()) { setError('Slug is required.'); return; }
    setCreating(true);
    setError('');
    const res = await onCreate({
      name: name.trim(),
      singularName: singularName.trim() || name.trim(),
      slug: slugify(slug.trim()),
      description,
      icon,
      fields: fields.map((f) => ({ fieldKey: f.fieldKey, fieldType: f.fieldType, label: f.label, required: f.required, configuration: f.configuration })),
    });
    setCreating(false);
    if (!res.ok) setError(res.message);
  };

  return (
    <Modal open onClose={onClose} title="New collection" size="lg">
      {step === 'choose' ? (
        <div>
          <p className="text-sm text-forge-text-muted mb-3">Choose a template to pre-build the right fields, or start blank.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
            {COLLECTION_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => choosePreset(p)}
                className="flex flex-col items-start gap-2 rounded-md border border-forge-border-subtle bg-forge-panel p-3 text-left transition-colors hover:border-forge-amber"
              >
                <div className="h-7 w-7 rounded bg-forge-amber/10 text-forge-amber flex items-center justify-center">
                  <CmsIcon name={p.icon} className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-forge-text-primary">{p.name}</p>
                  <p className="text-[10px] text-forge-text-muted line-clamp-2">{p.description}</p>
                </div>
              </button>
            ))}
            <button
              onClick={chooseCustom}
              className="flex flex-col items-start gap-2 rounded-md border border-dashed border-forge-border bg-forge-panel p-3 text-left transition-colors hover:border-forge-amber"
            >
              <div className="h-7 w-7 rounded bg-forge-hover text-forge-text-secondary flex items-center justify-center">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-forge-text-primary">Custom</p>
                <p className="text-[10px] text-forge-text-muted">Start from a blank schema</p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => setStep('choose')} className="flex items-center gap-1 text-xs text-forge-text-muted hover:text-forge-text-primary transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to templates
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Name</label>
              <Input value={name} onChange={(e) => handleName(e.target.value)} placeholder="Blog posts" />
            </div>
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Singular name</label>
              <Input value={singularName} onChange={(e) => setSingularName(e.target.value)} placeholder="Blog post" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Slug</label>
              <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="blog-posts" className="font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Icon</label>
              <Select options={COLLECTION_ICONS} value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-forge-text-secondary mb-1">Description</label>
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="min-h-[48px]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-forge-text-secondary mb-1">Fields ({fields.length})</label>
            <div className="rounded-md border border-forge-border-subtle bg-forge-panel divide-y divide-forge-border-subtle">
              {fields.map((f) => (
                <div key={f.fieldKey} className="flex items-center justify-between px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-forge-text-muted">{f.fieldKey}</span>
                    <span className="text-xs text-forge-text-primary">{f.label}</span>
                  </div>
                  <Badge size="sm" variant="default">{fieldTypeLabel(f.fieldType)}</Badge>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-forge-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={creating} onClick={submit}>Create collection</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}