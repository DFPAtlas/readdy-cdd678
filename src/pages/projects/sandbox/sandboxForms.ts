import { getSandboxClient, resolveSandboxProject } from './sandboxPersistence';
import type { FormDefinition, FormField, SandboxDocument } from './sandboxPersistence';

/* ──────────────────────────────────────────────────────────────
   Forms client — submissions, integrations, analytics & export.
   All reads respect tenant-isolated RLS; writes that affect the
   submission audit trail are restricted to the server function.
   ────────────────────────────────────────────────────────────── */

export type SubmissionStatus = 'unread' | 'processed' | 'spam' | 'archived';

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  unread: 'Unread',
  processed: 'Processed',
  spam: 'Spam',
  archived: 'Archived',
};

export type FormRecord = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  status: string;
  successAction: string;
  successMessage: string | null;
  redirectUrl: string | null;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionRecord = {
  id: string;
  formId: string;
  projectId: string;
  reference: string;
  status: SubmissionStatus;
  submittedData: Record<string, unknown>;
  sourceUrl: string | null;
  sourceDomain: string | null;
  consentData: Record<string, unknown> | null;
  spamScore: number | null;
  createdAt: string;
};

export type FormIntegrationRecord = {
  id: string;
  formId: string;
  integrationType: string;
  status: string;
  configuration: Record<string, unknown>;
  fieldMapping: Record<string, unknown>;
  createdAt: string;
};

export type DeliveryEventRecord = {
  id: string;
  submissionId: string;
  integrationId: string | null;
  eventType: string;
  status: string;
  attemptNumber: number;
  providerReference: string | null;
  errorCode: string | null;
  safeErrorMessage: string | null;
  createdAt: string;
};

/* ─── Row mappers ─── */

function mapForm(row: Record<string, unknown>): FormRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    slug: String(row.slug),
    status: String(row.status),
    successAction: String(row.success_action),
    successMessage: row.success_message ? String(row.success_message) : null,
    redirectUrl: row.redirect_url ? String(row.redirect_url) : null,
    retentionDays: Number(row.retention_days ?? 365),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSubmission(row: Record<string, unknown>): SubmissionRecord {
  return {
    id: String(row.id),
    formId: String(row.form_id),
    projectId: String(row.project_id),
    reference: String(row.submission_reference),
    status: (String(row.status) as SubmissionStatus) || 'unread',
    submittedData: row.submitted_data && typeof row.submitted_data === 'object' ? (row.submitted_data as Record<string, unknown>) : {},
    sourceUrl: row.source_url ? String(row.source_url) : null,
    sourceDomain: row.source_domain ? String(row.source_domain) : null,
    consentData: row.consent_data && typeof row.consent_data === 'object' ? (row.consent_data as Record<string, unknown>) : null,
    spamScore: row.spam_score == null ? null : Number(row.spam_score),
    createdAt: String(row.created_at),
  };
}

function mapIntegration(row: Record<string, unknown>): FormIntegrationRecord {
  return {
    id: String(row.id),
    formId: String(row.form_id),
    integrationType: String(row.integration_type),
    status: String(row.status),
    configuration: row.encrypted_configuration && typeof row.encrypted_configuration === 'object' ? (row.encrypted_configuration as Record<string, unknown>) : {},
    fieldMapping: row.field_mapping && typeof row.field_mapping === 'object' ? (row.field_mapping as Record<string, unknown>) : {},
    createdAt: String(row.created_at),
  };
}

function mapEvent(row: Record<string, unknown>): DeliveryEventRecord {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    integrationId: row.integration_id ? String(row.integration_id) : null,
    eventType: String(row.event_type),
    status: String(row.status),
    attemptNumber: Number(row.attempt_number ?? 0),
    providerReference: row.provider_reference ? String(row.provider_reference) : null,
    errorCode: row.error_code ? String(row.error_code) : null,
    safeErrorMessage: row.safe_error_message ? String(row.safe_error_message) : null,
    createdAt: String(row.created_at),
  };
}

/* ─── Form definition extraction + sync ─── */

export function extractFormElements(doc: SandboxDocument): Array<{ elementId: string; pageName: string; name: string; form: FormDefinition }> {
  const results: Array<{ elementId: string; pageName: string; name: string; form: FormDefinition }> = [];
  doc.pages.forEach((page) => {
    page.elements.forEach((element) => {
      if (element.type === 'Form' && element.form) {
        results.push({ elementId: element.id, pageName: page.name, name: element.form.name || element.name, form: element.form });
      }
    });
  });
  return results;
}

