import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/* ──────────────────────────────────────────────────────────────
   Forge Submit Form — public, secure submission endpoint.
   Public visitors never touch the database directly; every
   submission is validated, sanitised and stored server-side here.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Server-only secrets. Never exposed to the browser.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM_DOMAIN = Deno.env.get('RESEND_FROM_DOMAIN') ?? '';
const FORGE_FORM_HASH_SECRET = Deno.env.get('FORGE_FORM_HASH_SECRET') ?? 'forge-form-hash-dev-only-rotate-me';
const FORGE_WEBHOOK_ENCRYPTION_KEY = Deno.env.get('FORGE_WEBHOOK_ENCRYPTION_KEY') ?? 'forge-webhook-dev-only-rotate-me';
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';

const ALLOWED_FIELD_TYPES = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'radio', 'checkbox', 'consent', 'date', 'time', 'file', 'hidden', 'submit'];

const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_FIELDS = 100;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
const MAX_TEXT_LENGTH = 5000;
const MAX_URL_COUNT = 5;
const MIN_COMPLETION_MS = 2500;

/* ─── SSRF protection for webhook destinations ─── */

function isUnsafeHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === 'localhost.localdomain') return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h) || /^0\./.test(h) || /^::1$/.test(h) || /^fe80:/i.test(h)) return true;
  if (h === 'metadata.google.internal' || h === 'metadata' || h.endsWith('.metadata.google.internal')) return true;
  return false;
}

async function isUnsafeUrl(raw: string): Promise<boolean> {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return true;
    if (isUnsafeHost(url.hostname)) return true;
    // Re-resolve DNS to defend against DNS rebinding.
    const resolved = await Deno.resolveDns(url.hostname, 'A').catch(() => []);
    const resolvedAAAA = await Deno.resolveDns(url.hostname, 'AAAA').catch(() => []);
    const ips = [...resolved, ...resolvedAAAA];
    return ips.some((ip) => isUnsafeHost(ip));
  } catch {
    return true;
  }
}

/* ─── Hashing (one-way, never store raw IP) ─── */

