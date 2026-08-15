import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@22';

/* ──────────────────────────────────────────────────────────────
   Forge Create Checkout — authenticated Stripe Checkout + Portal.

   Everything is resolved server-side. The browser receives either a
   hosted URL or a short-lived Elements client secret; it never sees a
   price ID, customer ID, restricted key, or Stripe object. Stripe remains
   the source of truth for payment state, Supabase for entitlements.

   API version is pinned to 2026-06-24.dahlia (supported by stripe-node
   v22.3.0+). This enables `integration_identifier` as a real top-level
   Checkout Session parameter (added in 2026-03-25.dahlia).
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_RESTRICTED_KEY = Deno.env.get('STRIPE_RESTRICTED_KEY') ?? '';
const FORGE_APP_URL = Deno.env.get('FORGE_APP_URL') ?? '';

const STRIPE_API_VERSION = '2026-06-24.dahlia';

/* Tax safety: automatic tax stays OFF until the business confirms active
   Stripe Tax registrations and the product tax code. Never guess a code. */
const ENABLE_AUTOMATIC_TAX = Deno.env.get('FORGE_ENABLE_AUTOMATIC_TAX') === 'true';

export const PLAN_KEYS = ['free', 'starter', 'builder', 'pro', 'agency'] as const;
export const BILLABLE_PLAN_KEYS = ['starter', 'builder', 'pro', 'agency'] as const;
export type BillingInterval = 'month' | 'year';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTEGRATION_PREFIX = 'forge';
const INTEGRATION_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

let stripe: Stripe | null = null;
if (STRIPE_RESTRICTED_KEY) {
  stripe = new Stripe(STRIPE_RESTRICTED_KEY, { apiVersion: STRIPE_API_VERSION });
}

/* ── Pure helpers (exported for the Deno test suite) ── */

export function parseAppOrigin(raw = FORGE_APP_URL): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(origin: string | null, appOrigin: string | null): boolean {
  if (!origin) return false;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return appOrigin !== null && origin === appOrigin;
}

export function isValidBillablePlan(planKey: unknown): planKey is (typeof BILLABLE_PLAN_KEYS)[number] {
  return typeof planKey === 'string' && (BILLABLE_PLAN_KEYS as readonly string[]).includes(planKey);
}

export function isValidInterval(interval: unknown): interval is BillingInterval {
  return interval === 'month' || interval === 'year';
}

export function buildLookupKey(planKey: string, interval: BillingInterval): string {
  return interval === 'year' ? `${planKey}-yearly` : planKey;
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function buildIdempotencyKey(userId: string, requestKey: string): string {
  return `forge-checkout-${userId}-${requestKey}`;
}

export function generateIntegrationIdentifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (b) => INTEGRATION_ALPHABET[b % INTEGRATION_ALPHABET.length]).join('');
  return `${INTEGRATION_PREFIX}-${suffix}`;
}

/* ── Server-only price validation ──
   A price only qualifies if it is active, recurring, GBP, licensed
   (flat-rate recurring), and its product metadata confirms it belongs
   to the expected Forge plan (`forge_plan_key`). */
export function validatePrice(price: Stripe.Price | null | undefined, planKey: string): price is Stripe.Price {
  if (!price) return false;
  if (!price.active) return false;
  if (price.type !== 'recurring') return false;
  if (price.currency !== 'gbp') return false;
  if (price.recurring?.usage_type !== 'licensed') return false;
  const product = typeof price.product === 'string' ? null : price.product;
  if (!product || !product.metadata) return false;
  return product.metadata.forge_plan_key === planKey;
}

/* ── Response helpers ── */

function corsHeaders(req: Request, appOrigin: string | null) {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin, appOrigin);
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}

function error(requestId: string, errorCode: string, message: string, status = 400, cors: Record<string, string> = {}) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status, cors);
}

