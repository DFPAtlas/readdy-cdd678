import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '@/stores/index';
import { useThemeStore } from '@/stores/themeStore';
import { SearchInput } from '@/components/ui/SearchInput';
import { KeyboardShortcut } from '@/components/ui/KeyboardShortcut';
import {
  LayoutDashboard, FolderKanban, Code, Play, GitBranch,
  Download, Activity, Settings, Moon, Sun, Plus, Zap
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string[];
}

export function CommandPalette() {
  const { isOpen, query, close, setQuery } = useCommandPaletteStore();
  const navigate = useNavigate();
  const { effectiveTheme, setTheme } = useThemeStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(
    () => [
      { id: 'nav-dashboard', label: 'Open Dashboard', group: 'Navigation', icon: <LayoutDashboard className="h-4 w-4" />, action: () => navigate('/dashboard'), shortcut: ['Ctrl', 'D'] },
      { id: 'nav-projects', label: 'Open Projects', group: 'Navigation', icon: <FolderKanban className="h-4 w-4" />, action: () => navigate('/projects') },
      { id: 'nav-system', label: 'Open System Status', group: 'Navigation', icon: <Activity className="h-4 w-4" />, action: () => navigate('/system/status') },
      { id: 'nav-settings', label: 'Open Settings', group: 'Navigation', icon: <Settings className="h-4 w-4" />, action: () => navigate('/settings') },
      { id: 'project-new', label: 'Create New Project', group: 'Projects', icon: <Plus className="h-4 w-4" />, action: () => navigate('/projects/new') },
      { id: 'project-sandbox', label: 'Open Forge Sandbox', group: 'Projects', icon: <Code className="h-4 w-4" />, action: () => { /* Later */ } },
      { id: 'build-start', label: 'Start Preview', group: 'Build', icon: <Play className="h-4 w-4" />, action: () => {} },
      { id: 'version-checkpoint', label: 'Create Checkpoint', group: 'Versions', icon: <GitBranch className="h-4 w-4" />, action: () => {} },
      { id: 'export-current', label: 'Export Current Version', group: 'Exports', icon: <Download className="h-4 w-4" />, action: () => {} },
      { id: 'theme-toggle', label: 'Toggle Theme', group: 'Settings', icon: effectiveTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: () => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark'), shortcut: ['Ctrl', 'T'] },
    ],
    [navigate, effectiveTheme, setTheme]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, filtered, selectedIndex, close]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const store = useCommandPaletteStore.getState();
        store.toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!isOpen) return null;

  const groups = new Map<string, Command[]>();
  filtered.forEach((c) => {
    const existing = groups.get(c.group) || [];
    existing.push(c);
    groups.set(c.group, existing);
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative w-full max-w-lg mx-4 bg-forge-panel-elevated border border-forge-border rounded-xl shadow-lg overflow-hidden">
        <div className="p-3 border-b border-forge-border-subtle">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            placeholder="Type a command or search..."
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {Array.from(groups.entries()).map(([group, cmds]) => (
            <div key={group}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted">
                {group}
              </div>
              {cmds.map((cmd, i) => {
                const globalIndex = filtered.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); close(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-forge-amber/10 text-forge-amber'
                        : 'text-forge-text-secondary hover:bg-forge-hover'
                    }`}
                  >
                    <span className="flex-shrink-0">{cmd.icon}</span>
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {cmd.shortcut && <KeyboardShortcut keys={cmd.shortcut} />}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-forge-text-muted">
              No commands found for "{query}"
            </div>
          )}
        </div>
        <div className="px-3 py-2 border-t border-forge-border-subtle flex items-center justify-between text-[10px] text-forge-text-muted">
          <span>Use <kbd className="px-1 rounded bg-forge-border">↑</kbd> <kbd className="px-1 rounded bg-forge-border">↓</kbd> to navigate</span>
          <span><kbd className="px-1 rounded bg-forge-border">Enter</kbd> to select · <kbd className="px-1 rounded bg-forge-border">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}