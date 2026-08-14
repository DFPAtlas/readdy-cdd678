import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Outlet } from 'react-router-dom';
import { User, Palette, Cpu, Settings2 } from 'lucide-react';

export default function SettingsLayout() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your Forge workspace configuration"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />
      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0 space-y-0.5" aria-label="Settings navigation">
          {[
            { path: '/settings/profile', label: 'Profile', icon: <User className="h-3.5 w-3.5" /> },
            { path: '/settings/appearance', label: 'Appearance', icon: <Palette className="h-3.5 w-3.5" /> },
            { path: '/settings/providers', label: 'Providers', icon: <Cpu className="h-3.5 w-3.5" /> },
            { path: '/settings/system', label: 'System', icon: <Settings2 className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <Link key={item.path} to={item.path}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  );
}