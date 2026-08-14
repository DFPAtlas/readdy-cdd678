import { useState } from 'react';
import {
  ChevronRight, ChevronDown, Eye, EyeOff, Lock, Search,
  FileText, LayoutGrid, Layers as LayersIcon, FolderTree,
  Image as ImageIcon, Box, Plus, Download, PanelLeftClose,
  Puzzle, Database, User, PanelLeft,
} from 'lucide-react';
import { useSandboxStore } from '@/stores/sandboxStore';
import { useToast } from '@/components/ui/Toast';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  demoPages, demoSections, demoComponents, demoLayers,
  demoFiles, demoAssets,
} from '@/services/mock/sandboxMock';

const RAIL_ITEMS = [
  { id: 'features', label: 'Features', icon: Puzzle },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'components', label: 'Components', icon: Box },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'auth', label: 'Auth', icon: User },
];

export function LeftProjectPanel() {
  const { leftPanelOpen, toggleLeftPanel, activeLeftTab, setActiveLeftTab } = useSandboxStore();
  const toast = useToast();

  const activeSection = RAIL_ITEMS.find((r) => r.id === activeLeftTab)?.id || 'features';

  return (
    <div className="flex h-full"
    >
      {/* Rail */}
      <nav className="w-[72px] flex-shrink-0 flex flex-col items-stretch py-2 gap-1.5 border-r border-forge-border-subtle bg-forge-sidebar"
      >
        {/* Toggle */}
        <button
          onClick={toggleLeftPanel}
          className="min-h-[40px] grid place-items-center rounded-[11px] border border-transparent text-forge-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          {leftPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>


        {/* Rail Items */}
        {RAIL_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveLeftTab(item.id as typeof activeLeftTab);
              if (!leftPanelOpen) toggleLeftPanel();
            }}
            className={`min-h-[48px] grid place-items-center gap-0.5 rounded-[11px] border text-[10px] transition-colors cursor-pointer ${
              activeSection === item.id
                ? 'text-white border-forge-amber/40 bg-[linear-gradient(145deg,rgba(251,191,36,0.22),rgba(251,191,36,0.08))]'
                : 'text-forge-text-muted border-transparent bg-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="h-[19px] w-[19px]" />
            <span className="leading-none">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Drawer */}
      <div
        className={`flex flex-col bg-[rgba(10,14,18,0.98)] border-r border-forge-border-subtle overflow-hidden transition-all duration-300 ${
          leftPanelOpen ? 'w-[250px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        {leftPanelOpen && (
          <>
            {/* Project Info Card */}
            <div className="mx-3 mt-3 p-3 rounded-xl border border-forge-border-subtle bg-[linear-gradient(145deg,rgba(22,27,33,0.98),rgba(9,12,16,0.98))]"
            >
              <strong className="block text-[13px] font-bold mb-2">Forge.space</strong>
              <div className="flex justify-between gap-2 text-[10px] text-forge-text-muted"
              >
                <span>Tier: Pro</span>
                <span>Pages: 5</span>
              </div>
              <div className="flex justify-between gap-2 text-[10px] text-forge-text-muted mt-1"
              >
                <span>Credits: 1,240</span>
                <span>Storage: 82%</span>
              </div>
              <div className="h-[5px] bg-[#1c2845] rounded-full overflow-hidden mt-2"
              >
                <span className="block h-full w-[62%] rounded-full bg-forge-amber"
                />
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex items-center h-9 px-2 gap-0.5 border-b border-forge-border-subtle flex-shrink-0 mt-2"
            >
              {[FileText, LayoutGrid, LayersIcon, FolderTree, ImageIcon].map((Icon, i) => (
                <button
                  key={i}
                  className="h-7 w-7 flex items-center justify-center rounded-md transition-colors text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2"
            >
              <LeftPanelContent tab={activeLeftTab} />
            </div>

            {/* Quick Actions */}
            <div className="border-t border-forge-border-subtle p-2 space-y-0.5 flex-shrink-0"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted px-1 mb-1"
              >Quick Actions</div>
              <QuickAction icon={Plus} label="New Page" onClick={() => toast.show('New Page — coming soon')} />
              <QuickAction icon={LayoutGrid} label="New Section" onClick={() => toast.show('New Section — coming soon')} />
              <QuickAction icon={Box} label="New Component" onClick={() => toast.show('New Component — coming soon')} />
              <QuickAction icon={Download} label="Import Template" onClick={() => toast.show('Import — coming soon')} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LeftPanelContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'pages': return <PagesTab />;
    case 'features': return <FeaturesTab />;
    case 'components': return <ComponentsTab />;
    case 'data': return <DataTab />;
    case 'auth': return <AuthTab />;
    default: return <FeaturesTab />;
  }
}

function FeaturesTab() {
  const toast = useToast();
  const [selected, setSelected] = useState('blog');

  const features = [
    { id: 'blog', label: 'Blog System', icon: FileText, desc: 'Add articles, categories, and tags to your project.' },
    { id: 'cms', label: 'CMS Integration', icon: Database, desc: 'Connect headless CMS for dynamic content.' },
    { id: 'seo', label: 'SEO Tools', icon: Search, desc: 'Auto-generate meta tags and sitemaps.' },
    { id: 'auth', label: 'Auth System', icon: User, desc: 'Enable login, signup, and protected routes.' },
  ];

  return (
    <div className="space-y-1"
    >
      <input
        type="text"
        placeholder="Search features..."
        className="w-full text-white border border-forge-border-subtle bg-[rgba(4,10,23,0.85)] rounded-lg px-3 py-2.5 text-xs outline-none mb-3"
      />

      <div className="text-[10px] font-extrabold text-[#8D959E] uppercase tracking-[0.11em] mb-2 px-1"
      >Core Features</div>

      {features.map((f) => (
        <button
          key={f.id}
          onClick={() => {
            setSelected(f.id);
            toast.show(`${f.label} — coming soon`);
          }}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
            selected === f.id
              ? 'bg-forge-amber/12 text-white'
              : 'text-[#D7DCE1] hover:bg-forge-amber/12 hover:text-white'
          }`}
        >
          <f.icon className="h-4 w-4 text-forge-text-muted flex-shrink-0" />
          <span className="truncate">{f.label}</span>
        </button>
      ))}

      <p className="text-[12px] text-forge-text-muted leading-[1.45] mt-2 px-1"
      >
        Select a feature to add it to your project.
      </p>
    </div>
  );
}

function PagesTab() {
  return (
    <div className="space-y-0.5"
    >
      <div className="flex items-center gap-1.5 px-1 mb-1"
      >
        <Search className="h-3 w-3 text-forge-text-muted" />
        <input
          type="text"
          placeholder="Search pages..."
          className="flex-1 bg-transparent text-xs text-forge-text-primary placeholder:text-forge-text-muted outline-none"
        />
      </div>
      {demoPages.map((p) => (
        <button
          key={p.id}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
            p.active
              ? 'bg-forge-hover text-forge-text-primary'
              : 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
          }`}
        >
          <FileText className="h-3 w-3 text-forge-text-muted flex-shrink-0" />
          <span className="truncate">{p.name}</span>
          {p.active && <span className="ml-auto text-[10px] text-forge-amber">●</span>}
        </button>
      ))}
    </div>
  );
}

function ComponentsTab() {
  return (
    <div className="space-y-0.5"
    >
      {demoComponents.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-forge-text-secondary hover:bg-forge-hover transition-colors"
        >
          <Box className="h-3 w-3 text-forge-text-muted flex-shrink-0" />
          <span className="truncate flex-1">{c.name}</span>
          {c.reusable && (
            <span className="text-[10px] px-1 rounded bg-forge-amber/10 text-forge-amber"
            >Reusable</span>
          )}
        </div>
      ))}
    </div>
  );
}

