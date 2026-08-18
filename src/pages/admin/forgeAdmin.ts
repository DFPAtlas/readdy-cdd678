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

export function isOwner(admin: AdminInfo | null | undefined): boolean {
  return admin?.role === 'super_admin';
}

export type OwnerBusiness = {
  customers: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  trialingSubscriptions: number;
  scheduledCancellations: number;
  activeProjects: number;
  buildsToday: number;
  aiJobsQueued: number;
  failedBuilds: number;
  mrr: { status: 'available' | 'unavailable'; value: number | null; reason: string };
};

export type OwnerSnapshot = { business: OwnerBusiness; usage: { aiLedger24h: number; aiLedgerTotal: number }; checkedAt: string };

export type ActivityFeedItem = { id: string; type: string; title: string; detail: string; at: string | null };

export type SupportSessionRow = { id: string; admin_user_id: string; project_id: string; reason: string | null; status: string; scope: string | null; expires_at: string | null; created_at: string };

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
  failedBuilds: number;
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

/* ── Customers ── */
export type CustomerSummary = { totalAccounts: number; activePaid: number; trialing: number; pastDue: number; newThisMonth: number };

export type CustomerRow = {
  id: string; email: string | null; displayName: string | null; createdAt: string;
  plan: string | null; subscriptionStatus: string | null; billingInterval: string | null;
  projectCount: number; lastActivity: string | null; adminRole: string | null; adminActive: boolean;
};

export type CustomerDetail = {
  account: { id: string; email: string | null; displayName: string | null; createdAt: string };
  subscription: { planKey: string | null; status: string | null; billingInterval: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean | null; trialEnd: string | null; stripeCustomerId: string | null } | null;
  projects: { id: string; name: string; slug: string; status: string; pageCount: number; createdAt: string; updatedAt: string }[];
  usage: { aiRequests: number; aiCredits: number; aiTokens: number; aiCostMicros: number; storageBytes: number; periodStart: string };
  supportNotes: { reason: string | null; createdAt: string }[];
  recentBuilds: { id: string; projectId: string; status: string; completedAt: string | null }[];
};

/* ── Projects ── */
export type ProjectSummary = { totalProjects: number; activeProjects: number; failedBuilds: number; recentProjects: number };

export type AdminProjectRow = {
  id: string; name: string; slug: string; status: string;
  ownerEmail: string | null; ownerName: string | null; workspaceName: string | null;
  pageCount: number; createdAt: string; updatedAt: string;
  latestBuildStatus: string | null; plan: string | null; subscriptionStatus: string | null; storageBytes: number;
};

export type AdminProjectDetail = {
  id: string; name: string; slug: string; status: string; pageCount: number; createdAt: string; updatedAt: string;
  workspaceName: string | null;
  owner: { id: string | null; email: string | null; displayName: string | null; plan: string | null; subscriptionStatus: string | null };
  memberCount: number; members: { userId: string; role: string; status: string; email: string | null; displayName: string | null }[];
  buildCount: number; latestBuild: { id: string; status: string; version: string | null; completedAt: string | null } | null;
  deploymentCount: number; domainCount: number; formCount: number; aiJobCount: number; storageBytes: number;
  recentDeployments: { id: string; status: string; environment: string; created_at: string }[];
  recentIssues: { kind: string; id: string; status: string; at: string | null }[];
};

/* ── Billing ── */
export type BillingSummary = {
  mrr: number; activeSubscriptions: number; trialing: number; pastDue: number; cancellations: number; failedPayments: number;
  pricingSource: string; calculatedAt: string;
};

export type BillingSubRow = {
  id: string; userId: string; planKey: string; status: string; billingInterval: string | null;
  currentPeriodStart: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean | null; trialEnd: string | null;
  stripeSubscriptionId: string | null; stripeCustomerId: string | null; createdAt: string; updatedAt: string;
  customerEmail: string | null; customerName: string | null; amount: number; monthlyAmount: number;
};

export type PaymentProblem = {
  kind: string; id: string; userId?: string; customerEmail?: string | null; customerName?: string | null;
  planKey?: string; amount?: number; status?: string; at: string | null; detail: string; eventType?: string;
};

