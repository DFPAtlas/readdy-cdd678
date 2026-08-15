import { getSandboxClient } from '@/pages/projects/sandbox/sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Forge Admin client — transports data to/from the forge-admin
   edge function. No admin logic, permissions or metrics are ever
   computed here; every value is server-authorised and audited.
   ────────────────────────────────────────────────────────────── */

export type AdminRole =
  | 'super_admin' | 'operations_admin' | 'support_admin'
  | 'billing_admin' | 'security_admin' | 'template_moderator';

export const ADMIN_ROLES: { value: AdminRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'operations_admin', label: 'Operations Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'billing_admin', label: 'Billing Admin' },
  { value: 'security_admin', label: 'Security Admin' },
  { value: 'template_moderator', label: 'Template Moderator' },
];

export type AdminInfo = { role: AdminRole; permissions: string[] };

export type DashboardSummary = {
  activeUsers: number;
  activeSubscriptions: number;
  projects: number;
  publishedSites: number;
  deploymentsToday: number;
  failedDeployments: number;
  aiJobs: number;
  aiProviderHealth: { total: number; healthy: number; degraded: number };
  queueDepth: number;
  formDeliveryFailures: number;
  storageBytes: number;
  templateQueue: number;
  securityAlerts: number;
  openIncidents: number;
};

export type HealthService = { status: 'healthy' | 'degraded' | 'down' | 'unknown'; responseTimeMs: number | null; safeError: string | null };
export type HealthResult = { services: Record<string, HealthService>; checkedAt: string };

export type SecurityItem = { key: string; label: string; count: number | null; note: string };

export type UserRow = {
  id: string; email: string | null; displayName: string | null; createdAt: string;
  projectCount: number; plan: string | null; subscriptionStatus: string | null;
  adminRole: string | null; adminActive: boolean;
};

export type ProjectRow = {
  id: string; name: string; slug: string; status: string;
  ownerEmail: string | null; workspaceName: string | null; pageCount: number; createdAt: string;
};

export type ProjectMeta = {
  id: string; name: string; slug: string; status: string; pageCount: number;
  memberCount: number; buildCount: number; deploymentCount: number;
  domainCount: number; formCount: number; aiJobCount: number;
  recentDeployments: { id: string; status: string; environment: string; created_at: string }[];
};

export type BillingEventRow = Record<string, unknown> & { id: string; event_type?: string; processing_status?: string; received_at?: string };

export type AiModel = Record<string, unknown> & { id: string; model_key?: string; enabled?: boolean; routing_priority?: number; capabilities?: unknown; allowed_plans?: unknown };
export type AiProvider = Record<string, unknown> & { id: string; provider_key?: string; status?: string; display_name?: string; last_health_check?: string };
export type AiOverview = { providers: AiProvider[]; models: AiModel[]; queueDepth: number; flags: { flag_key: string; enabled: boolean }[] };

export type DeploymentRow = Record<string, unknown> & { id: string; status?: string; environment?: string; created_at?: string };

export type FormStats = { totalSubmissions: number; deliveryFailures: number; spamCount: number; spamRate: number; fileScanBacklog: number };

export type TemplateRow = Record<string, unknown> & { id: string; name?: string; moderation_status?: string; licence_key?: string; updated_at?: string };

export type FeatureFlag = { id: string; flag_key: string; enabled: boolean; configuration: Record<string, unknown> | null; updated_at: string };

export type Incident = { id: string; severity: string; title: string; affected_services: string[] | null; status: string; incident_lead: string | null; started_at: string; resolved_at: string | null; created_at: string };

export type AdminRecord = { user_id: string; role: AdminRole; permissions: string[] | null; active: boolean; created_at: string };

export type AuditEvent = { id: string; admin_user_id: string; action: string; target_type: string | null; target_id: string | null; reason: string | null; safe_metadata: Record<string, unknown> | null; created_at: string };

export type ReleaseCheck = { key: string; label: string; status: 'verified' | 'unverified'; critical: boolean };
export type ReleaseGate = { result: 'GO' | 'CONDITIONAL GO' | 'NO-GO'; checklist: ReleaseCheck[]; criticalUnverified: number };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function invoke<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, code: 'NO_CLIENT', message: 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.functions.invoke('forge-admin', { body: { action, ...body } });
    if (error) return { ok: false, code: 'INVOKE_ERROR', message: error.message ?? 'Request failed.' };
    const d = data as { code?: string; errorCode?: string; message?: string } & Record<string, unknown>;
    if (!d || d.code !== 'OK') return { ok: false, code: d?.errorCode ?? 'ERROR', message: d?.message ?? 'Request failed.' };
    return { ok: true, data: d as unknown as T };
  } catch (e) {
    return { ok: false, code: 'EXCEPTION', message: e instanceof Error ? e.message : 'Request failed.' };
  }
}

