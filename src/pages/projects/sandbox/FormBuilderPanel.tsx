import { useState } from 'react';
import {
  Plus, Trash2, Copy, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  GripVertical, TextCursorInput, Hash, ListOrdered, CheckSquare, Calendar,
  Clock, FileUp, Type, AlignLeft, CircleDot, Send, Mail,
} from 'lucide-react';
import {
  FORM_FIELD_TYPES, FORM_FIELD_LABELS, defaultFormDefinition,
  type FormDefinition, type FormField, type FormFieldType,
} from './sandboxPersistence';

type FormBuilderPanelProps = {
  form: FormDefinition;
  onChange: (form: FormDefinition) => void;
  onNotify: (message: string) => void;
};

const FIELD_ICONS: Record<FormFieldType, typeof Type> = {
  text: Type, email: Mail, tel: TextCursorInput, number: Hash,
  textarea: AlignLeft, select: ListOrdered, radio: CircleDot,
  checkbox: CheckSquare, consent: CheckSquare, date: Calendar,
  time: Clock, file: FileUp, hidden: Type, submit: Send,
};

function slugKey(label: string, existing: FormField[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let candidate = base;
  let index = 2;
  while (existing.some((field) => field.key === candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  return candidate;
}

function newField(type: FormFieldType, existing: FormField[]): FormField {
  const label = FORM_FIELD_LABELS[type];
  return {
    id: `fld-${crypto.randomUUID()}`,
    key: slugKey(label, existing),
    type,
    label,
    placeholder: '',
    helpText: '',
    required: type === 'email',
    defaultValue: '',
    options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : [],
    validation: {},
    errorMessage: '',
    autocomplete: type === 'email' ? 'email' : 'off',
    width: 'full',
  };
}

export default function FormBuilderPanel({ form, onChange, onNotify }: FormBuilderPanelProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(form.fields[0]?.id ?? null);
  const [openSection, setOpenSection] = useState<string>('fields');
  const [addOpen, setAddOpen] = useState(false);

  const update = (patch: Partial<FormDefinition>) => onChange({ ...form, ...patch });

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    update({ fields: form.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)) });
  };

  const selectedField = form.fields.find((field) => field.id === selectedFieldId) ?? null;

  const addField = (type: FormFieldType) => {
    const field = newField(type, form.fields);
    update({ fields: [...form.fields, field] });
    setSelectedFieldId(field.id);
    setAddOpen(false);
    onNotify(`${FORM_FIELD_LABELS[type]} field added`);
  };

  const duplicateField = (fieldId: string) => {
    const source = form.fields.find((field) => field.id === fieldId);
    if (!source) return;
    const copy: FormField = { ...source, id: `fld-${crypto.randomUUID()}`, key: slugKey(source.label, form.fields), label: `${source.label} copy` };
    const index = form.fields.findIndex((field) => field.id === fieldId);
    const next = [...form.fields];
    next.splice(index + 1, 0, copy);
    update({ fields: next });
    setSelectedFieldId(copy.id);
  };

  const deleteField = (fieldId: string) => {
    if (form.fields.length <= 1) return onNotify('A form needs at least one field');
    update({ fields: form.fields.filter((field) => field.id !== fieldId) });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const moveField = (fieldId: string, direction: -1 | 1) => {
    const index = form.fields.findIndex((field) => field.id === fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= form.fields.length) return;
    const next = [...form.fields];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    update({ fields: next });
  };

  const section = (key: string, label: string) => (
    <button className="fb-section" onClick={() => setOpenSection(openSection === key ? '' : key)}>
      {openSection === key ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {label}
    </button>
  );

  return (
    <div className="form-builder">
      <div className="fb-section-block">
        {section('fields', 'Fields')}
        {openSection === 'fields' && (
          <div className="fb-fields">
            {form.fields.map((field) => (
              <div key={field.id} className={`fb-field-row ${selectedFieldId === field.id ? 'active' : ''}`} onClick={() => setSelectedFieldId(field.id)}>
                <span className="fb-drag"><GripVertical size={13} /></span>
                <span className="fb-field-icon">{(() => { const Icon = FIELD_ICONS[field.type] ?? Type; return <Icon size={14} />; })()}</span>
                <span className="fb-field-name">{field.label || field.key}</span>
                {field.required && <b className="fb-req">*</b>}
                <span className="fb-field-type">{FORM_FIELD_LABELS[field.type]}</span>
                <div className="fb-field-actions">
                  <button title="Move up" onClick={(event) => { event.stopPropagation(); moveField(field.id, -1); }}><ArrowUp size={12} /></button>
                  <button title="Move down" onClick={(event) => { event.stopPropagation(); moveField(field.id, 1); }}><ArrowDown size={12} /></button>
                  <button title="Duplicate" onClick={(event) => { event.stopPropagation(); duplicateField(field.id); }}><Copy size={12} /></button>
                  <button className="danger" title="Delete" onClick={(event) => { event.stopPropagation(); deleteField(field.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            <div className="fb-add">
              <button onClick={() => setAddOpen((open) => !open)}><Plus size={13} /> Add field</button>
              {addOpen && (
                <div className="fb-add-menu">
                  {FORM_FIELD_TYPES.map((type) => (
                    <button key={type} onClick={() => addField(type)}>{(() => { const Icon = FIELD_ICONS[type] ?? Type; return <Icon size={13} />; })()}{FORM_FIELD_LABELS[type]}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedField && openSection === 'fields' && (
          <div className="fb-field-editor">
            <label className="fb-label">Label<input value={selectedField.label} onChange={(event) => updateField(selectedField.id, { label: event.target.value })} /></label>
            <label className="fb-label">Field key<input value={selectedField.key} readOnly title="Stable identifier — renaming the label won't break stored submissions" /></label>
            {selectedField.type !== 'submit' && selectedField.type !== 'hidden' && selectedField.type !== 'consent' && (
              <label className="fb-label">Placeholder<input value={selectedField.placeholder} onChange={(event) => updateField(selectedField.id, { placeholder: event.target.value })} /></label>
            )}
            {selectedField.type !== 'submit' && (
              <label className="fb-label">Help text<input value={selectedField.helpText} onChange={(event) => updateField(selectedField.id, { helpText: event.target.value })} /></label>
            )}
            {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
              <label className="fb-label">Options (one per line)<textarea value={selectedField.options.join('\n')} onChange={(event) => updateField(selectedField.id, { options: event.target.value.split('\n') })} /></label>
            )}
            {selectedField.type !== 'submit' && selectedField.type !== 'hidden' && selectedField.type !== 'consent' && (
              <label className="fb-label">Default value<input value={selectedField.defaultValue} onChange={(event) => updateField(selectedField.id, { defaultValue: event.target.value })} /></label>
            )}
            {selectedField.type !== 'submit' && selectedField.type !== 'hidden' && selectedField.type !== 'consent' && (
              <label className="fb-label">Autocomplete<input value={selectedField.autocomplete} onChange={(event) => updateField(selectedField.id, { autocomplete: event.target.value })} placeholder="off" /></label>
            )}
            {selectedField.type !== 'submit' && (
              <label className="fb-label">Error message<input value={selectedField.errorMessage} onChange={(event) => updateField(selectedField.id, { errorMessage: event.target.value })} placeholder={selectedField.required ? 'This field is required' : ''} /></label>
            )}
            <div className="fb-row">
              {selectedField.type !== 'submit' && selectedField.type !== 'hidden' && (
                <label className="fb-check"><input type="checkbox" checked={selectedField.required} onChange={(event) => updateField(selectedField.id, { required: event.target.checked })} /> Required</label>
              )}
              {selectedField.type !== 'submit' && selectedField.type !== 'hidden' && selectedField.type !== 'consent' && (
                <label className="fb-check"><input type="checkbox" checked={selectedField.width === 'half'} onChange={(event) => updateField(selectedField.id, { width: event.target.checked ? 'half' : 'full' })} /> Half width</label>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fb-section-block">
        {section('settings', 'Form settings')}
        {openSection === 'settings' && (
          <div className="fb-form">
            <label className="fb-label">Form name<input value={form.name} onChange={(event) => update({ name: event.target.value })} /></label>
            <label className="fb-label">Description<textarea value={form.description} onChange={(event) => update({ description: event.target.value })} /></label>
            <label className="fb-label">Submit button text<input value={form.submitLabel} onChange={(event) => update({ submitLabel: event.target.value })} /></label>
            <label className="fb-label">Loading text<input value={form.loadingText} onChange={(event) => update({ loadingText: event.target.value })} /></label>
          </div>
        )}
      </div>

      <div className="fb-section-block">
        {section('success', 'Success behaviour')}
        {openSection === 'success' && (
          <div className="fb-form">
            <label className="fb-label">On success
              <select value={form.successAction} onChange={(event) => update({ successAction: event.target.value as FormDefinition['successAction'] })}>
                <option value="message">Show inline message</option>
                <option value="panel">Replace with success panel</option>
                <option value="redirect">Redirect to a Forge page</option>
                <option value="external">Redirect to an external URL</option>
              </select>
            </label>
            <label className="fb-label">Success heading<input value={form.successHeading} onChange={(event) => update({ successHeading: event.target.value })} /></label>
            <label className="fb-label">Success message<input value={form.successMessage} onChange={(event) => update({ successMessage: event.target.value })} /></label>
            {(form.successAction === 'redirect' || form.successAction === 'external') && (
              <label className="fb-label">Redirect URL<input value={form.redirectUrl} onChange={(event) => update({ redirectUrl: event.target.value })} placeholder={form.successAction === 'external' ? 'https://…' : '/thanks'} /></label>
            )}
          </div>
        )}
      </div>

      <div className="fb-section-block">
        {section('privacy', 'Privacy & consent')}
        {openSection === 'privacy' && (
          <div className="fb-form">
            <label className="fb-label">Privacy policy URL<input value={form.privacyPolicyUrl} onChange={(event) => update({ privacyPolicyUrl: event.target.value })} placeholder="https://…" /></label>
            <label className="fb-label">Consent wording<input value={form.consentLabel} onChange={(event) => update({ consentLabel: event.target.value })} /></label>
            <label className="fb-label">Marketing consent wording<input value={form.marketingConsentLabel} onChange={(event) => update({ marketingConsentLabel: event.target.value })} /></label>
            <label className="fb-label">Data retention (days)<input type="number" min="1" value={form.retentionDays} onChange={(event) => update({ retentionDays: Math.max(1, Number(event.target.value)) })} /></label>
            <p className="fb-hint">Submissions are automatically deleted or anonymised after the retention period. Consent boxes are never pre-checked.</p>
          </div>
        )}
      </div>

      <div className="fb-section-block">
        {section('notify', 'Notifications & spam')}
        {openSection === 'notify' && (
          <div className="fb-form">
            <label className="fb-label">Notify recipients (comma-separated)<input value={form.notifyRecipients} onChange={(event) => update({ notifyRecipients: event.target.value })} placeholder="owner@example.com" /></label>
            <label className="fb-label">Email subject<input value={form.notifySubject} onChange={(event) => update({ notifySubject: event.target.value })} placeholder="New submission" /></label>
            <label className="fb-check"><input type="checkbox" checked={form.honeypot} onChange={(event) => update({ honeypot: event.target.checked })} /> Honeypot spam trap</label>
            <label className="fb-check"><input type="checkbox" checked={form.minTime} onChange={(event) => update({ minTime: event.target.checked })} /> Minimum completion time</label>
            <label className="fb-check"><input type="checkbox" checked={form.turnstile} onChange={(event) => update({ turnstile: event.target.checked })} /> Cloudflare Turnstile</label>
            {form.turnstile && <p className="fb-hint">Turnstile requires a server-side secret to be configured before it activates.</p>}
          </div>
        )}
      </div>
    </div>
  );
}