/* ── Usage ── */
export type UsageSummary = {
  aiRequests: number; aiTokens: number; aiCredits: number; aiCostMicros: number; hasCostData: boolean;
  builds: number; exports: number; storageBytes: number; workflowRuns: number; aiJobs: number;
  periodStart: string; periodDays: number;
};

export type UsageCustomerRow = {
  userId: string; email: string | null; displayName: string | null; plan: string; subscriptionStatus: string | null;
  aiCredits: number; aiCreditLimit: number | null; builds: number; storageBytes: number; storageLimitMb: number | null; projects: number;
};

export type BuildRow = {
  id: string;
  projectId: string;
  projectName: string | null;
  ownerEmail: string | null;
  status: string;
  buildNumber: number | null;
  version: string | null;
  environment: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  warningCount: number | null;
  errorCount: number | null;
  failureCode: string | null;
  requestedBy: string | null;
};

export type BuildsSummary = { running: number; queued: number; failed: number; succeeded: number };

export type BuildDetail = {
  id: string; projectId: string; projectName: string | null; ownerEmail: string | null;
  status: string; buildNumber: number | null; version: string | null; environment: string | null;
  startedAt: string | null; completedAt: string | null; duration: number | null;
  warningCount: number | null; errorCount: number | null;
  failureCode: string | null; failureMessage: string | null; cancelledAt: string | null;
  logAvailable: boolean; logNote: string;
};

export type AttentionItem = {
  key: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  count: number;
};

export type BillingEventRow = Record<string, unknown> & { id: string; event_type?: string; processing_status?: string; received_at?: string };

export type AiModel = Record<string, unknown> & { id: string; model_key?: string; enabled?: boolean; routing_priority?: number; capabilities?: unknown; allowed_plans?: unknown };
export type AiProvider = Record<string, unknown> & { id: string; provider_key?: string; status?: string; display_name?: string; last_health_check?: string };

export type AiProviderUsage = { requests: number; failures: number; tokens: number; costMicros: number; durationMs: number };
export type AiUsageAgg = {
  byProvider: Record<string, AiProviderUsage>;
  totalTokens: number; totalCostMicros: number; hasCostData: boolean;
  totalFailures: number; totalRequests: number; periodDays: number;
};
export type AiFailure = { provider: string | null; model: string | null; taskClass: string | null; errorCode: string | null; at: string | null; source: string };

export type AiOverview = { providers: AiProvider[]; models: AiModel[]; queueDepth: number; flags: { flag_key: string; enabled: boolean }[]; usage: AiUsageAgg; failures: AiFailure[] };

export type DeploymentRow = Record<string, unknown> & { id: string; status?: string; environment?: string; created_at?: string };

export type FormStats = { totalSubmissions: number; deliveryFailures: number; spamCount: number; spamRate: number; fileScanBacklog: number };

export type TemplateRow = Record<string, unknown> & { id: string; name?: string; moderation_status?: string; licence_key?: string; updated_at?: string };

export type FeatureFlag = { id: string; flag_key: string; enabled: boolean; configuration: Record<string, unknown> | null; updated_at: string };

export type Incident = { id: string; severity: string; title: string; affected_services: string[] | null; status: string; incident_lead: string | null; started_at: string; resolved_at: string | null; created_at: string };

export type AdminRecord = {
  user_id: string; role: AdminRole; permissions: string[] | null; active: boolean; created_at: string;
  email: string | null; displayName: string | null; grantedByEmail: string | null; lastActivity: string | null;
};

export type AuditEvent = {
  id: string; adminUserId: string;
  adminEmail: string | null; adminName: string | null; adminRole: string | null;
  action: string; targetType: string | null; targetId: string | null;
  reason: string | null; safeMetadata: Record<string, unknown> | null; createdAt: string;
};