function DataTab() {
  const toast = useToast();
  return (
    <div className="space-y-1"
    >
      <div className="text-[10px] font-extrabold text-[#8D959E] uppercase tracking-[0.11em] mb-2 px-1"
      >Database</div>
      {['Users', 'Products', 'Orders', 'Content'].map((item) => (
        <button
          key={item}
          onClick={() => toast.show(`${item} — coming soon`)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-[#D7DCE1] hover:bg-forge-amber/12 hover:text-white transition-colors text-left cursor-pointer"
        >
          <Database className="h-3 w-3 text-forge-text-muted flex-shrink-0" />
          {item}
        </button>
      ))}
    </div>
  );
}

function AuthTab() {
  const toast = useToast();
  return (
    <div className="space-y-1"
    >
      <div className="text-[10px] font-extrabold text-[#8D959E] uppercase tracking-[0.11em] mb-2 px-1"
      >Authentication</div>
      {['Login', 'Signup', 'Password Reset', 'OAuth'].map((item) => (
        <button
          key={item}
          onClick={() => toast.show(`${item} — coming soon`)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-[#D7DCE1] hover:bg-forge-amber/12 hover:text-white transition-colors text-left cursor-pointer"
        >
          <User className="h-3 w-3 text-forge-text-muted flex-shrink-0" />
          {item}
        </button>
      ))}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors text-left"
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}