export const adminApi = {
  whoami: () => invoke<{ admin: AdminInfo }>('whoami'),
  dashboard: () => invoke<{ summary: DashboardSummary }>('dashboard'),
  health: () => invoke<HealthResult & { services: Record<string, HealthService>; checkedAt: string }>('health'),
  security: () => invoke<{ items: SecurityItem[]; checkedAt: string }>('security'),

  usersList: (query = '') => invoke<{ users: UserRow[] }>('users.list', { query }),
  suspendUser: (userId: string, reason: string) => invoke('users.suspend', { userId, reason }),
  restoreUser: (userId: string, reason: string) => invoke('users.restore', { userId, reason }),
  revokeSessions: (userId: string, reason: string) => invoke('users.revoke_sessions', { userId, reason }),
  resetPassword: (userId: string) => invoke('users.reset_password', { userId }),
  addNote: (userId: string, note: string) => invoke('users.note', { userId, note }),

  projectsList: () => invoke<{ projects: ProjectRow[] }>('projects.list'),
  projectGet: (projectId: string) => invoke<{ project: ProjectMeta }>('projects.get', { projectId }),
  supportStart: (projectId: string, reason: string, durationMinutes: number) => invoke<{ session: { id: string; expiresAt: string }; message: string }>('support.start', { projectId, reason, durationMinutes }),
  supportEnd: (sessionId: string) => invoke('support.end', { sessionId }),

  billingList: () => invoke<{ subscriptions: Record<string, unknown>[] }>('billing.list'),
  billingEvents: () => invoke<{ events: BillingEventRow[] }>('billing.events'),
  billingReplay: (eventId: string) => invoke('billing.replay', { eventId }),
  billingRefresh: (userId: string) => invoke('billing.refresh', { userId }),
  grantCredits: (userId: string, credits: number, reason: string) => invoke('billing.grant_credits', { userId, credits, reason }),

  aiOverview: () => invoke<AiOverview>('ai.overview'),
  aiSetModel: (modelId: string, enabled: boolean) => invoke('ai.set_model', { modelId, enabled }),
  aiSetProvider: (providerId: string, status: string) => invoke('ai.set_provider', { providerId, status }),
  aiSetRouting: (modelId: string, priority: number) => invoke('ai.set_routing', { modelId, priority }),
  aiToggleFlag: (flagKey: string, enabled: boolean) => invoke('ai.toggle_flag', { flagKey, enabled }),

  deploymentsList: () => invoke<{ deployments: DeploymentRow[]; flags: { flag_key: string; enabled: boolean }[] }>('deployments.list'),
  deploymentsToggleFlag: (flagKey: string, enabled: boolean) => invoke('deployments.toggle_flag', { flagKey, enabled }),
  deploymentAction: (op: 'retry' | 'cancel' | 'rollback', deploymentId: string, reason: string) => invoke(`deployments.${op}`, { deploymentId, reason }),

  formsStats: () => invoke<{ stats: FormStats }>('forms.stats'),
  templatesQueue: () => invoke<{ templates: TemplateRow[] }>('templates.queue'),
  templatesModerate: (templateId: string, status: string, reason: string) => invoke('templates.moderate', { templateId, status, reason }),

  flagsList: () => invoke<{ flags: FeatureFlag[] }>('flags.list'),
  flagsSet: (flagKey: string, enabled: boolean, reason: string, configuration?: Record<string, unknown>) => invoke('flags.set', { flagKey, enabled, reason, configuration }),
  maintenanceGet: () => invoke<{ modes: FeatureFlag[] }>('maintenance.get'),
  maintenanceSet: (scope: string, enabled: boolean, reason: string) => invoke('maintenance.set', { scope, enabled, reason }),

  incidentsList: () => invoke<{ incidents: Incident[] }>('incidents.list'),
  incidentsCreate: (severity: string, title: string, affectedServices: string[]) => invoke<{ incident: Incident; message: string }>('incidents.create', { severity, title, affectedServices }),
  incidentsUpdate: (incidentId: string, status: string, message: string) => invoke('incidents.update', { incidentId, status, message }),

  dataExport: (userId: string, reason: string) => invoke<{ affected: { projects: number; subscriptions: number } }>('data.export', { userId, reason }),
  dataDelete: (userId: string, reason: string, confirm: boolean) => invoke<{ affected: { projects: number; subscriptions: number } }>('data.delete', { userId, reason, confirm }),

  releaseGate: () => invoke<ReleaseGate>('release.gate'),
  adminsList: () => invoke<{ admins: AdminRecord[] }>('admins.list'),
  adminsSet: (userId: string, role: AdminRole, active: boolean, reason: string) => invoke('admins.set', { userId, role, active, reason }),
  auditList: () => invoke<{ events: AuditEvent[] }>('audit.list'),
};

export function roleLabel(role: string | null | undefined): string {
  return ADMIN_ROLES.find((r) => r.value === role)?.label ?? (role ?? '—');
}