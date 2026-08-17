import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { User, Palette, Cpu, Settings2, CreditCard } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/settings/profile', label: 'Profile', icon: User },
  { to: '/settings/appearance', label: 'Appearance', icon: Palette },
  { to: '/settings/providers', label: 'AI Providers', icon: Cpu },
  { to: '/settings/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings/system', label: 'System', icon: Settings2 },
];

export default function SettingsLayout() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your Forge account, interface and workspace configuration."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <nav
          aria-label="Settings navigation"
          className="flex lg:flex-col gap-1 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:w-48 lg:flex-shrink-0"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 h-8 px-3 rounded-md text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                    isActive
                      ? 'bg-forge-hover text-forge-amber'
                      : 'text-forge-text-secondary hover:text-forge-text-primary hover:bg-forge-hover'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  );
}