import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, ExternalLink, FileText, Home, MoreVertical, Pencil, Plus, Search, Settings, Trash2 } from 'lucide-react';
import type { NavigationItem, SandboxPage } from './sandboxPersistence';
import NavigationManager from './NavigationManager';

type PagesPanelProps = {
  pages: SandboxPage[];
  activePageId: string;
  isDirty: boolean;
  navigation: NavigationItem[];
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onOpenSettings: (page: SandboxPage) => void;
  onDuplicate: (page: SandboxPage) => void;
  onSetHome: (page: SandboxPage) => void;
  onToggleNavigation: (page: SandboxPage) => void;
  onDelete: (page: SandboxPage) => void;
  onMovePage: (pageId: string, direction: -1 | 1) => void;
  onRename: (page: SandboxPage, name: string) => void;
  onCopyUrl: (page: SandboxPage) => void;
  onNavigationChange: (items: NavigationItem[]) => void;
  onNotify: (message: string) => void;
};

export default function PagesPanel(props: PagesPanelProps) {
  const { pages, activePageId, isDirty, navigation } = props;
  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pages;
    return pages.filter((page) => page.name.toLowerCase().includes(term) || page.slug.toLowerCase().includes(term));
  }, [pages, query]);

  const startRename = (page: SandboxPage) => {
    setRenamingId(page.id);
    setRenamingValue(page.name);
    setOpenMenuId(null);
  };

  const commitRename = (page: SandboxPage) => {
    if (renamingValue.trim() && renamingValue.trim() !== page.name) {
      props.onRename(page, renamingValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="pages-panel">
      <div className="pages-panel-tools">
        <label className="search-field">
          <Search size={15} />
          <input placeholder="Search pages…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="pages-add-btn" onClick={props.onCreatePage}><Plus size={14} /> Add page</button>
      </div>

      <div className="pages-list">
        {filtered.map((page, index) => {
          const active = page.id === activePageId;
          const menuOpen = openMenuId === page.id;
          return (
            <div
              key={page.id}
              className={`page-row ${active ? 'active' : ''} ${page.status === 'draft' ? 'draft' : ''}`}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/page-index', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/page-index'));
                if (from === index || Number.isNaN(from)) return;
                props.onMovePage(pages[from].id, from < index ? 1 : -1);
              }}
            >
              <button className="page-row-main" onClick={() => props.onSelectPage(page.id)}>
                <span className="page-row-icon">{page.isHome ? <Home size={15} /> : <FileText size={15} />}</span>
                <span className="page-row-info">
                  {renamingId === page.id ? (
                    <input
                      className="page-row-rename-input"
                      value={renamingValue}
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setRenamingValue(event.target.value)}
                      onBlur={() => commitRename(page)}
                      onKeyDown={(event) => { if (event.key === 'Enter') commitRename(page); if (event.key === 'Escape') setRenamingId(null); }}
                    />
                  ) : (
                    <>
                      <span className="page-row-name">{page.name}{page.isHome && <b className="home-badge">Home</b>}</span>
                      <span className="page-row-meta">
                        <em>{page.slug}</em>
                        {page.status === 'draft' && <i className="draft-chip">Draft</i>}
                        {!page.showInNavigation && <i className="hidden-chip">Hidden</i>}
                        {active && isDirty && <i className="unsaved-chip">Unsaved</i>}
                      </span>
                    </>
                  )}
                </span>
              </button>
              <div className="page-row-actions">
                {!page.isHome && (
                  <>
                    <button title="Move up" disabled={index === 0} onClick={() => props.onMovePage(page.id, -1)}><ChevronUp size={13} /></button>
                    <button title="Move down" disabled={index === pages.length - 1} onClick={() => props.onMovePage(page.id, 1)}><ChevronDown size={13} /></button>
                  </>
                )}
                <button className={menuOpen ? 'open' : ''} title="More actions" onClick={() => setOpenMenuId(menuOpen ? null : page.id)}><MoreVertical size={14} /></button>
                {menuOpen && (
                  <div className="page-menu">
                    <button onClick={() => { setOpenMenuId(null); props.onOpenSettings(page); }}><Settings size={13} /> Page settings</button>
                    <button onClick={() => { setOpenMenuId(null); props.onDuplicate(page); }}><Copy size={13} /> Duplicate</button>
                    {!page.isHome && <button onClick={() => { setOpenMenuId(null); props.onSetHome(page); }}><Home size={13} /> Set as homepage</button>}
                    <button onClick={() => { setOpenMenuId(null); props.onToggleNavigation(page); }}><ExternalLink size={13} /> {page.showInNavigation ? 'Remove from navigation' : 'Add to navigation'}</button>
                    <button onClick={() => { setOpenMenuId(null); startRename(page); }}><Pencil size={13} /> Rename</button>
                    <button onClick={() => { setOpenMenuId(null); props.onCopyUrl(page); }}><Copy size={13} /> Copy URL</button>
                    {!page.isHome && <button className="danger" onClick={() => { setOpenMenuId(null); props.onDelete(page); }}><Trash2 size={13} /> Delete</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NavigationManager items={navigation} pages={pages} onChange={props.onNavigationChange} onNotify={props.onNotify} />
    </div>
  );
}