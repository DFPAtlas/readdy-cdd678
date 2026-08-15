import { useEffect, useState } from 'react';
import { Boxes, Save, X } from 'lucide-react';
import type { ComponentCategory, ComponentDefinition } from './sandboxPersistence';
import { COMPONENT_CATEGORIES } from './sandboxPersistence';

type ComponentMasterEditorProps = {
  component: ComponentDefinition | null;
  instanceCount: number;
  usagePages: string[];
  onSave: (updates: { name: string; description: string; category: ComponentCategory; defaults: Record<string, string> }) => void;
  onCancel: () => void;
};

export default function ComponentMasterEditor({ component, instanceCount, usagePages, onSave, onCancel }: ComponentMasterEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('Custom');
  const [defaults, setDefaults] = useState<Record<string, string>>({});

  useEffect(() => {
    if (component) {
      setName(component.name);
      setDescription(component.description);
      setCategory(component.category);
      const next: Record<string, string> = {};
      component.exposedProperties.forEach((prop) => { next[prop.id] = prop.defaultValue; });
      setDefaults(next);
    }
  }, [component]);

  if (!component) return null;

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), category, defaults });
  };

  return (
    <div className="asset-dialog-overlay" onClick={onCancel}>
      <div className="asset-dialog master-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header master-dialog-header">
          <h3><Boxes size={14} /> Editing master component</h3>
          <button onClick={onCancel} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="master-dialog-body">
          <div className="master-summary">
            <strong>{component.name}</strong>
            <span>Affects {instanceCount} instance{instanceCount === 1 ? '' : 's'}{usagePages.length ? ` across ${usagePages.length} page${usagePages.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          {usagePages.length > 0 && <p className="page-dialog-hint">Pages: {usagePages.join(', ')}</p>}

          <label className="page-dialog-label">Name
            <input className="asset-dialog-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="page-dialog-label">Description
            <textarea className="asset-dialog-input textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="page-dialog-label">Category
            <select className="asset-dialog-input" value={category} onChange={(event) => setCategory(event.target.value as ComponentCategory)}>
              {COMPONENT_CATEGORIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </label>

          {component.exposedProperties.length > 0 && (
            <div className="master-defaults">
              <span className="master-defaults-head">Exposed property defaults</span>
              {component.exposedProperties.map((prop) => (
                <label key={prop.id} className="page-dialog-label">{prop.label}
                  <input className="asset-dialog-input" value={defaults[prop.id] ?? ''} onChange={(event) => setDefaults((current) => ({ ...current, [prop.id]: event.target.value }))} />
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="asset-dialog-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={!name.trim()} onClick={submit}><Save size={14} /> Save changes</button>
        </div>
      </div>
    </div>
  );
}