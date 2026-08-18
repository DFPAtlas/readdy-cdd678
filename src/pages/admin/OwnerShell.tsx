import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAdmin, hasPermission } from './AdminGuard';
import { isOwner, roleLabel } from './forgeAdmin';
import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  perm?: string;
  ownerOnly?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { to: '/forge-admin', label: 'Overview', icon: 'ri-dashboard-line', end: true },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/forge-admin/customers', label: 'Customers', icon: 'ri-user-3-line', perm: 'users.manage' },
      { to: '/forge-admin/projects', label: 'Projects', icon: 'ri-folder-3-line', perm: 'projects.inspect' },
      { to: '/forge-admin/billing', label: 'Subscriptions', icon: 'ri-bank-card-line', perm: 'billing.read' },
      { to: '/forge-admin/usage', label: 'Usage', icon: 'ri-bar-chart-line', perm: 'billing.read' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/forge-admin/ai', label: 'AI', icon: 'ri-robot-line', perm: 'ai.operate' },
      { to: '/forge-admin/integrations', label: 'Integrations', icon: 'ri-plug-line', perm: 'ai.operate' },
      { to: '/forge-admin/agents', label: 'Agents', icon: 'ri-team-line', perm: 'ai.operate' },
      { to: '/forge-admin/builds', label: 'Builds', icon: 'ri-hammer-line', perm: 'dashboard.read' },
      { to: '/forge-admin/templates', label: 'Templates', icon: 'ri-layout-grid-line', perm: 'templates.moderate' },
      { to: '/forge-admin/support', label: 'Support', icon: 'ri-lifebuoy-line', perm: 'support.mode' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/forge-admin/incidents', label: 'Incidents', icon: 'ri-alert-line', perm: 'incidents.manage' },
      { to: '/forge-admin/system', label: 'System Health', icon: 'ri-pulse-line', perm: 'health.read' },
      { to: '/forge-admin/audit', label: 'Audit Log', icon: 'ri-file-list-3-line', perm: 'audit.read' },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/forge-admin/announcements', label: 'Announcements', icon: 'ri-megaphone-line', ownerOnly: true },
      { to: '/forge-admin/features', label: 'Feature Controls', icon: 'ri-toggle-line', perm: 'flags.manage' },
      { to: '/forge-admin/admins', label: 'Admin Team', icon: 'ri-shield-user-line', perm: 'admins.manage' },
      { to: '/forge-admin/settings', label: 'Owner Settings', icon: 'ri-settings-3-line', ownerOnly: true },
    ],
  },
];

export function OwnerShell() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const owner = isOwner(admin);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const client = getSandboxClient();
    if (!client) return;
    client.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const visibleGroups = useMemo(() => {
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.ownerOnly) return owner;
        if (item.perm) return hasPermission(admin, item.perm);
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [admin, owner]);

  const signOut = async () => {
    setSigningOut(true);
    const client = getSandboxClient();
    if (client) await client.auth.signOut().catch(() => {});
    navigate('/forge-admin/login', { state: { signedOut: true } });
  };

  const identity = email ?? (admin ? roleLabel(admin.role) : 'Owner');

  return (
    <div className="min-h-screen flex flex-col bg-forge-bg text-forge-text-primary">
      {/* Header */}
      <header className="px-4 md:px-6 py-3 border-b border-forge-border-subtle bg-forge-sidebar flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden h-8 w-8 rounded-md flex items-center justify-center text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover/50"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <i className="ri-menu-line text-lg" />
            </button>
            <div className="h-9 w-9 rounded bg-forge-amber/15 flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-keyhole-line text-forge-amber text-base" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted">Owner Command Centre</p>
              <h1 className="text-base font-semibold text-forge-text-primary leading-tight whitespace-nowrap">Forge Owner Console</h1>
            </div>
            {admin && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide flex-shrink-0 ${owner ? 'bg-forge-amber/15 text-forge-amber' : 'bg-forge-accent/10 text-forge-accent'}`}>
                {owner ? 'Owner' : roleLabel(admin.role)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-forge-text-muted">
              <i className="ri-user-3-line" />
              <span className="max-w-[180px] truncate">{identity}</span>
            </div>
            <Link to="/dashboard" className="text-xs text-forge-text-muted hover:text-forge-text-primary transition-colors whitespace-nowrap">
              <i className="ri-arrow-left-line mr-1" />Back to Forge
            </Link>
            <button
              onClick={() => void signOut()}
              disabled={signingOut}
              className="text-xs text-forge-text-muted hover:text-forge-error transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <i className="ri-logout-box-r-line mr-1" />{signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-56 flex-shrink-0 border-r border-forge-border-subtle bg-forge-sidebar overflow-y-auto p-2">
          <SidebarNav groups={visibleGroups} onNavigate={() => setMobileOpen(false)} />
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-forge-sidebar border-r border-forge-border-subtle p-2 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-forge-text-muted">Navigation</span>
              <button onClick={() => setMobileOpen(false)} className="h-7 w-7 rounded flex items-center justify-center text-forge-text-muted hover:text-forge-text-primary" aria-label="Close navigation">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <SidebarNav groups={visibleGroups} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate: () => void }) {
  return (
    <nav className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-forge-text-muted">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-forge-hover text-forge-amber' : 'text-forge-text-secondary hover:bg-forge-hover/50 hover:text-forge-text-primary'
                  }`
                }
              >
                <i className={`${item.icon} text-base w-5 text-center`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}