export type ReleaseCheck = { key: string; label: string; status: 'verified' | 'unverified'; critical: boolean };
export type ReleaseGate = { result: 'GO' | 'CONDITIONAL GO' | 'NO-GO'; checklist: ReleaseCheck[]; criticalUnverified: number };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function invoke<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, code: 'NO_CLIENT', message: 'Supabase is not configured.' };
  try {
    const { data, error } = await supabase.functions.invoke('forge-admin', { body: { action, ...body } });
    if (error) {
      // Non-2xx responses surface as a FunctionsHttpError. supabase-js
      // returns `data: null` in this path — the edge function's own body
      // is NOT in `data`, it's in `error.context` (the raw HTTP Response).
      // Parse that body to recover the real errorCode (AUTH_REQUIRED /
      // FORBIDDEN / ...) so the UI can distinguish "sign in" from
      // "access denied" from a genuine failure.
      let code = 'INVOKE_ERROR';
      let message = error.message ?? 'Request failed.';
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const parsed = (await context.json()) as { errorCode?: string; message?: string } | null;
          if (parsed?.errorCode) code = parsed.errorCode;
          if (parsed?.message) message = parsed.message;
        } catch {
          // Body wasn't JSON; keep the generic message.
        }
      }
      return { ok: false, code, message };
    }
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
  buildsList: (status?: string) => invoke<{ builds: BuildRow[]; summary: BuildsSummary }>('builds.list', { status }),
  buildsGet: (buildId: string) => invoke<{ build: BuildDetail }>('builds.get', { buildId }),
  attention: () => invoke<{ items: AttentionItem[]; checkedAt: string }>('attention'),

  usersList: (query = '') => invoke<{ users: UserRow[] }>('users.list', { query }),
  customersList: (opts?: { query?: string; plan?: string; status?: string; page?: number; pageSize?: number }) => invoke<{ customers: CustomerRow[]; total: number; page: number; pageSize: number; summary: CustomerSummary }>('customers.list', { ...opts }),
  customersGet: (userId: string) => invoke<{ customer: CustomerDetail }>('customers.get', { userId }),
  suspendUser: (userId: string, reason: string) => invoke('users.suspend', { userId, reason }),
  restoreUser: (userId: string, reason: string) => invoke('users.restore', { userId, reason }),
  revokeSessions: (userId: string, reason: string) => invoke('users.revoke_sessions', { userId, reason }),
  resetPassword: (userId: string) => invoke('users.reset_password', { userId }),
  addNote: (userId: string, note: string) => invoke('users.note', { userId, note }),

  projectsList: (opts?: { query?: string; status?: string; plan?: string; buildState?: string; page?: number; pageSize?: number }) => invoke<{ projects: AdminProjectRow[]; total: number; page: number; pageSize: number; summary: ProjectSummary }>('projects.list', { ...opts }),
  projectGet: (projectId: string) => invoke<{ project: AdminProjectDetail }>('projects.get', { projectId }),
  supportStart: (projectId: string, reason: string, durationMinutes: number) => invoke<{ session: { id: string; expiresAt: string }; message: string }>('support.start', { projectId, reason, durationMinutes }),
  supportEnd: (sessionId: string) => invoke('support.end', { sessionId }),

  billingList: (status?: string) => invoke<{ subscriptions: BillingSubRow[] }>('billing.list', { status }),
  billingSummary: () => invoke<{ summary: BillingSummary }>('billing.summary'),
  billingPaymentProblems: () => invoke<{ items: PaymentProblem[] }>('billing.payment_problems'),
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
  adminsList: () => invoke<{ admins: AdminRecord[]; ownerCount: number }>('admins.list'),
  adminsSet: (userId: string, role: AdminRole, active: boolean, reason: string) => invoke('admins.set', { userId, role, active, reason }),
  auditList: (opts?: { query?: string; actionFilter?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) => invoke<{ events: AuditEvent[]; total: number; page: number; pageSize: number; actions: string[] }>('audit.list', { ...opts }),

  usageSummary: () => invoke<{ summary: UsageSummary }>('usage.summary'),
  usageCustomers: (opts?: { page?: number; pageSize?: number }) => invoke<{ customers: UsageCustomerRow[]; total: number; page: number; pageSize: number; plans: string[] }>('usage.customers', { ...opts }),

  ownerSnapshot: () => invoke<OwnerSnapshot>('owner.snapshot'),
  ownerActivity: () => invoke<{ customers: ActivityFeedItem[]; platform: ActivityFeedItem[]; checkedAt: string }>('owner.activity'),
  supportList: () => invoke<{ sessions: SupportSessionRow[] }>('support.list'),
};

export function roleLabel(role: string | null | undefined): string {
  return ADMIN_ROLES.find((r) => r.value === role)?.label ?? (role ?? '—');
}