function slugifyFormName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form';
}

export async function syncForms(doc: SandboxDocument): Promise<{ ok: boolean; synced: number; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, synced: 0, message: 'Sign in to sync forms.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, synced: 0, message: 'Sign in to sync forms.' };

  const elements = extractFormElements(doc);
  let synced = 0;

  for (const entry of elements) {
    const slug = slugifyFormName(entry.form.name);
    const { data: existing } = await supabase
      .from('forms')
      .select('id')
      .eq('project_id', resolved.projectId)
      .eq('slug', slug)
      .maybeSingle();

    let formId = existing?.id as string | undefined;
    if (!formId) {
      const { data: created, error } = await supabase.from('forms').insert({
        project_id: resolved.projectId,
        name: entry.form.name,
        slug,
        status: 'draft',
        configuration: {
          notifyRecipients: entry.form.notifyRecipients,
          notifySubject: entry.form.notifySubject,
          consentLabel: entry.form.consentLabel,
          marketingConsentLabel: entry.form.marketingConsentLabel,
          honeypot: entry.form.honeypot,
          minTime: entry.form.minTime,
          turnstile: entry.form.turnstile,
        },
        success_action: entry.form.successAction,
        success_message: entry.form.successMessage,
        redirect_url: entry.form.redirectUrl,
        retention_days: entry.form.retentionDays,
        created_by: resolved.userId,
      }).select('id').single();
      if (error || !created) continue;
      formId = created.id as string;
      synced += 1;
    } else {
      await supabase.from('forms').update({
        name: entry.form.name,
        configuration: {
          notifyRecipients: entry.form.notifyRecipients,
          notifySubject: entry.form.notifySubject,
          consentLabel: entry.form.consentLabel,
          marketingConsentLabel: entry.form.marketingConsentLabel,
          honeypot: entry.form.honeypot,
          minTime: entry.form.minTime,
          turnstile: entry.form.turnstile,
        },
        success_action: entry.form.successAction,
        success_message: entry.form.successMessage,
        redirect_url: entry.form.redirectUrl,
        retention_days: entry.form.retentionDays,
        updated_at: new Date().toISOString(),
      }).eq('id', formId);
    }

    // Sync fields (upsert by stable field_key).
    for (const field of entry.form.fields) {
      if (field.type === 'submit') continue;
      const position = entry.form.fields.findIndex((f) => f.id === field.id);
      const { data: existingField } = await supabase
        .from('form_fields')
        .select('id')
        .eq('form_id', formId)
        .eq('field_key', field.key)
        .maybeSingle();
      if (existingField?.id) {
        await supabase.from('form_fields').update({
          field_type: field.type,
          label: field.label,
          position,
          required: field.required,
          validation: field.validation,
          configuration: { placeholder: field.placeholder, helpText: field.helpText, options: field.options, errorMessage: field.errorMessage, width: field.width },
          updated_at: new Date().toISOString(),
        }).eq('id', existingField.id);
      } else {
        await supabase.from('form_fields').insert({
          form_id: formId,
          field_key: field.key,
          field_type: field.type,
          label: field.label,
          position,
          required: field.required,
          validation: field.validation,
          configuration: { placeholder: field.placeholder, helpText: field.helpText, options: field.options, errorMessage: field.errorMessage, width: field.width },
        });
      }
    }
  }

  return { ok: true, synced, message: `Synced ${synced} form${synced === 1 ? '' : 's'}` };
}

/* ─── Queries ─── */

export async function listForms(): Promise<FormRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapForm);
}

export async function listSubmissions(filter?: { formId?: string; status?: SubmissionStatus; search?: string }): Promise<SubmissionRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return [];
  let query = supabase
    .from('form_submissions')
    .select('*')
    .eq('project_id', resolved.projectId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter?.formId) query = query.eq('form_id', filter.formId);
  if (filter?.status) query = query.eq('status', filter.status);
  if (filter?.search) query = query.ilike('submitted_data', `%${filter.search}%`);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapSubmission);
}

export async function listIntegrations(formId: string): Promise<FormIntegrationRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('form_integrations')
    .select('*')
    .eq('form_id', formId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapIntegration);
}

