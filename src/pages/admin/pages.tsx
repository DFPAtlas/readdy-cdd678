import { FlagsTab, MaintenanceTab, AdminsTab, AuditTab, DataTab } from './SettingsSection';
import { SectionTitle } from './components';

export function FeaturesPage() {
  return (
    <div>
      <SectionTitle title="Feature Controls" description="High-risk platform feature flags and maintenance modes. Restricted to platform owners." />
      <FlagsTab />
      <div className="h-8" />
      <MaintenanceTab />
    </div>
  );
}

export function AdminsPage() {
  return (
    <div>
      <SectionTitle title="Admin Team" description="Manage platform admin membership and roles. Restricted to platform owners." />
      <AdminsTab />
    </div>
  );
}

export function AuditPage() {
  return (
    <div>
      <SectionTitle title="Audit Log" description="Server-authorised, append-only trail of every admin action." />
      <AuditTab />
    </div>
  );
}

export function SettingsPage() {
  return (
    <div>
      <SectionTitle title="Owner Settings" description="Platform data governance and critical configuration. Restricted to platform owners." />
      <DataTab />
    </div>
  );
}