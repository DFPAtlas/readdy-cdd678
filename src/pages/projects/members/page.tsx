import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, Shield, ShieldCheck, KeyRound, Mail, ListChecks, Lock, Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import type { SiteMember, SiteRole, SiteProfileField, SiteAuthEvent, SiteAuthConfig } from './membersTypes';
import { defaultSiteAuthConfig } from './membersTypes';
import {
  listMembers, listRoles, listProfileFields, listAuthEvents,
  getAuthConfig, saveAuthConfig, currentProjectRole,
} from './membersData';
import { OverviewSection } from './components/OverviewSection';
import { MemberListSection } from './components/MemberListSection';
import { RolesSection } from './components/RolesSection';
import { ProfileFieldsSection } from './components/ProfileFieldsSection';
import { AuthMethodsSection } from './components/AuthMethodsSection';
import { ActivitySection } from './components/ActivitySection';
import { MembersPlaceholder } from './components/MembersPlaceholder';

type SectionKey = 'overview' | 'members' | 'roles' | 'protected-pages' | 'auth-methods' | 'email-templates' | 'profile-fields' | 'security' | 'activity';

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { key: 'members', label: 'Member list', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'roles', label: 'Roles', icon: <Shield className="h-3.5 w-3.5" /> },
  { key: 'protected-pages', label: 'Protected pages', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: 'auth-methods', label: 'Authentication methods', icon: <KeyRound className="h-3.5 w-3.5" /> },
  { key: 'email-templates', label: 'Email templates', icon: <Mail className="h-3.5 w-3.5" /> },
  { key: 'profile-fields', label: 'Profile fields', icon: <ListChecks className="h-3.5 w-3.5" /> },
  { key: 'security', label: 'Security', icon: <Lock className="h-3.5 w-3.5" /> },
  { key: 'activity', label: 'Activity', icon: <Activity className="h-3.5 w-3.5" /> },
];

export default function MembersPage() {
  const { projectId } = useParams();
  const [section, setSection] = useState<SectionKey>('overview');
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [roles, setRoles] = useState<SiteRole[]>([]);
  const [fields, setFields] = useState<SiteProfileField[]>([]);
  const [events, setEvents] = useState<SiteAuthEvent[]>([]);
  const [config, setConfig] = useState<SiteAuthConfig>(defaultSiteAuthConfig());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const canManage = role === 'owner' || role === 'admin';

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    const [m, r, f, cfg, userRole] = await Promise.all([
      listMembers(projectId),
      listRoles(projectId),
      listProfileFields(projectId),
      getAuthConfig(projectId),
      currentProjectRole(projectId),
    ]);
    setMembers(m);
    setRoles(r);
    setFields(f);
    if (cfg) setConfig(cfg);
    setRole(userRole);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const refreshEvents = useCallback(async () => {
    if (!projectId) return;
    setEventsLoading(true);
    setEventsError('');
    const ev = await listAuthEvents(projectId);
    setEvents(ev);
    setEventsLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (section === 'activity') void refreshEvents();
  }, [section, refreshEvents]);

  const persistConfig = useCallback(async (next: SiteAuthConfig) => {
    if (!projectId) return;
    setSavingConfig(true);
    const res = await saveAuthConfig(projectId, next);
    setSavingConfig(false);
    if (res.ok) setConfig(next);
  }, [projectId]);

  const updateConfig = useCallback((patch: Partial<SiteAuthConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleEnabled = (enabled: boolean) => {
    const next = { ...config, enabled };
    setConfig(next);
    void persistConfig(next);
  };

  const counts = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    pending: members.filter((m) => m.status === 'pending').length,
    suspended: members.filter((m) => m.status === 'suspended').length,
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description="Secure sign-up, login, member profiles and protected pages for the sites you build — separate from your Forge collaborators."
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Members' },
        ]}
      />

      <nav className="flex flex-wrap items-center gap-1 mb-5 border-b border-forge-border-subtle" role="navigation" aria-label="Members sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              section === s.key
                ? 'border-forge-amber text-forge-amber'
                : 'border-transparent text-forge-text-muted hover:text-forge-text-primary'
            }`}
            aria-current={section === s.key ? 'page' : undefined}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      {section === 'overview' && (
        <OverviewSection
          config={config}
          counts={counts}
          rolesCount={roles.length}
          fieldsCount={fields.length}
          canManage={canManage}
          saving={savingConfig}
          onToggleEnabled={toggleEnabled}
        />
      )}

      {section === 'members' && (
        <MemberListSection
          projectId={projectId ?? ''}
          members={members}
          roles={roles}
          canManage={canManage}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
      )}

      {section === 'roles' && (
        <RolesSection projectId={projectId ?? ''} roles={roles} canManage={canManage} onRefresh={refresh} />
      )}

      {section === 'profile-fields' && (
        <ProfileFieldsSection projectId={projectId ?? ''} fields={fields} canManage={canManage} onRefresh={refresh} />
      )}

      {section === 'auth-methods' && (
        <AuthMethodsSection
          config={config}
          canManage={canManage}
          saving={savingConfig}
          onConfigChange={updateConfig}
          onSave={() => persistConfig(config)}
        />
      )}

      {section === 'activity' && (
        <ActivitySection events={events} loading={eventsLoading} error={eventsError} onRefresh={refreshEvents} />
      )}

      {(section === 'protected-pages' || section === 'email-templates' || section === 'security') && (
        <MembersPlaceholder section={section} />
      )}
    </div>
  );
}