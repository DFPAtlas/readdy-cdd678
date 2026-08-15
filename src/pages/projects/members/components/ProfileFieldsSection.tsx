import { useState } from 'react';
import { Plus, Pencil, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SiteProfileField, ProfileFieldType, ProfileFieldVisibility } from '../membersTypes';
import { PROFILE_FIELD_TYPES, PROFILE_FIELD_VISIBILITIES } from '../membersTypes';
import { createProfileField, updateProfileField, deleteProfileField } from '../membersData';

type Props = {
  projectId: string;
  fields: SiteProfileField[];
  canManage: boolean;
  onRefresh: () => Promise<void>;
};

export function ProfileFieldsSection({ projectId, fields, canManage, onRefresh }: Props) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<SiteProfileField | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteProfileField | null>(null);
  const [label, setLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<ProfileFieldType>('text');
  const [visibility, setVisibility] = useState<ProfileFieldVisibility>('private');
  const [required, setRequired] = useState(false);
  const [memberEditable, setMemberEditable] = useState(false);
  const [options, setOptions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toKey = (input: string) => input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const openCreate = () => {
    setLabel(''); setFieldKey(''); setFieldType('text'); setVisibility('private');
    setRequired(false); setMemberEditable(false); setOptions(''); setError(''); setEditing(null); setShow(true);
  };

  const openEdit = (f: SiteProfileField) => {
    setLabel(f.label); setFieldKey(f.fieldKey); setFieldType(f.fieldType); setVisibility(f.visibility);
    setRequired(f.required); setMemberEditable(f.memberEditable);
    setOptions((f.configuration.options ?? []).join(', '));
    setError(''); setEditing(f); setShow(true);
  };

  const submit = async () => {
    if (!label.trim()) { setError('Enter a field label.'); return; }
    const key = editing ? editing.fieldKey : toKey(fieldKey || label);
    if (!key) { setError('Field key cannot be empty.'); return; }
    const needsOptions = fieldType === 'select' || fieldType === 'multiselect';
    const parsedOptions = options.split(',').map((o) => o.trim()).filter(Boolean);
    if (needsOptions && parsedOptions.length === 0) { setError('Select fields need at least one option.'); return; }
    setBusy(true);
    setError('');
    const configuration = { options: needsOptions ? parsedOptions : [], helpText: '', maxLength: fieldType === 'text' ? 200 : 2000 };
    const res = editing
      ? await updateProfileField(editing.id, { label: label.trim(), required, memberEditable, visibility, configuration })
      : await createProfileField(projectId, { fieldKey: key, fieldType, label: label.trim(), required, memberEditable, visibility, configuration });
    setBusy(false);
    if (res.ok) {
      setShow(false);
      await onRefresh();
    } else {
      setError(res.message);
    }
  };

  const typeLabel = (t: ProfileFieldType) => PROFILE_FIELD_TYPES.find((x) => x.value === t)?.label ?? t;
  const visLabel = (v: ProfileFieldVisibility) => PROFILE_FIELD_VISIBILITIES.find((x) => x.value === v)?.label ?? v;
  const needsOptions = fieldType === 'select' || fieldType === 'multiselect';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-forge-text-muted">Custom fields that members fill in on sign-up and can manage from their profile. New fields default to the most private setting.</p>
        {canManage && <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>New field</Button>}
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel">
          <EmptyState
            icon={<ListChecks className="h-8 w-8" />}
            title="No profile fields"
            description="Add fields to collect and store member information beyond name and email."
            action={canManage ? <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>New field</Button> : undefined}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-forge-border-subtle bg-forge-panel divide-y divide-forge-border-subtle">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-forge-text-primary">{f.label}</span>
                  <code className="text-[10px] font-mono text-forge-text-muted bg-forge-bg px-1.5 py-0.5 rounded">{f.fieldKey}</code>
                  <span className="text-[10px] text-forge-text-muted">{typeLabel(f.fieldType)}</span>
                  {f.required && <span className="text-[10px] text-forge-amber">Required</span>}
                  {f.memberEditable && <span className="text-[10px] text-forge-success">Member-editable</span>}
                </div>
                <p className="text-xs text-forge-text-muted mt-0.5">Visibility: {visLabel(f.visibility)}</p>
              </div>
              {canManage && (
                <div className="flex items-center gap-0.5">
                  <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors" onClick={() => openEdit(f)} aria-label="Edit field">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-6 w-6 flex items-center justify-center rounded text-forge-text-muted hover:text-forge-error hover:bg-forge-hover transition-colors" onClick={() => setConfirmDelete(f)} aria-label="Delete field">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {show && (
        <Modal open onClose={() => setShow(false)} title={editing ? 'Edit profile field' : 'New profile field'} size="sm">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Company" />
            </div>
            {!editing && (
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Field key</label>
                <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="company (auto from label)" />
                <p className="mt-1 text-[10px] text-forge-text-muted">Stable identifier — can't change after creation.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Field type</label>
              <Select
                options={PROFILE_FIELD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as ProfileFieldType)}
                disabled={Boolean(editing)}
                className="w-full"
              />
            </div>
            {needsOptions && (
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Options (comma-separated)</label>
                <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Option A, Option B, Option C" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-forge-text-secondary mb-1">Visibility</label>
              <Select
                options={PROFILE_FIELD_VISIBILITIES.map((v) => ({ value: v.value, label: v.label }))}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as ProfileFieldVisibility)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-4">
              <Switch checked={required} onChange={(e) => setRequired(e.target.checked)} label="Required" />
              <Switch checked={memberEditable} onChange={(e) => setMemberEditable(e.target.checked)} label="Member-editable" />
            </div>
            {error && <p className="text-xs text-forge-error">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShow(false)}>Cancel</Button>
              <Button size="sm" loading={busy} onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(null)} title="Delete profile field" size="sm">
          <p className="text-sm text-forge-text-secondary">
            Delete <span className="font-medium text-forge-text-primary">{confirmDelete.label}</span>?
            All stored values for this field will be removed.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={async () => {
              await deleteProfileField(confirmDelete.id);
              setConfirmDelete(null);
              await onRefresh();
            }}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}