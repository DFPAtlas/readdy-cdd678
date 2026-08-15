import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, GripVertical, Hash, Link, Plus, Trash2, X } from 'lucide-react';
import type { NavigationItem, SandboxPage } from './sandboxPersistence';
import { makeNavigationItem } from './sandboxPages';

type NavigationManagerProps = {
  items: NavigationItem[];
  pages: SandboxPage[];
  onChange: (items: NavigationItem[]) => void;
  onNotify: (message: string) => void;
};

export default function NavigationManager({ items, pages, onChange, onNotify }: NavigationManagerProps) {
  const [adding, setAdding] = useState<'page' | 'external' | 'anchor' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const addPage = (pageId: string) => {
    const page = pages.find((entry) => entry.id === pageId);
    if (!page) return;
    onChange([...items, makeNavigationItem({ label: page.navigationLabel || page.name, type: 'page', pageId: page.id })]);
    setAdding(null);
  };

  const addExternal = () => {
    onChange([...items, makeNavigationItem({ label: 'External link', type: 'external', url: 'https://' })]);
    setAdding(null);
  };

  const addAnchor = () => {
    onChange([...items, makeNavigationItem({ label: 'Section link', type: 'anchor', anchor: '#section' })]);
    setAdding(null);
  };

  const updateItem = (id: string, patch: Partial<NavigationItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
    onNotify('Navigation item removed');
  };

  return (
    <div className="nav-manager">
      <div className="nav-manager-heading">
        <span>Navigation</span>
        <div className="nav-add-actions">
          <button onClick={() => setAdding(adding === 'page' ? null : 'page')} title="Add page link"><Plus size={13} /></button>
          <button onClick={() => setAdding(adding === 'external' ? null : 'external')} title="Add external link"><ExternalLink size={13} /></button>
          <button onClick={() => setAdding(adding === 'anchor' ? null : 'anchor')} title="Add anchor link"><Hash size={13} /></button>
        </div>
      </div>

      {adding === 'page' && (
        <div className="nav-add-picker">
          <div className="nav-add-picker-head"><span>Add page to navigation</span><button onClick={() => setAdding(null)}><X size={12} /></button></div>
          {pages.filter((page) => !items.some((item) => item.type === 'page' && item.pageId === page.id)).map((page) => (
            <button key={page.id} onClick={() => addPage(page.id)}>{page.name}<span>{page.slug}</span></button>
          ))}
        </div>
      )}
      {adding === 'external' && (
        <div className="nav-add-picker">
          <div className="nav-add-picker-head"><span>Add external link</span><button onClick={() => setAdding(null)}><X size={12} /></button></div>
          <button onClick={addExternal}>Add external link</button>
        </div>
      )}
      {adding === 'anchor' && (
        <div className="nav-add-picker">
          <div className="nav-add-picker-head"><span>Add anchor link</span><button onClick={() => setAdding(null)}><X size={12} /></button></div>
          <button onClick={addAnchor}>Add anchor link</button>
        </div>
      )}

      <div className="nav-list">
        {items.length === 0 && <p className="nav-empty">No navigation items yet.</p>}
        {items.map((item, index) => {
          const page = item.type === 'page' ? pages.find((entry) => entry.id === item.pageId) : null;
          const editing = editingId === item.id;
          return (
            <div key={item.id} className="nav-item" draggable onDragStart={(event) => event.dataTransfer.setData('text/nav-index', String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/nav-index')); if (from === index) return; const next = [...items]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); onChange(next); }}>
              <GripVertical size={13} className="nav-grip" />
              <div className="nav-item-body">
                {editing ? (
                  <input className="nav-edit-input" value={item.label} autoFocus onChange={(event) => updateItem(item.id, { label: event.target.value })} onBlur={() => setEditingId(null)} onKeyDown={(event) => { if (event.key === 'Enter') setEditingId(null); }} />
                ) : (
                  <button className="nav-item-label" onClick={() => setEditingId(item.id)} title="Click to edit label">
                    {item.type === 'page' ? <Link size={12} /> : item.type === 'external' ? <ExternalLink size={12} /> : <Hash size={12} />}
                    <span>{item.label}</span>
                    {page && <em>{page.slug}</em>}
                  </button>
                )}
                <div className="nav-item-controls">
                  {item.type === 'external' && (
                    <input className="nav-url-input" value={item.url} placeholder="https://…" onChange={(event) => updateItem(item.id, { url: event.target.value })} />
                  )}
                  {item.type === 'anchor' && (
                    <input className="nav-url-input" value={item.anchor} placeholder="#section" onChange={(event) => updateItem(item.id, { anchor: event.target.value })} />
                  )}
                  <button className={item.newTab ? 'on' : ''} title="Open in new tab" onClick={() => updateItem(item.id, { newTab: !item.newTab })}><ExternalLink size={12} /></button>
                  <button className={item.isButton ? 'on' : ''} title="Button-style CTA" onClick={() => updateItem(item.id, { isButton: !item.isButton })}><span className="nav-cta-dot" />CTA</button>
                </div>
              </div>
              <div className="nav-item-reorder">
                <button disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ChevronUp size={13} /></button>
                <button disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ChevronDown size={13} /></button>
                <button className="danger" onClick={() => removeItem(item.id)} aria-label="Remove"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}