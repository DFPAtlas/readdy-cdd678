import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import type { CmsCollection, CmsField, CmsItem } from '../cmsTypes';
import { slugify } from '../cmsData';
import { CmsFieldIcon } from './CmsIcon';

type Props = {
  collection: CmsCollection;
  item: CmsItem | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onSave: (slug: string, values: Record<string, unknown>) => Promise<{ ok: boolean; message: string }>;
};

export function ItemEditorModal({ collection, item, onClose, onSaved, onSave }: Props) {
  const isEdit = item !== null;
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [values, setValues] = useState<Record<string, unknown>>(item?.fieldValues ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const titleField = useMemo(() => {
    const byKey = collection.fields.find((f) => f.fieldKey === collection.displayFieldKey);
    return byKey ?? collection.fields.find((f) => f.fieldType === 'text');
  }, [collection]);

  const visibleFields = collection.fields.filter((f) => f.fieldType !== 'slug');

  // Auto-fill the slug from the title/display field as the user types.
  const handleValueChange = (fieldKey: string, value: unknown) => {
    const next = { ...values, [fieldKey]: value };
    setValues(next);
    if (!slugTouched && titleField && fieldKey === titleField.fieldKey) {
      setSlug(slugify(String(value ?? '')));
    }
  };

  useEffect(() => {
    if (!isEdit && !slugTouched && titleField) {
      const initial = values[titleField.fieldKey];
      if (initial) setSlug(slugify(String(initial)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const finalSlug = slugify(slug) || `item-${Date.now()}`;
    setSaving(true);
    setError('');
    const res = await onSave(finalSlug, values);
    setSaving(false);
    if (!res.ok) { setError(res.message); return; }
    await onSaved();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit item' : `New ${collection.singularName.toLowerCase()}`} size="lg">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-xs font-medium text-forge-text-secondary mb-1">Slug</label>
          <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} className="font-mono" placeholder="auto-generated" />
          <p className="mt-1 text-[10px] text-forge-text-muted">Used in the item URL (e.g. /services/{'{slug}'}).</p>
        </div>

        {visibleFields.map((field) => (
          <FieldInput key={field.id} field={field} value={values[field.fieldKey]} onChange={(v) => handleValueChange(field.fieldKey, v)} />
        ))}

        {visibleFields.length === 0 && (
          <p className="text-sm text-forge-text-muted">This collection has no fields yet. Add fields in the collection builder.</p>
        )}

        {error && <p className="text-xs text-forge-error">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-forge-border-subtle mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={saving} onClick={submit}>{isEdit ? 'Save item' : 'Create draft'}</Button>
      </div>
    </Modal>
  );
}

/* ── Per-type input rendering ── */

function FieldInput({ field, value, onChange }: { field: CmsField; value: unknown; onChange: (v: unknown) => void }) {
  const opts = field.configuration.options ?? [];
  const required = field.required;
  const label = (
    <span className="flex items-center gap-1.5">
      <CmsFieldIcon type={field.fieldType} className="h-3.5 w-3.5 text-forge-text-muted" />
      {field.label}
      {required && <span className="text-forge-amber">*</span>}
    </span>
  );

  const help = field.configuration.helpText;
  const textValue = value == null ? '' : String(value);

  let control: React.ReactNode;
  switch (field.fieldType) {
    case 'text':
    case 'email':
    case 'tel':
    case 'url':
      control = (
        <Input
          type={field.fieldType === 'text' ? 'text' : field.fieldType}
          value={textValue}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.configuration.maxLength}
        />
      );
      break;
    case 'textarea':
      control = <TextArea value={textValue} onChange={(e) => onChange(e.target.value)} rows={3} />;
      break;
    case 'richtext':
      control = (
        <div>
          <TextArea value={textValue} onChange={(e) => onChange(e.target.value)} rows={6} placeholder="Formatted content…" />
          <p className="mt-1 text-[10px] text-forge-text-muted">Rich-text toolbar ships in the next CMS milestone.</p>
        </div>
      );
      break;
    case 'number':
      control = (
        <Input type="number" value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} min={field.configuration.min} max={field.configuration.max} />
      );
      break;
    case 'currency':
      control = (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-forge-text-muted">$</span>
          <Input type="number" step="0.01" className="pl-6" value={value == null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        </div>
      );
      break;
    case 'boolean':
      control = <Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
      break;
    case 'date':
      control = <Input type="date" value={textValue} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'datetime':
      control = <Input type="datetime-local" value={textValue} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'color':
      control = (
        <div className="flex items-center gap-2">
          <input type="color" value={textValue || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded-md border border-forge-border bg-forge-bg cursor-pointer" />
          <Input value={textValue} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        </div>
      );
      break;
    case 'image':
    case 'video':
    case 'file':
      control = <Input value={textValue} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />;
      break;
    case 'gallery':
      control = <TextArea value={textValue} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="One URL per line" />;
      break;
    case 'select':
      control = (
        <Select options={[{ value: '', label: 'Select…' }, ...opts.map((o) => ({ value: o, label: o }))]} value={textValue} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : (textValue ? [textValue] : []);
      control = (
        <div className="flex flex-wrap gap-1.5">
          {opts.map((o) => {
            const active = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(active ? selected.filter((s) => s !== o) : [...selected, o])}
                className={`px-2 py-1 rounded-md text-xs border transition-colors ${active ? 'bg-forge-amber/15 border-forge-amber text-forge-amber' : 'border-forge-border text-forge-text-secondary hover:border-forge-amber'}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'reference':
    case 'multireference':
      control = <Input value={textValue} onChange={(e) => onChange(e.target.value)} placeholder="Linked item identifier" />;
      break;
    case 'location':
      control = <Input value={textValue} onChange={(e) => onChange(e.target.value)} placeholder="lat, lng" />;
      break;
    case 'json':
      control = <TextArea value={textValue} onChange={(e) => onChange(e.target.value)} rows={5} className="font-mono text-xs" placeholder='{ "key": "value" }' />;
      break;
    default:
      control = <Input value={textValue} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <div>
      <label className="block text-xs font-medium text-forge-text-secondary mb-1">{label}</label>
      {control}
      {help && <p className="mt-1 text-[10px] text-forge-text-muted">{help}</p>}
    </div>
  );
}