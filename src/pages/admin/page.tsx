import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminGuard, useAdmin } from './AdminGuard';
import { roleLabel } from './forgeAdmin';
import { OverviewSection } from './OverviewSection';
import { UsersSection } from './UsersSection';
import { BillingSection } from './BillingSection';
import { AiDeploySection } from './AiDeploySection';
import { ModerationSection } from './ModerationSection';
import { IncidentsSection } from './IncidentsSection';
import { SettingsSection } from './SettingsSection';

type SectionKey = 'overview' | 'users' | 'billing' | 'aideploy' | 'moderation' | 'incidents' | 'settings';

const NAV: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
  { key: 'users', label: 'Users & Projects', icon: 'ri-team-line' },
  { key: 'billing', label: 'Billing', icon: 'ri-bank-card-line' },
  { key: 'aideploy', label: 'AI & Deployments', icon: 'ri-robot-line' },
  { key: 'moderation', label: 'Templates & Forms', icon: 'ri-layout-grid-line' },
  { key: 'incidents', label: 'Incidents', icon: 'ri-alert-line' },
  { key: 'settings', label: 'Admin Settings', icon: 'ri-settings-3-line' },
];

function Console() {
  const admin = useAdmin();
  const [active, setActive] = useState<SectionKey>('overview');

  return (
    <div className="min-h-screen flex flex-col bg-forge-bg text-forge-text-primary">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-forge-border-subtle bg-forge-sidebar flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-forge-amber/15 flex items-center justify-center">
            <i className="ri-shield-keyhole-line text-forge-amber text-sm" />
          </div>
          <span className="text-sm font-semibold">Forge Admin</span>
          {admin && (
            <span className="px-2 py-0.5 rounded bg-forge-accent/10 text-forge-accent text-[11px] font-medium capitalize">
              {roleLabel(admin.role)}
            </span>
          )}
        </div>
        <Link to="/dashboard" className="text-xs text-forge-text-muted hover:text-forge-text-primary transition-colors">
          <i className="ri-arrow-left-line mr-1" />Back to Forge
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-forge-border-subtle bg-forge-sidebar overflow-y-auto p-2">
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  active === item.key ? 'bg-forge-hover text-forge-text-primary' : 'text-forge-text-secondary hover:bg-forge-hover/50 hover:text-forge-text-primary'
                }`}
              >
                <i className={`${item.icon} text-base w-5 text-center`} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {active === 'overview' && <OverviewSection />}
            {active === 'users' && <UsersSection />}
            {active === 'billing' && <BillingSection />}
            {active === 'aideploy' && <AiDeploySection />}
            {active === 'moderation' && <ModerationSection />}
            {active === 'incidents' && <IncidentsSection />}
            {active === 'settings' && <SettingsSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ForgeAdminPage() {
  return (
    <AdminGuard>
      <Console />
    </AdminGuard>
  );
}