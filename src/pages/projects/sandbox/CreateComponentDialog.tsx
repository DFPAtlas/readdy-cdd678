import { useEffect, useState } from 'react';
import { Boxes, Plus, X } from 'lucide-react';
import type { ComponentCategory, ComponentKind } from './sandboxPersistence';
import { COMPONENT_CATEGORIES } from './sandboxPersistence';

type CreateComponentDialogProps = {
  open: boolean;
  selectionCount: number;
  onClose: () => void;
  onCreate: (input: { name: string; description: string; category: ComponentCategory; type: ComponentKind }) => void;
};

export default function CreateComponentDialog({ open, selectionCount, onClose, onCreate }: CreateComponentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComponentCategory>('Custom');
  const [type, setType] = useState<ComponentKind>('component');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setCategory('Custom');
      setType('component');
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), category, type });
  };

  if (!open) return null;

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog page-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3>Create component</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="page-dialog-body">
          <p className="page-dialog-hint">
            <Boxes size={13} /> {selectionCount} element{selectionCount === 1 ? '' : 's'} selected. They will become a reusable, linked component.
          </p>
          <label className="page-dialog-label">Name
            <input className="asset-dialog-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Hero section" autoFocus />
          </label>
          <label className="page-dialog-label">Description
            <textarea className="asset-dialog-input textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this component for?" />
          </label>
          <label className="page-dialog-label">Category
            <select className="asset-dialog-input" value={category} onChange={(event) => setCategory(event.target.value as ComponentCategory)}>
              {COMPONENT_CATEGORIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </label>
          <label className="page-dialog-label">Type
            <select className="asset-dialog-input" value={type} onChange={(event) => setType(event.target.value as ComponentKind)}>
              <option value="component">Component</option>
              <option value="section">Section (full width)</option>
            </select>
          </label>
        </div>
        <div className="asset-dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!name.trim()} onClick={submit}><Plus size={14} /> Create component</button>
        </div>
      </div>
    </div>
  );
}