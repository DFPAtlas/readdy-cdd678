import { useMemo, useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import type { CmsFieldType, CollectionPreset, FieldConfiguration } from '../cmsTypes';
import { COLLECTION_PRESETS, COLLECTION_ICONS, fieldTypeLabel } from '../cmsTypes';
import { slugify } from '../cmsData';
import { CmsIcon } from './CmsIcon';

export type CreateCollectionInput = {
  name: string;
  singularName: string;
  slug: string;
  description: string;
  icon: string;
  fields: { fieldKey: string; fieldType: CmsFieldType; label: string; required?: boolean; configuration?: FieldConfiguration }[];
};

type Props = {
  onClose: () => void;
  onCreate: (input: CreateCollectionInput) => Promise<{ ok: boolean; message: string }>;
};

export function CreateCollectionModal({ onClose, onCreate }: Props) {
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