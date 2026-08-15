import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { PageType } from './sandboxPages';
import { PAGE_TYPES, slugify, suggestSlug, validateSlug } from './sandboxPages';

type CreatePageDialogProps = {
  open: boolean;
  existingSlugs: string[];
  onClose: () => void;
  onCreate: (input: { name: string; slug: string; type: PageType; addToNavigation: boolean }) => void;
};

export default function CreatePageDialog({ open, existingSlugs, onClose, onCreate }: CreatePageDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<PageType>('standard');
  const [addToNavigation, setAddToNavigation] = useState(true);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setType('standard');
      setAddToNavigation(true);
      setSlugEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (!slugEdited && open) {
      setSlug(name ? slugify(name) : '');
    }
  }, [name, slugEdited, open]);

  const slugCheck = useMemo(() => validateSlug(slug || slugify(name || 'new-page'), existingSlugs), [slug, name, existingSlugs]);

  const submit = () => {
    const finalSlug = slug || slugify(name || 'new-page');
    const check = validateSlug(finalSlug, existingSlugs);
    if (!name.trim()) return;
    if (!check.ok) return;
    onCreate({ name: name.trim(), slug: finalSlug, type, addToNavigation });
  };

  if (!open) return null;

  return (
    <div className="asset-dialog-overlay" onClick={onClose}>
      <div className="asset-dialog page-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="asset-dialog-header">
          <h3>Add page</h3>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="page-dialog-body">
          <label className="page-dialog-label">Page name
            <input className="asset-dialog-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. About Us" autoFocus />
          </label>
          <label className="page-dialog-label">Slug
            <input className="asset-dialog-input" value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} placeholder="/about-us" />
          </label>
          {slug && !slugCheck.ok && (
            <div className="slug-feedback">
              <span>{slugCheck.error}</span>
              {slugCheck.suggestion && (
                <button onClick={() => setSlug(slugCheck.suggestion as string)}>Use {slugCheck.suggestion}</button>
              )}
            </div>
          )}
          <label className="page-dialog-label">Page type
            <select className="asset-dialog-input" value={type} onChange={(event) => setType(event.target.value as PageType)}>
              {PAGE_TYPES.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}
            </select>
          </label>
          <p className="page-dialog-hint">{PAGE_TYPES.find((entry) => entry.type === type)?.description}</p>
          <label className="asset-check page-dialog-check">
            <input type="checkbox" checked={addToNavigation} onChange={(event) => setAddToNavigation(event.target.checked)} />
            Add to navigation
          </label>
        </div>
        <div className="asset-dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!name.trim() || !slugCheck.ok} onClick={submit}><Plus size={14} /> Create page</button>
        </div>
      </div>
    </div>
  );
}