async function hashValue(value: string): Promise<string> {
  const data = new TextEncoder().encode(`${FORGE_FORM_HASH_SECRET}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ─── Helpers ─── */

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowed = /^https:\/\/[^/]*readdy\.ai$/.test(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function safeError(reference: string | null, code: string, message: string, status = 400) {
  return json({ reference, code: 'ERROR', errorCode: code, message }, status);
}

function sanitizeText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, max).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function countUrls(text: string): number {
  return (text.match(/https?:\/\//gi) ?? []).length;
}

/* ─── In-memory rate limiter (per-instance; a durable store would back this in production) ─── */

const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  if (bucket.count > limit) return true;
  return false;
}

/* ─── Field validation against the form's declared schema ─── */

function validateSubmission(fields: Record<string, unknown>, schema: Array<{ key: string; type: string; required: boolean; validation: Record<string, unknown> }>, consentKey: string | null) {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};
  let urlCount = 0;

  // Reject unknown fields.
  const known = new Set(schema.map((f) => f.key));
  for (const key of Object.keys(fields)) {
    if (!known.has(key)) {
      return { ok: false, errors: { _unknown: 'Unexpected field submitted.' } };
    }
  }

  for (const field of schema) {
    const raw = fields[field.key];
    const type = field.type;
    const required = field.required === true;

    if (type === 'submit') continue;

    if ((raw === undefined || raw === null || raw === '') && required) {
      errors[field.key] = 'This field is required.';
      continue;
    }
    if ((raw === undefined || raw === null || raw === '')) {
      sanitized[field.key] = '';
      continue;
    }

    if (type === 'file') continue; // handled separately via multipart/files array

    if (Array.isArray(raw)) {
      // checkbox groups
      const arr = raw.map((v) => sanitizeText(v, 500)).filter(Boolean);
      if (required && arr.length === 0) errors[field.key] = 'Select at least one option.';
      sanitized[field.key] = arr;
      continue;
    }

    const value = sanitizeText(String(raw), MAX_TEXT_LENGTH);
    urlCount += countUrls(value);

    if (type === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = 'Enter a valid email address.';
    } else if (type === 'tel') {
      if (value && !/^\+?[0-9\s().-]{4,}$/.test(value)) errors[field.key] = 'Enter a valid phone number.';
    } else if (type === 'number') {
      if (value && Number.isNaN(Number(value))) errors[field.key] = 'Enter a valid number.';
    } else if (type === 'date') {
      if (value && Number.isNaN(Date.parse(value))) errors[field.key] = 'Enter a valid date.';
    } else if (type === 'time') {
      if (value && !/^\d{1,2}:\d{2}$/.test(value)) errors[field.key] = 'Enter a valid time.';
    } else if (type === 'consent') {
      if (required && value !== 'true' && value !== 'on' && value !== '1' && value !== 'yes') {
        errors[field.key] = 'Consent is required.';
      }
    } else {
      // text/textarea/select/radio/hidden
      const maxLen = typeof field.validation?.maxLength === 'number' ? Number(field.validation.maxLength) : MAX_TEXT_LENGTH;
      if (value.length > maxLen) errors[field.key] = `Must be ${maxLen} characters or fewer.`;
    }
    sanitized[field.key] = value;
  }

  // Consent verification (operational consent).
  if (consentKey && sanitized[consentKey] !== 'true' && sanitized[consentKey] !== 'on' && sanitized[consentKey] !== '1') {
    errors[consentKey] = 'Consent is required to submit this form.';
  }

  if (urlCount > MAX_URL_COUNT) {
    return { ok: false, errors: { _spam: 'Too many links in your submission.' } };
  }

  return { ok: Object.keys(errors).length === 0, errors, sanitized };
}

/* ─── Delivery: webhooks (signed, SSRF-safe) and email ─── */

async function deliverWebhook(admin: ReturnType<typeof createClient>, integration: Record<string, unknown>, submission: Record<string, unknown>, sanitized: Record<string, unknown>) {
  const config = (integration.encrypted_configuration as Record<string, unknown>) ?? {};
  const url = typeof config.destination_url === 'string' ? config.destination_url : '';
  if (!url) return;
  const secret = typeof config.signing_secret === 'string' && config.signing_secret ? config.signing_secret : FORGE_WEBHOOK_ENCRYPTION_KEY;

  const event = {
    event_id: crypto.randomUUID(),
    event_type: 'form.submission.created',
    submission_id: submission.id,
    project_id: submission.project_id,
    form_id: submission.form_id,
    timestamp: new Date().toISOString(),
    data: sanitized,
  };
  const body = JSON.stringify(event);
  const signature = await hmacSign(body, secret);

  try {
    if (await isUnsafeUrl(url)) {
      await recordDelivery(admin, { submission_id: submission.id as string, integration_id: integration.id as string, event_type: 'webhook', status: 'failed', error_code: 'UNSAFE_DESTINATION', safe_error_message: 'Webhook destination is blocked for security reasons.' });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Forge-Signature': `sha256=${signature}` },
      body,
    });
    clearTimeout(timer);
    await recordDelivery(admin, {
      submission_id: submission.id as string,
      integration_id: integration.id as string,
      event_type: 'webhook',
      status: res.ok ? 'delivered' : 'failed',
      provider_reference: String(res.status),
      error_code: res.ok ? null : `HTTP_${res.status}`,
      safe_error_message: res.ok ? null : 'The webhook endpoint returned an error.',
    });
  } catch (err) {
    await recordDelivery(admin, {
      submission_id: submission.id as string,
      integration_id: integration.id as string,
      event_type: 'webhook',
      status: 'failed',
      error_code: 'DELIVERY_ERROR',
      safe_error_message: 'The webhook could not be delivered.',
    });
  }
}

async function sendEmail(admin: ReturnType<typeof createClient>, form: Record<string, unknown>, submission: Record<string, unknown>, sanitized: Record<string, unknown>, primaryEmail: string) {
  const config = (form.configuration as Record<string, unknown>) ?? {};
  const recipients = typeof config.notifyRecipients === 'string' ? config.notifyRecipients.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (!recipients.length && !primaryEmail) return;

  if (!RESEND_API_KEY) {
    await recordDelivery(admin, { submission_id: submission.id as string, integration_id: null, event_type: 'email', status: 'skipped', error_code: 'EMAIL_NOT_CONFIGURED', safe_error_message: 'Email notification is not configured.' });
    return;
  }

  const from = RESEND_FROM_DOMAIN ? `noreply@${RESEND_FROM_DOMAIN}` : 'onboarding@resend.dev';
  const lines = Object.entries(sanitized).filter(([k]) => k !== 'website_alt' && k !== '_consent').map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
  const subject = typeof config.notifySubject === 'string' && config.notifySubject ? config.notifySubject : `New submission — ${form.name}`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: recipients.length ? recipients : [primaryEmail], subject, text: `New form submission received.\n\n${lines}` }),
    });
    await recordDelivery(admin, {
      submission_id: submission.id as string,
      integration_id: null,
      event_type: 'email',
      status: res.ok ? 'delivered' : 'failed',
      provider_reference: res.ok ? null : String(res.status),
      error_code: res.ok ? null : `EMAIL_${res.status}`,
      safe_error_message: res.ok ? null : 'Email notification failed.',
    });
  } catch {
    await recordDelivery(admin, { submission_id: submission.id as string, integration_id: null, event_type: 'email', status: 'failed', error_code: 'EMAIL_ERROR', safe_error_message: 'Email notification could not be sent.' });
  }
}

async function recordDelivery(admin: ReturnType<typeof createClient>, input: Record<string, unknown>) {
  await admin.from('form_delivery_events').insert({
    submission_id: input.submission_id,
    integration_id: input.integration_id ?? null,
    event_type: input.event_type,
    status: input.status,
    attempt_number: 0,
    provider_reference: input.provider_reference ?? null,
    error_code: input.error_code ?? null,
    safe_error_message: input.safe_error_message ?? null,
  });
}

/* ─── Request handling ─── */

serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return safeError(null, 'INVALID_REQUEST', 'Method not allowed', 405);

  const origin = req.headers.get('origin') ?? '';
  const referer = req.headers.get('referer') ?? '';
  const userAgent = req.headers.get('user-agent') ?? '';
  const ipRaw = (req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0].trim();
  const ipHash = await hashValue(ipRaw);
  const uaHash = await hashValue(userAgent);

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_PAYLOAD_BYTES) return safeError(null, 'PAYLOAD_TOO_LARGE', 'Request is too large.', 413);
    body = JSON.parse(text);
  } catch {
    return safeError(null, 'INVALID_REQUEST', 'Malformed request.', 400);
  }

  const formKey = typeof body.formKey === 'string' ? body.formKey : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const deploymentId = typeof body.deploymentId === 'string' && body.deploymentId ? body.deploymentId : null;
  const idempotencyKey = typeof body.idempotencyKey === 'string' && body.idempotencyKey ? body.idempotencyKey : null;
  const startedAt = typeof body.startedAt === 'number' ? body.startedAt : Date.now();

  if (!formKey || !projectId) {
    return safeError(null, 'INVALID_REQUEST', 'Missing form or project identifier.');
  }

  // Honeypot — silently accept but mark as spam, do not store as lead.
  const honeypot = typeof body.website_alt === 'string' ? body.website_alt : '';
  const honeypotHit = honeypot.trim().length > 0;

  // Minimum completion-time check.
  if (Date.now() - startedAt < MIN_COMPLETION_MS && !honeypotHit) {
    return safeError(null, 'SPAM_DETECTED', 'Submission rejected.');
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Per-IP and per-form rate limiting.
  if (rateLimited(`${ipHash}`, 10, 60_000)) {
    return safeError(null, 'RATE_LIMITED', 'Too many submissions. Please wait and try again.', 429);
  }

  // Resolve the form + project.
  const { data: form } = await admin
    .from('forms')
    .select('id, project_id, name, status, configuration, success_action, success_message, redirect_url')
    .eq('project_id', projectId)
    .eq('slug', formKey)
    .maybeSingle();
  if (!form) return safeError(null, 'FORM_NOT_FOUND', 'Form not found.', 404);
  if (form.status !== 'active') return safeError(null, 'FORM_INACTIVE', 'This form is not accepting submissions.');
  if (rateLimited(`form:${form.id}`, 60, 60_000)) {
    return safeError(null, 'RATE_LIMITED', 'Too many submissions. Please wait and try again.', 429);
  }

  // Source domain must belong to the deployment (if a deployment is claimed).
  if (deploymentId) {
    const { data: deployment } = await admin
      .from('deployments')
      .select('id, deployment_url')
      .eq('id', deploymentId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!deployment) return safeError(null, 'DEPLOYMENT_INVALID', 'Invalid deployment.', 400);
    if (deployment.deployment_url) {
      try {
        const host = new URL(deployment.deployment_url).hostname;
        const originHost = origin ? new URL(origin).hostname : '';
        if (originHost && originHost !== host && !originHost.endsWith(`.${host}`)) {
          return safeError(null, 'ORIGIN_FORBIDDEN', 'Submission origin is not allowed for this form.', 403);
        }
      } catch { /* ignore malformed urls */ }
    }
  }

  // Load the declared field schema.
  const { data: fieldRows } = await admin
    .from('form_fields')
    .select('field_key, field_type, label, position, required, validation, configuration')
    .eq('form_id', form.id)
    .order('position', { ascending: true });
  const schema = (fieldRows ?? []).map((f) => ({ key: f.field_key, type: f.field_type, required: f.required, validation: (f.validation as Record<string, unknown>) ?? {} }));

  // Identify consent field(s).
  const consentField = (fieldRows ?? []).find((f) => f.field_type === 'consent');
  const consentKey = consentField?.field_key ?? null;

  // Turnstile verification (optional).
  const config = (form.configuration as Record<string, unknown>) ?? {};
  const turnstileEnabled = config.turnstileEnabled === true;
  if (turnstileEnabled) {
    const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
    if (!TURNSTILE_SECRET_KEY || !token) {
      return safeError(null, 'TURNSTILE_INVALID', 'Security check failed. Please try again.');
    }
    const formData = new URLSearchParams();
    formData.set('secret', TURNSTILE_SECRET_KEY);
    formData.set('response', token);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData }).then((r) => r.json()).catch(() => null);
    if (!verify || verify.success !== true) {
      return safeError(null, 'TURNSTILE_INVALID', 'Security check failed. Please try again.');
    }
  }

  // Validate + sanitize fields.
  const submittedFields = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
  if (Object.keys(submittedFields).length > MAX_FIELDS) {
    return safeError(null, 'TOO_MANY_FIELDS', 'Too many fields submitted.');
  }
  const result = validateSubmission(submittedFields, schema, consentKey);
  if (!result.ok) {
    return json({ reference: null, code: 'ERROR', errorCode: 'VALIDATION_FAILED', message: 'Please fix the highlighted fields.', fieldErrors: result.errors }, 400, cors);
  }

  // Consent data (versioned).
  const consentData = consentKey ? {
    fieldKey: consentKey,
    wording: typeof config.consentLabel === 'string' ? config.consentLabel : 'Consent to be contacted.',
    wordingVersion: 1,
    consented: true,
    timestamp: new Date().toISOString(),
  } : null;

  // Duplicate / idempotency detection.
  const reference = `FRM-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  if (idempotencyKey) {
    const contentHash = await hashValue(JSON.stringify(result.sanitized));
    const { data: existing } = await admin
      .from('form_submissions')
      .select('id, submission_reference')
      .eq('project_id', projectId)
      .eq('form_id', form.id)
      .filter('submitted_data->>__idempotency', 'eq', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return json({ reference: existing.submission_reference, code: 'OK', idempotent: true, success: true, message: form.success_message ?? 'Submission received.' }, 200, cors);
    }
    result.sanitized.__idempotency = idempotencyKey;
    result.sanitized.__content_hash = contentHash;
  }

  const spamScore = honeypotHit ? 100 : (urlCountHits(result.sanitized) > MAX_URL_COUNT ? 90 : 0);

  // Store the submission (service role bypasses RLS).
  const { data: submission, error: insertError } = await admin
    .from('form_submissions')
    .insert({
      form_id: form.id,
      project_id: projectId,
      deployment_id: deploymentId,
      submission_reference: reference,
      status: honeypotHit ? 'spam' : 'unread',
      submitted_data: result.sanitized,
      source_url: referer,
      source_domain: origin ? new URL(origin).hostname : null,
      referrer: referer,
      user_agent_hash: uaHash,
      ip_hash: ipHash,
      consent_data: consentData,
      spam_score: spamScore,
      created_at: new Date().toISOString(),
    })
    .select('id, project_id, form_id, submission_reference, status')
    .single();

  if (insertError || !submission) {
    return safeError(null, 'STORE_FAILED', 'The submission could not be saved.', 500);
  }

  // Queue notifications + integrations (non-blocking; a failure never drops the submission).
  const { data: integrations } = await admin
    .from('form_integrations')
    .select('*')
    .eq('form_id', form.id)
    .eq('status', 'enabled');

  const primaryEmail = (fieldRows ?? []).find((f) => f.field_type === 'email')?.field_key
    ? String(result.sanitized[(fieldRows ?? []).find((f) => f.field_type === 'email')!.field_key] ?? '')
    : '';

  await Promise.all([
    sendEmail(admin, form, submission, result.sanitized, primaryEmail),
    ...(integrations ?? []).filter((i) => i.integration_type === 'webhook' || i.integration_type === 'n8n').map((i) => deliverWebhook(admin, i, submission, result.sanitized)),
  ]);

  return json({
    reference,
    code: 'OK',
    success: true,
    message: form.success_message ?? 'Thank you, your submission has been received.',
    successAction: form.success_action ?? 'message',
    redirectUrl: form.success_action === 'redirect' || form.success_action === 'external' ? form.redirect_url ?? null : null,
    isTest: false,
  }, 200, cors);
});

function urlCountHits(data: Record<string, unknown>): number {
  let count = 0;
  Object.values(data).forEach((v) => {
    if (typeof v === 'string') count += countUrls(v);
    else if (Array.isArray(v)) v.forEach((s) => { if (typeof s === 'string') count += countUrls(s); });
  });
  return count;
}