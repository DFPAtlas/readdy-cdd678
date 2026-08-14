import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSidebarStore } from '@/stores/sidebarStore';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  LayoutDashboard, Code, FileText, Image, Hammer,
  GitBranch, Download, Settings, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const projectNav: NavItem[] = [
  { label: 'Overview', path: 'overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Sandbox', path: 'sandbox', icon: <Code className="h-4 w-4" /> },
  { label: 'Files', path: 'files', icon: <FileText className="h-4 w-4" /> },
  { label: 'Assets', path: 'assets', icon: <Image className="h-4 w-4" /> },
  { label: 'Builds', path: 'builds', icon: <Hammer className="h-4 w-4" /> },
  { label: 'Versions', path: 'versions', icon: <GitBranch className="h-4 w-4" /> },
  { label: 'Exports', path: 'exports', icon: <Download className="h-4 w-4" /> },
  { label: 'Settings', path: 'settings', icon: <Settings className="h-4 w-4" /> },
];

export function ProjectSidebar() {
  const { isExpanded, toggle } = useSidebarStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const isActive = (path: string) => {
    const fullPath = `/projects/${projectId}/${path}`;
    return location.pathname === fullPath || (path === 'overview' && location.pathname === `/projects/${projectId}`);
  };

  return (
    <aside
      className="fixed top-topbar left-0 bottom-statusbar bg-forge-sidebar border-r border-forge-border-subtle flex flex-col transition-all duration-200 z-20 overflow-hidden"
      style={{ width: isExpanded ? '220px' : '56px' }}
    >
      {/* Back to Projects */}
      <div className="px-2 py-2 border-b border-forge-border-subtle">
        <Tooltip content="Back to projects" position="right">
          <button
            onClick={() => navigate('/projects')}
            className="w-full flex items-center gap-2 h-7 px-2 rounded text-xs text-forge-text-muted hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
            {isExpanded && <span className="truncate">Projects</span>}
          </button>
        </Tooltip>
      </div>

      {/* Project Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto" role="navigation" aria-label="Project navigation">
        <ul className="space-y-0.5 px-2">
          {projectNav.map((item) => (
            <li key={item.path}>
              <Tooltip content={item.label} position="right">
                <button
                  onClick={() => navigate(`/projects/${projectId}/${item.path}`)}
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