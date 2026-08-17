import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, Bell, Moon, Sun, Activity,
  ChevronDown, Zap, HardDrive, CircleDot, HelpCircle, Settings as SettingsIcon
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useWorkspaceStore, useProjectStore, useCommandPaletteStore, useSystemStore, useNotificationStore } from '@/stores/index';
import { StatusDot } from '@/components/ui/StatusChip';
import { SaveStatus } from '@/components/ui/SaveStatus';
import { DropdownMenu, DropdownItem, DropdownDivider, DropdownLabel } from '@/components/ui/DropdownMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { NotificationsPopover } from '@/components/feature/NotificationsPopover';
import { demoProjects } from '@/services/mock/demoData';
import { KeyboardShortcut } from '@/components/ui/KeyboardShortcut';

interface TopBarProps {
  compact?: boolean;
}

export function TopBar({ compact }: TopBarProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { effectiveTheme, setTheme } = useThemeStore();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeProject = useProjectStore((s) => s.activeProject);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  const health = useSystemStore((s) => s.health);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const project = projectId ? demoProjects.find((p) => p.id === projectId) : activeProject;

  const getOverallStatus = (): 'online' | 'degraded' | 'offline' => {
    if (!health) return 'online';
    const statuses = [health.forgeApi.status, health.supabase.status, health.n8n.status, health.previewManager.status, health.ollama.status];
    if (statuses.includes('offline')) return 'offline';
    if (statuses.includes('degraded')) return 'degraded';
    return 'online';
  };

  if (compact) {
    return (
      <header className="h-topbar flex-shrink-0 bg-forge-sidebar border-b border-forge-border-subtle flex items-center px-3 gap-2">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-forge-text-primary hover:text-forge-amber transition-colors">
          <Zap className="h-4 w-4 text-forge-amber" />
          <span className="text-sm font-semibold tracking-tight">FORGE</span>
        </button>

        {project && (
          <>
            <button className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded text-xs text-forge-text-primary font-medium hover:bg-forge-hover transition-colors">
              <span className="max-w-[140px] truncate">{project.name}</span>
              <ChevronDown className="h-3 w-3 text-forge-text-muted" />
            </button>
            <button className="hidden md:flex items-center gap-1 h-7 px-2 rounded text-xs text-forge-text-secondary hover:bg-forge-hover transition-colors">
              v0.8.0
              <ChevronDown className="h-3 w-3 text-forge-text-muted" />
            </button>
            <button className="hidden lg:flex items-center gap-1 h-7 px-2 rounded text-xs text-forge-text-secondary hover:bg-forge-hover transition-colors">
              Preview
              <ChevronDown className="h-3 w-3 text-forge-text-muted" />
            </button>
          </>
        )}

        <div className="flex-1" />

        <Tooltip content="Command palette (Ctrl+K)">
          <button
            onClick={openCommandPalette}
            className="h-7 px-2 flex items-center gap-1.5 rounded text-xs text-forge-text-muted bg-forge-bg border border-forge-border hover:text-forge-text-primary transition-colors"
          >
            <Search className="h-3 w-3" />
            <KeyboardShortcut keys={['Ctrl', 'K']} />
          </button>
        </Tooltip>

        <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-forge-success">
          <CircleDot className="h-2.5 w-2.5" /> Build Ready
        </span>

        <NotificationsPopover
          trigger={
            <Tooltip content="Notifications">
              <button className="relative h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
                <Bell className="h-3.5 w-3.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-forge-amber" />
                )}
              </button>
            </Tooltip>
          }
          projectId={projectId}
          projectName={project?.name}
        />

        <Tooltip content="Help">
          <button className="h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <Tooltip content="Settings">
          <button onClick={() => navigate('/settings')} className="h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
            <SettingsIcon className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        <button className="flex items-center gap-1.5 h-7 px-1.5 rounded hover:bg-forge-hover transition-colors">
          <div className="h-5 w-5 rounded-full bg-forge-amber flex items-center justify-center text-[10px] font-medium text-forge-text-inverse">
            JD
          </div>
        </button>
      </header>
    );
  }

  return (
    <header className="h-topbar flex-shrink-0 bg-forge-sidebar border-b border-forge-border-subtle flex items-center px-4 gap-3 z-30">
      {/* Logo */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-forge-text-primary hover:text-forge-amber transition-colors flex-shrink-0"
      >
        <Zap className="h-4 w-4 text-forge-amber" />
        <span className="text-sm font-semibold tracking-tight">FORGE</span>
      </button>

      {/* Workspace Selector */}
      {workspace && (
        <DropdownMenu
          align="left"
          trigger={
            <button className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-forge-text-secondary hover:bg-forge-hover hover:text-forge-text-primary transition-colors flex-shrink-0">
              <HardDrive className="h-3 w-3 text-forge-text-muted" />
              <span className="max-w-[100px] truncate">{workspace.name}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          }
        >
          <DropdownLabel>{workspace.name}</DropdownLabel>
          <DropdownItem onClick={() => navigate('/dashboard')}>Dashboard</DropdownItem>
          <DropdownItem onClick={() => navigate('/projects')}>Projects</DropdownItem>
          <DropdownItem onClick={() => navigate('/templates')}>Templates</DropdownItem>
          <DropdownItem onClick={() => {
            const sandboxId = projectId || demoProjects[0]?.id;
            if (sandboxId) navigate(`/projects/${sandboxId}/sandbox`);
          }}>Sandbox</DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={() => navigate('/settings')}>Workspace Settings</DropdownItem>
        </DropdownMenu>
      )}

      {/* Project Selector */}
      {project && (
        <>
          <span className="text-forge-text-muted text-xs">/</span>
          <Tooltip content={project.name}>
            <button className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-forge-text-primary font-medium hover:bg-forge-hover transition-colors flex-shrink-0">
              <span className="max-w-[140px] truncate">{project.name}</span>
              <ChevronDown className="h-3 w-3 text-forge-text-muted" />
            </button>
          </Tooltip>
          <SaveStatus state="idle" className="flex-shrink-0" />
        </>
      )}

      <div className="flex-1" />

      {/* Command Palette Trigger */}
      <Tooltip content="Command palette (Ctrl+K)">
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-2 h-7 px-2 rounded text-xs text-forge-text-muted bg-forge-bg border border-forge-border hover:border-forge-border hover:text-forge-text-primary transition-colors"
        >
          <Search className="h-3 w-3" />
          <span className="hidden lg:inline">Search...</span>
          <KeyboardShortcut keys={['Ctrl', 'K']} />
        </button>
      </Tooltip>

      {/* System Health */}
      <Tooltip content="System status">
        <button
          onClick={() => navigate('/system/status')}
          className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-forge-text-secondary hover:bg-forge-hover transition-colors"
        >
          <StatusDot status={getOverallStatus()} size="sm" />
          <span className="hidden sm:inline">System</span>
        </button>
      </Tooltip>

      {/* Notifications */}
      <NotificationsPopover
        trigger={
          <Tooltip content="Notifications">
            <button className="relative h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors">
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-forge-amber" />
              )}
            </button>
          </Tooltip>
        }
        projectId={projectId}
        projectName={project?.name}
      />

      {/* Activity */}
      <Tooltip content="Activity">
        <button
          onClick={() => navigate('/activity')}
          className="h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      {/* Theme Toggle */}
      <Tooltip content={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}>
        <button
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="h-7 w-7 flex items-center justify-center rounded text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover transition-colors"
        >
          {effectiveTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </Tooltip>

      {/* User Menu */}
      <DropdownMenu
        trigger={
          <button className="flex items-center gap-1.5 h-7 px-1.5 rounded hover:bg-forge-hover transition-colors">
            <div className="h-5 w-5 rounded-full bg-forge-amber flex items-center justify-center text-[10px] font-medium text-forge-text-inverse">
              MH
            </div>
            <ChevronDown className="h-3 w-3 text-forge-text-muted" />
          </button>
        }
      >
        <DropdownLabel>Morgan Hayes</DropdownLabel>
        <DropdownItem onClick={() => navigate('/settings/profile')}>Profile</DropdownItem>
        <DropdownItem onClick={() => navigate('/settings')}>Settings</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => navigate('/help')}>Help</DropdownItem>
        <DropdownItem onClick={() => {}}>Sign out</DropdownItem>
      </DropdownMenu>
    </header>
  );
}