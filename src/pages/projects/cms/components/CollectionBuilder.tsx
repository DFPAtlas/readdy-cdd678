import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Save, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CmsCollection, CmsField, CmsFieldType } from '../cmsTypes';
import { CMS_FIELD_TYPES, COLLECTION_ICONS, fieldTypeLabel } from '../cmsTypes';
import { updateCollection, createField, updateField, deleteField, slugify, toFieldKey } from '../cmsData';
import { CmsIcon, CmsFieldIcon } from './CmsIcon';

type Props = {
  collection: CmsCollection;
  role: string | null;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onDelete: (id: string) => Promise<{ ok: boolean; message: string }>;
};

export function CollectionBuilder({ collection, role, onBack, onRefresh, onDelete }: Props) {
  const canManage = role === 'owner' || role === 'admin';
  const [name, setName] = useState(collection.name);
  const [singularName, setSingularName] = useState(collection.singularName);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description);
  const [icon, setIcon] = useState(collection.icon);
  const [displayFieldKey, setDisplayFieldKey] = useState(collection.displayFieldKey);
  const [sortFieldKey, setSortFieldKey] = useState(collection.sortFieldKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(collection.defaultSortOrder);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<CmsField | null>(null);
  const [confirmDeleteField, setConfirmDeleteField] = useState<CmsField | null>(null);
  const [confirmDeleteCollection, setConfirmDeleteCollection] = useState(false);

  const fieldOptions = collection.fields.map((f) => ({ value: f.fieldKey, label: f.label }));

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg('');
    const res = await updateCollection(collection.id, {
      name, singularName, slug: slugify(slug), description, icon, displayFieldKey, sortFieldKey, defaultSortOrder: sortOrder,
    });
    setSavingSettings(false);
    setSettingsMsg(res.message);
    await onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-forge-text-muted hover:text-forge-text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Collections
          </button>
          <span className="text-forge-text-muted">/</span>
          <div className="flex items-center gap-2">
            <CmsIcon name={collection.icon} className="h-4 w-4 text-forge-amber" />
            <h2 className="text-sm font-medium text-forge-text-primary">{collection.name}</h2>
          </div>
        </div>
        {canManage && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDeleteCollection(true)}>Delete collection</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Settings */}
        <div className="lg:col-span-1 space-y-3">
          <div className="rounded-lg border border-forge-border-subtle bg-forge-panel p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-forge-text-muted mb-3">Collection settings</h3>
            <div className="space-y-2.5">
              <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} /></Field>
              <Field label="Singular name"><Input value={singularName} onChange={(e) => setSingularName(e.target.value)} disabled={!canManage} /></Field>
              <Field label="Slug"><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" disabled={!canManage} /></Field>
              <Field label="Icon">
                <Select options={COLLECTION_ICONS} value={icon} onChange={(e) => setIcon(e.target.value)} disabled={!canManage} />
              </Field>
              <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="min-h-[48px]" disabled={!canManage} /></Field>
              <Field label="Display field">
                <Select options={[{ value: '', label: 'First field' }, ...fieldOptions]} value={displayFieldKey} onChange={(e) => setDisplayFieldKey(e.target.value)} disabled={!canManage} />
              </Field>
              <Field label="Sort field">
                <Select options={[{ value: '', label: 'Created date' }, ...fieldOptions]} value={sortFieldKey} onChange={(e) => setSortFieldKey(e.target.value)} disabled={!canManage} />
              </Field>
              <Field label="Default sort">
                <Select options={[{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }]} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} disabled={!canManage} />
              </Field>
            </div>
            {canManage && (
              <div className="mt-3">
                <Button size="sm" loading={savingSettings} icon={<Save className="h-3.5 w-3.5" />} onClick={saveSettings} className="w-full">Save settings</Button>
                {settingsMsg && <p className="mt-2 text-xs text-forge-text-muted">{settingsMsg}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
            <div className="flex items-center justify-between px-4 py-3 border-b border-forge-border-subtle">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-forge-text-muted">
                Fields ({collection.fields.length})
              </h3>
              {canManage && (
                <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setEditingField(null); setShowFieldEditor(true); }}>Add field</Button>
              )}
            </div>

            {collection.fields.length === 0 ? (
              <EmptyState title="No fields yet" description="Add fields to define the structure of each item in this collection." />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-forge-border-subtle bg-forge-bg/40">
                    <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Field</th>
                    <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-forge-text-muted">Constraints</th>
                    <th className="text-right px-4 py-2 font-medium text-forge-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forge-border-subtle">
                  {collection.fields.map((f) => (
                    <tr key={f.id} className="hover:bg-forge-hover/40 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <CmsFieldIcon type={f.fieldType} className="h-3.5 w-3.5 text-forge-text-muted" />
                          <span className="font-medium text-forge-text-primary">{f.label}</span>
                          <span className="font-mono text-[10px] text-forge-text-muted">{f.fieldKey}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge size="sm" variant="default">{fieldTypeLabel(f.fieldType)}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {f.required && <Badge size="sm" variant="amber">required</Badge>}
                          {f.uniqueValue && <Badge size="sm" variant="accent">unique</Badge>}
                          {!f.required && !f.uniqueValue && <span className="text-forge-text-muted">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingField(f); setShowFieldEditor(true); }} className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors" aria-label={`Edit ${f.label}`}>
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => setConfirmDeleteField(f)} className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error hover:bg-forge-hover transition-colors" aria-label={`Delete ${f.label}`}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showFieldEditor && (
        <FieldEditorModal
          collection={collection}
          field={editingField}
          onClose={() => setShowFieldEditor(false)}
          onSaved={async () => { setShowFieldEditor(false); await onRefresh(); }}
        />
      )}

      {confirmDeleteField && (
        <Modal open onClose={() => setConfirmDeleteField(null)} title="Delete field" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete field <strong className="text-forge-text-primary">{confirmDeleteField.label}</strong>? Values stored against this field will be removed.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteField(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await deleteField(confirmDeleteField.id);
              setConfirmDeleteField(null);
              await onRefresh();
            }}>Delete</Button>
          </div>
        </Modal>
      )}

      {confirmDeleteCollection && (
        <Modal open onClose={() => setConfirmDeleteCollection(false)} title="Delete collection" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete <strong className="text-forge-text-primary">{collection.name}</strong> and all its items? This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteCollection(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await onDelete(collection.id);
              setConfirmDeleteCollection(false);
              onBack();
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-forge-text-secondary mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ── Field editor modal ── */

function FieldEditorModal({ collection, field, onClose, onSaved }: { collection: CmsCollection; field: CmsField | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const isEdit = field !== null;
  const [label, setLabel] = useState(field?.label ?? '');
  const [fieldKey, setFieldKey] = useState(field?.fieldKey ?? '');
  const [keyTouched, setKeyTouched] = useState(isEdit);
  const [fieldType, setFieldType] = useState<CmsFieldType>(field?.fieldType ?? 'text');
  const [required, setRequired] = useState(field?.required ?? false);
  const [unique, setUnique] = useState(field?.uniqueValue ?? false);
  const [helpText, setHelpText] = useState(field?.configuration.helpText ?? '');
  const [options, setOptions] = useState((field?.configuration.options ?? []).join(', '));
  const [maxLength, setMaxLength] = useState(field?.configuration.maxLength ? String(field.configuration.maxLength) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLabel = (v: string) => {
    setLabel(v);
    if (!keyTouched) setFieldKey(toFieldKey(v));
  };

  const submit = async () => {
    if (!label.trim()) { setError('Label is required.'); return; }
    if (!fieldKey.trim()) { setError('Field key is required.'); return; }
    setSaving(true);
    setError('');
    const configuration = {
      helpText,
      options: (fieldType === 'select' || fieldType === 'multiselect') ? options.split(',').map((s) => s.trim()).filter(Boolean) : [],
      maxLength: maxLength ? Number(maxLength) : undefined,
    };
    const res = isEdit
      ? await updateField(field!.id, { label: label.trim(), required, uniqueValue: unique, configuration, fieldType })
      : await createField(collection.id, { fieldKey: fieldKey.trim(), fieldType, label: label.trim(), required, uniqueValue: unique, configuration, position: collection.fields.length });
    setSaving(false);
    if (!res.ok) { setError(res.message); return; }
    await onSaved();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit field' : 'Add field'} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label">
            <Input value={label} onChange={(e) => handleLabel(e.target.value)} placeholder="Title" />
          </Field>
          <Field label="Field type">
            <Select options={CMS_FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={fieldType} onChange={(e) => setFieldType(e.target.value as CmsFieldType)} disabled={isEdit} />
          </Field>
        </div>
        <Field label="Field key">
          <div className="relative">
            <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-forge-text-muted pointer-events-none" />
            <Input value={fieldKey} onChange={(e) => { setFieldKey(e.target.value); setKeyTouched(true); }} disabled={isEdit} className="pl-8 font-mono" placeholder="title" />
          </div>
          <p className="mt-1 text-[10px] text-forge-text-muted">{isEdit ? 'Field keys are stable and cannot be changed.' : 'A stable identifier used in bindings and imports.'}</p>
        </Field>
        {(fieldType === 'select' || fieldType === 'multiselect') && (
          <Field label="Options (comma-separated)">
            <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Option A, Option B, Option C" />
          </Field>
        )}
        {(fieldType === 'text' || fieldType === 'textarea') && (
          <Field label="Character limit (optional)">
            <Input type="number" value={maxLength} onChange={(e) => setMaxLength(e.target.value)} placeholder="No limit" />
          </Field>
        )}
        <Field label="Help text">
          <Input value={helpText} onChange={(e) => setHelpText(e.target.value)} placeholder="Shown under the input" />
        </Field>
        <div className="flex items-center gap-6 pt-1">
          <Switch label="Required" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          <Switch label="Unique" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
        </div>
        {error && <p className="text-xs text-forge-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={submit}>{isEdit ? 'Save field' : 'Add field'}</Button>
        </div>
      </div>
    </Modal>
  );
}