import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSystemStore } from '@/stores/index';
import { Tooltip } from '@/components/ui/Tooltip';
import { StatusDot } from '@/components/ui/StatusChip';
import {
  LayoutDashboard, FolderKanban, Copy, Bot, Activity, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { getServiceStatuses } from '@/services/mock/demoData';
import { useEffect } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Projects', path: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
  { label: 'Templates', path: '/templates', icon: <Copy className="h-4 w-4" /> },
  { label: 'Agents', path: '/agents', icon: <Bot className="h-4 w-4" /> },
  { label: 'Activity', path: '/activity', icon: <Activity className="h-4 w-4" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="h-4 w-4" /> },
];

export function Sidebar() {
  const { isExpanded, toggle } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const setHealth = useSystemStore((s) => s.setHealth);

  useEffect(() => {
    const svcs = getServiceStatuses();
    setHealth({
      forgeApi: { status: svcs[0].status, latency: svcs[0].latency, version: svcs[0].version },
      supabase: { status: svcs[1].status, latency: svcs[1].latency, version: svcs[1].version },
      n8n: { status: svcs[2].status, latency: svcs[2].latency, version: svcs[2].version },
      previewManager: { status: svcs[3].status, latency: svcs[3].latency, version: svcs[3].version },
      ollama: { status: svcs[4].status, latency: svcs[4].latency, version: svcs[4].version },
    });
  }, [setHealth]);

  const health = useSystemStore((s) => s.health);

  const systemServices = health
    ? [
        { key: 'forgeApi', label: 'Forge API', status: health.forgeApi.status },
        { key: 'n8n', label: 'n8n', status: health.n8n.status },
        { key: 'supabase', label: 'Supabase', status: health.supabase.status },
        { key: 'previewManager', label: 'Preview', status: health.previewManager.status },
      ]
    : [];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      className="fixed top-topbar left-0 bottom-statusbar bg-forge-sidebar border-r border-forge-border-subtle flex flex-col transition-all duration-200 z-20 overflow-hidden"
      style={{ width: isExpanded ? '220px' : '56px' }}
    >
      {/* Main Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto" role="navigation" aria-label="Main navigation">
        <ul className="space-y-0.5 px-2">
          {mainNav.map((item) => (
            <li key={item.path}>
              <Tooltip content={item.label} position="right">
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 h-8 px-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                    isActive(item.path)
                      ? 'bg-forge-amber/10 text-forge-amber'
                      : 'text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary'
                  }`}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>

        {/* System Status */}
        {isExpanded && (
          <div className="mt-6 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted mb-2 px-1">System Status</p>
            <div className="space-y-1">
              {systemServices.map((svc) => (
                <div key={svc.key} className="flex items-center gap-2 px-2 py-1 text-xs text-forge-text-secondary">
                  <StatusDot status={svc.status} />
                  <span className="truncate">{svc.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-forge-border-subtle p-2">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center h-7 rounded text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  );
}