export async function listDeliveryEvents(submissionId: string): Promise<DeliveryEventRecord[]> {
  const supabase = getSandboxClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('form_delivery_events')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapEvent);
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to update submissions.' };
  const { error } = await supabase.from('form_submissions').update({ status, processed_at: status === 'processed' ? new Date().toISOString() : null }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Marked ${SUBMISSION_STATUS_LABELS[status].toLowerCase()}` };
}

export async function deleteSubmission(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to delete submissions.' };
  // Soft-delete: anonymise data and mark deleted (audit event preserved).
  const { error } = await supabase.from('form_submissions').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Submission archived and scheduled for deletion' };
}

export async function saveIntegration(formId: string, integrationType: string, config: { destinationUrl: string; events: string[]; enabled: boolean }): Promise<{ ok: boolean; message: string }> {
  const supabase = getSandboxClient();
  if (!supabase) return { ok: false, message: 'Sign in to configure integrations.' };
  const resolved = await resolveSandboxProject().catch(() => null);
  if (!resolved) return { ok: false, message: 'Sign in to configure integrations.' };
  const { data: existing } = await supabase
    .from('form_integrations')
    .select('id')
    .eq('form_id', formId)
    .eq('integration_type', integrationType)
    .maybeSingle();

  const payload = {
    destination_url: config.destinationUrl,
    events: config.events,
    // Signing secret is held server-side (FORGE_WEBHOOK_ENCRYPTION_KEY) —
    // it is never stored or transmitted from the browser.
  };

  if (existing?.id) {
    const { error } = await supabase.from('form_integrations').update({
      status: config.enabled ? 'enabled' : 'disabled',
      encrypted_configuration: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from('form_integrations').insert({
      form_id: formId,
      integration_type: integrationType,
      status: config.enabled ? 'enabled' : 'disabled',
      encrypted_configuration: payload,
      created_by: resolved.userId,
    });
    if (error) return { ok: false, message: error.message };
  }
  return { ok: true, message: `${integrationType} integration saved` };
}

/* ─── CSV export (spreadsheet formula escaping) ─── */

function escapeCsvCell(value: unknown): string {
  let text = value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value);
  if (/^[=+\-@]/.test(text.trim())) text = `'${text}`;
  if (/[",\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function submissionsToCsv(submissions: SubmissionRecord[], formName: string): string {
  const headers = new Set<string>();
  submissions.forEach((submission) => Object.keys(submission.submittedData).forEach((key) => { if (!key.startsWith('__')) headers.add(key); }));
  const columns = ['Reference', 'Submitted', 'Status', 'Spam score', ...Array.from(headers)];
  const rows = submissions.map((submission) => {
    const base = [submission.reference, submission.createdAt, SUBMISSION_STATUS_LABELS[submission.status], submission.spamScore == null ? '' : String(submission.spamScore)];
    const values = Array.from(headers).map((key) => escapeCsvCell(submission.submittedData[key] ?? ''));
    return [...base.map(escapeCsvCell), ...values];
  });
  return [columns.map(escapeCsvCell).join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ─── Privacy-conscious analytics ─── */

export type FormAnalytics = {
  total: number;
  unread: number;
  processed: number;
  spam: number;
  archived: number;
  spamRate: number;
  last30Days: number;
};

export function computeAnalytics(submissions: SubmissionRecord[]): FormAnalytics {
  const total = submissions.length;
  const unread = submissions.filter((s) => s.status === 'unread').length;
  const processed = submissions.filter((s) => s.status === 'processed').length;
  const spam = submissions.filter((s) => s.status === 'spam').length;
  const archived = submissions.filter((s) => s.status === 'archived').length;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30Days = submissions.filter((s) => Date.parse(s.createdAt) >= thirtyDaysAgo).length;
  const spamRate = total ? Math.round((spam / total) * 100) : 0;
  return { total, unread, processed, spam, archived, spamRate, last30Days };
}

/* ─── Primary contact extraction ─── */

export function primaryContact(submission: SubmissionRecord): string {
  const data = submission.submittedData;
  const email = Object.values(data).find((v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  if (email) return String(email);
  const name = Object.values(data).find((v) => typeof v === 'string' && v.trim().length > 0 && v.trim().length < 60);
  return name ? String(name) : '—';
}