async function getUserId(authHeader: string | null) {
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function getOrCreateCustomer(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
): Promise<string> {
  const { data: existing } = await admin
    .from('billing_customers')
    .select('stripe_customer_id, billing_email')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    // Keep the Stripe Customer's email in sync with the authenticated profile.
    if (email && existing.billing_email !== email) {
      await stripe!.customers.update(existing.stripe_customer_id as string, { email });
      await admin.from('billing_customers').update({ billing_email: email, updated_at: new Date().toISOString() }).eq('user_id', userId);
    }
    return existing.stripe_customer_id as string;
  }

  const customer = await stripe!.customers.create({
    email: email || undefined,
    metadata: { forge_user_id: userId },
  });

  await admin.from('billing_customers').upsert(
    { user_id: userId, stripe_customer_id: customer.id, billing_email: email || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  return customer.id;
}

async function resolvePrice(planKey: string, interval: BillingInterval): Promise<Stripe.Price | null> {
  const lookupKey = buildLookupKey(planKey, interval);
  const prices = await stripe!.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
    expand: ['data.product'],
  });
  return prices.data[0] ?? null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();

  const appOrigin = parseAppOrigin();
  if (!appOrigin) {
    return error(requestId, 'NOT_CONFIGURED', 'FORGE_APP_URL is missing or invalid.', 503);
  }

  const cors = corsHeaders(req, appOrigin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405, cors);

  const authHeader = req.headers.get('authorization');
  const userId = await getUserId(authHeader);
  if (!userId) return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401, cors);

  if (!stripe) {
    return error(requestId, 'NOT_CONFIGURED', 'Billing is not configured.', 503, cors);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return error(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400, cors); }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle();
  const email = (profile?.email as string) ?? '';

  // Trusted redirect targets derive only from FORGE_APP_URL — never a request Origin.
  const successUrl = `${appOrigin}/pricing?billing=success`;
  const cancelUrl = `${appOrigin}/pricing?billing=cancelled`;
  const portalReturnUrl = `${appOrigin}/pricing?billing=portal-return`;

  const action = typeof body.action === 'string' ? body.action : 'checkout';
  const embeddedElements = action === 'checkout_elements';

  /* ── Customer Portal ──
     Requires an existing billing customer AND an active or historical
     subscription. Never fabricates an empty Stripe Customer just to
     open the portal. */
  if (action === 'portal') {
    const { data: billingCustomer } = await admin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!billingCustomer?.stripe_customer_id) {
      return error(requestId, 'NOT_FOUND', 'No billing customer found.', 404, cors);
    }

    const { data: anySubscription } = await admin
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!anySubscription) {
      return error(requestId, 'NOT_FOUND', 'No subscription found.', 404, cors);
    }

    let portalSession: Stripe.BillingPortal.Session;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: billingCustomer.stripe_customer_id as string,
        return_url: portalReturnUrl,
      });
    } catch {
      return error(requestId, 'STRIPE_ERROR', 'Could not open the billing portal.', 502, cors);
    }

    return json({ requestId, code: 'OK', url: portalSession.url }, 200, cors);
  }

  /* ── Checkout ── */
  const planKey = body.planKey;
  const billingInterval = isValidInterval(body.billingInterval) ? body.billingInterval : null;

  if (!isValidBillablePlan(planKey)) {
    return error(requestId, 'INVALID_PLAN', 'Unknown or non-billable plan.', 400, cors);
  }
  if (!billingInterval) {
    return error(requestId, 'INVALID_INTERVAL', 'billingInterval must be "month" or "year".', 400, cors);
  }

  const requestKey = body.requestKey;
  if (!isValidUuid(requestKey)) {
    return error(requestId, 'INVALID_REQUEST_KEY', 'requestKey must be a valid UUID.', 400, cors);
  }

  // Reject users who already have an active, trialing or past-due
  // subscription — point them to the portal instead of double-charging.
  const { data: activeSub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();
  if (activeSub) {
    return error(requestId, 'ACTIVE_SUBSCRIPTION', 'You already have an active subscription. Use Manage billing to change plans.', 409, cors);
  }

  let price: Stripe.Price | null;
  try {
    price = await resolvePrice(planKey, billingInterval);
  } catch {
    return error(requestId, 'STRIPE_ERROR', 'Could not resolve pricing.', 502, cors);
  }

  if (!validatePrice(price, planKey)) {
    return error(requestId, 'PRICE_NOT_CONFIGURED', 'No valid recurring GBP price is configured for this plan.', 503, cors);
  }

  let customerId: string;
  try {
    customerId = await getOrCreateCustomer(admin, userId, email);
  } catch {
    return error(requestId, 'STRIPE_ERROR', 'Could not prepare billing.', 502, cors);
  }

  const idempotencyKey = buildIdempotencyKey(userId, requestKey);
  const integrationIdentifier = generateIntegrationIdentifier();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: userId,
    integration_identifier: integrationIdentifier,
    metadata: {
      forge_user_id: userId,
      plan_key: planKey,
      billing_interval: billingInterval,
    },
    subscription_data: {
      metadata: {
        forge_user_id: userId,
        plan_key: planKey,
        billing_interval: billingInterval,
      },
    },
  };

  if (embeddedElements) {
    sessionParams.ui_mode = 'elements';
    sessionParams.return_url = `${appOrigin}/checkout/complete`;
    sessionParams.customer_update = { address: 'auto', name: 'auto' };
  } else {
    sessionParams.success_url = successUrl;
    sessionParams.cancel_url = cancelUrl;
  }

  // Tax stays disabled until the business opts in explicitly.
  if (ENABLE_AUTOMATIC_TAX) {
    sessionParams.automatic_tax = { enabled: true };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  } catch {
    return error(requestId, 'STRIPE_ERROR', 'Could not start checkout.', 502, cors);
  }

  if (embeddedElements) {
    if (!session.client_secret) {
      return error(requestId, 'CHECKOUT_SESSION_INVALID', 'Stripe did not return a secure checkout session.', 502, cors);
    }

    const { data: entitlementRows } = await admin
      .from('plan_entitlements')
      .select('entitlement_key, limit_value')
      .eq('plan_key', planKey)
      .eq('active', true);
    const entitlements = Object.fromEntries(
      (entitlementRows ?? []).map((row) => [row.entitlement_key, row.limit_value]),
    );

    // Grant nothing here — access is derived from the signed webhook.
    return json({
      requestId,
      code: 'OK',
      clientSecret: session.client_secret,
      checkout: {
        planKey,
        billingInterval,
        amount: price.unit_amount,
        currency: price.currency,
        email,
        entitlements,
      },
    }, 200, cors);
  }

  // Grant nothing here — access is derived from the webhook, never this response.
  return json({ requestId, code: 'OK', url: session.url }, 200, cors);
});
