import { useMemo, useState } from 'react';
import {
  Boxes, Copy, Download, GitBranch, Grid2X2, Layers, List, MoreVertical,
  Pencil, Plus, Puzzle, Search, Trash2,
} from 'lucide-react';
import type { ComponentDefinition, SandboxPage } from './sandboxPersistence';
import { BUILT_IN_COMPONENTS, componentInstanceCount } from './sandboxComponents';

type ComponentsPanelProps = {
  components: ComponentDefinition[];
  pages: SandboxPage[];
  onAddToCanvas: (componentId: string) => void;
  onEditMaster: (componentId: string) => void;
  onRename: (componentId: string, name: string) => void;
  onDuplicate: (componentId: string) => void;
  onCreateVariant: (componentId: string) => void;
  onDelete: (componentId: string) => void;
  onExport: (componentId: string) => void;
  onCreateComponent: () => void;
  onNotify: (message: string) => void;
};

const CATEGORY_ICONS: Record<string, typeof Puzzle> = {
  Navigation: Layers, Hero: Boxes, Content: List, Features: Grid2X2, CTA: GitBranch,
  Forms: List, Testimonials: GitBranch, Pricing: Grid2X2, Galleries: Grid2X2, Footers: Layers, Custom: Puzzle,
};

export default function ComponentsPanel(props: ComponentsPanelProps) {
  const { components, pages } = props;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ComponentDefinition['category']>('All');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const all = useMemo(() => [...components, ...BUILT_IN_COMPONENTS], [components]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return all.filter((component) => {
      if (category !== 'All' && component.category !== category) return false;
      if (term && !component.name.toLowerCase().includes(term) && !component.description.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, query, category]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(all.map((component) => component.category)))], [all]);

  const startRename = (component: ComponentDefinition) => {
    setRenamingId(component.id);
    setRenamingValue(component.name);
    setMenuId(null);
  };

  const commitRename = (component: ComponentDefinition) => {
    if (renamingValue.trim() && renamingValue.trim() !== component.name) props.onRename(component.id, renamingValue.trim());
    setRenamingId(null);
  };

  const startDrag = (event: React.DragEvent, componentId: string) => {
    event.dataTransfer.setData('text/forge-component', componentId);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="components-panel">
      <div className="components-tools">
        <label className="search-field">
          <Search size={15} />
          <input placeholder="Search components…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="pages-add-btn" onClick={props.onCreateComponent}><Plus size={14} /> Create</button>
      </div>

      <div className="asset-view-toggle components-view-toggle">
        <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Grid2X2 size={14} /></button>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={14} /></button>
      </div>

      <div className="asset-filters components-filters">
        {categories.map((entry) => (
          <button key={entry} className={category === entry ? 'active' : ''} onClick={() => setCategory(entry)}>{entry}</button>
        ))}
      </div>

      <div className={view === 'grid' ? 'components-grid' : 'components-list'}>
        {filtered.map((component) => {
          const Icon = CATEGORY_ICONS[component.category] ?? Puzzle;
          const count = componentInstanceCount(component.id, pages);
          const menuOpen = menuId === component.id;
          return (
            <div
              key={component.id}
              className={`component-card ${view === 'list' ? 'row' : ''} ${count > 0 ? 'used' : ''}`}
              draggable
              onDragStart={(event) => startDrag(event, component.id)}
            >
              <div className="component-thumb">
                <Icon size={26} strokeWidth={1.5} />
              </div>
              <div className="component-card-body">
                {renamingId === component.id ? (
                  <input
                    className="component-rename-input"
                    value={renamingValue}
                    autoFocus
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setRenamingValue(event.target.value)}
                    onBlur={() => commitRename(component)}
                    onKeyDown={(event) => { if (event.key === 'Enter') commitRename(component); if (event.key === 'Escape') setRenamingId(null); }}
                  />
                ) : (
                  <span className="component-name">{component.name}</span>
                )}
                <span className="component-sub">
                  {component.category}
                  {component.builtIn ? <i className="component-builtin-badge">Built-in</i> : <i className="component-project-badge">Project</i>}
                  {count > 0 && <i className="component-count-badge">{count} linked</i>}
                </span>
              </div>
              <div className="component-card-actions">
                <button title="Add to canvas" onClick={() => props.onAddToCanvas(component.id)}><Plus size={14} /></button>
                <button className={menuOpen ? 'open' : ''} title="More actions" onClick={() => setMenuId(menuOpen ? null : component.id)}><MoreVertical size={14} /></button>
                {menuOpen && (
                  <div className="component-menu">
                    {!component.builtIn && <button onClick={() => { setMenuId(null); props.onEditMaster(component.id); }}><Pencil size={13} /> Edit master</button>}
                    {!component.builtIn && <button onClick={() => { setMenuId(null); startRename(component); }}><Pencil size={13} /> Rename</button>}
                    {!component.builtIn && <button onClick={() => { setMenuId(null); props.onDuplicate(component.id); }}><Copy size={13} /> Duplicate</button>}
                    {!component.builtIn && <button onClick={() => { setMenuId(null); props.onCreateVariant(component.id); }}><GitBranch size={13} /> Create variant</button>}
                    <button onClick={() => { setMenuId(null); props.onExport(component.id); }}><Download size={13} /> Export</button>
                    {!component.builtIn && <button className="danger" onClick={() => { setMenuId(null); props.onDelete(component.id); }}><Trash2 size={13} /> Delete</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="asset-state"><Boxes size={28} /><strong>No components</strong><span>Create a component from a canvas selection, or use a built-in starter.</span></div>
        )}
      </div>
    </div>
  );
}