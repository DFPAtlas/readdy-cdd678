import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@22';

/* ──────────────────────────────────────────────────────────────
   Forge Create Checkout — hosted Stripe Checkout + billing portal.

   Boot-safety contract (the 503/preflight fix):
   • NOTHING that can throw runs at module load. Stripe is lazy-init.
   • OPTIONS is answered with 204 + CORS BEFORE any config validation,
     auth, Stripe, price lookup or database access.
   • CORS does NOT depend on FORGE_APP_URL.
   • The whole handler is wrapped so an unexpected throw still returns
     a CORS response, never a bare platform 503 that kills preflight.
   • Authentication is done manually from the JWT (verify_jwt = false).

   Single-subscription guard (the billing-hardening fix):
   • Stripe is authoritative for whether another billable subscription
     already exists. Supabase is NEVER trusted for this (it can lag Stripe).
   • Sequence: authenticated user → billing_customers lookup → create
     Stripe customer only if none → retrieve Stripe subscriptions → evaluate
     blocking status → ONLY if none, resolve Price → create Checkout Session.
   • Never create a second Stripe customer to bypass the guard.

   AI credit top-ups (one-time, NOT subscriptions):
   • `action = credit_topup` maps a TRUSTED pack key (credits_500/1500/5000/15000)
     to a server-selected Stripe one-time Price. The browser NEVER sends a
     price ID or a credit quantity — only the pack key + requestKey + returnBase.
   • mode = payment (never subscription). Credit purchases never touch plan_key,
     subscriptions, usage_periods or limits.

   Return-URL contract (the redirect-loop fix):
   • The browser sends `returnBase` (its real `location.origin` + base path)
     so Stripe success/cancel/portal URLs always point back to the exact
     environment the customer is on (readdy preview or a custom domain),
     never a hardcoded production URL.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_RESTRICTED_KEY = Deno.env.get('STRIPE_RESTRICTED_KEY') ?? '';
const FORGE_APP_URL = Deno.env.get('FORGE_APP_URL') ?? 'https://theforges.org';

const STRIPE_API_VERSION = '2026-06-24.dahlia';
const ENABLE_AUTOMATIC_TAX = Deno.env.get('FORGE_ENABLE_AUTOMATIC_TAX') === 'true';

const BILLABLE_PLAN_KEYS = ['starter', 'builder', 'pro', 'agency'] as const;
type BillingInterval = 'month' | 'year';

/* Trusted credit pack catalogue. The credit amount and Stripe lookup key are
   defined here server-side; the browser only ever sends the pack key. */
const CREDIT_PACKS: Record<string, { credits: number; lookupKey: string }> = {
  credits_500: { credits: 500, lookupKey: 'credits_500' },
  credits_1500: { credits: 1500, lookupKey: 'credits_1500' },
  credits_5000: { credits: 5000, lookupKey: 'credits_5000' },
  credits_15000: { credits: 15000, lookupKey: 'credits_15000' },
};

/* Subscription statuses that block creating another billable subscription.
   Stripe is authoritative — these are checked live against the customer's
   Stripe subscriptions, never trusted from Supabase or the frontend. */
const BLOCKING_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTEGRATION_PREFIX = 'forge';
const INTEGRATION_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/* Lazy Stripe — never constructed at module load, so a bad key/version
   can never crash the worker on boot (which would 503 the preflight). */
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!STRIPE_RESTRICTED_KEY) return null;
  if (_stripe) return _stripe;
  try {
    _stripe = new Stripe(STRIPE_RESTRICTED_KEY, { apiVersion: STRIPE_API_VERSION });
    return _stripe;
  } catch {
    return null;
  }
}

/* FORGE_APP_URL is a fallback ONLY. The real return origin is supplied by the
   browser in `returnBase` so checkout never bounces to a hardcoded domain. */
function appOriginForRedirects(): string {
  try {
    return new URL(FORGE_APP_URL).origin;
  } catch {
    return 'https://theforges.org';
  }
}

/* Prefer the browser-reported `returnBase` (origin + base path). Validate it
   is a sane absolute http(s) URL and strip any trailing slash so path joins
   below are clean. Falls back to FORGE_APP_URL for older clients. */
function resolveReturnBase(body: Record<string, unknown>): string {
  const candidate = body.returnBase;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    const trimmed = candidate.trim().replace(/\/+$/, '');
    try {
      const url = new URL(trimmed);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return trimmed;
      }
    } catch {
      /* invalid — fall through to the configured default */
    }
  }
  return appOriginForRedirects();
}

/* Trusted browser origins.
   CORS must NEVER depend on FORGE_APP_URL guesswork. This endpoint is
   JWT-protected, so it is safe to echo back any https origin plus localhost. */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[^/]+$/.test(origin)) return true;
  return false;
}

function isValidBillablePlan(planKey: unknown): planKey is (typeof BILLABLE_PLAN_KEYS)[number] {
  return typeof planKey === 'string' && (BILLABLE_PLAN_KEYS as readonly string[]).includes(planKey);
}
function isValidInterval(interval: unknown): interval is BillingInterval {
  return interval === 'month' || interval === 'year';
}
function buildLookupKey(planKey: string, interval: BillingInterval): string {
  return interval === 'year' ? `${planKey}-yearly` : planKey;
}
function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
function isValidCreditPack(packKey: unknown): packKey is string {
  return typeof packKey === 'string' && Object.prototype.hasOwnProperty.call(CREDIT_PACKS, packKey);
}
function buildIdempotencyKey(userId: string, requestKey: string): string {
  return `forge-checkout-${userId}-${requestKey}`;
}
function buildCreditIdempotencyKey(userId: string, requestKey: string): string {
  return `forge-credit-topup-${userId}-${requestKey}`;
}
function generateIntegrationIdentifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (b) => INTEGRATION_ALPHABET[b % INTEGRATION_ALPHABET.length]).join('');
  return `${INTEGRATION_PREFIX}-${suffix}`;
}
function validatePrice(price: Stripe.Price | null | undefined, planKey: string): price is Stripe.Price {
  if (!price) return false;
  if (!price.active) return false;
  if (price.type !== 'recurring') return false;
  if (price.currency !== 'gbp') return false;
  if (price.recurring?.usage_type !== 'licensed') return false;
  const product = typeof price.product === 'string' ? null : price.product;
  if (!product || !product.metadata) return false;
  return product.metadata.forge_plan_key === planKey;
}
/* One-time price validation for credit top-ups. Rejects recurring prices. */
function validateCreditPrice(price: Stripe.Price | null | undefined, expectedCredits: number): price is Stripe.Price {
  if (!price) return false;
  if (!price.active) return false;
  if (price.type !== 'one_time') return false;
  if (price.currency !== 'gbp') return false;
  const product = typeof price.product === 'string' ? null : price.product;
  if (!product || !product.metadata) return false;
  if (product.metadata.forge_purchase_type !== 'credit_topup') return false;
  const amount = Number(product.metadata.forge_credit_amount);
  return Number.isFinite(amount) && amount === expectedCredits;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = isAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });
}
function fail(requestId: string, errorCode: string, message: string, status = 400, cors: Record<string, string> = {}) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status, cors);
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function getOrCreateCustomer(
  stripe: Stripe,
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
    if (email && existing.billing_email !== email) {
      await stripe.customers.update(existing.stripe_customer_id as string, { email });
      await admin.from('billing_customers').update({ billing_email: email, updated_at: new Date().toISOString() }).eq('user_id', userId);
    }
    return existing.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({ email: email || undefined, metadata: { forge_user_id: userId } });
  await admin.from('billing_customers').upsert(
    { user_id: userId, stripe_customer_id: customer.id, billing_email: email || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  return customer.id;
}

async function resolvePrice(stripe: Stripe, planKey: string, interval: BillingInterval): Promise<Stripe.Price | null> {
  const lookupKey = buildLookupKey(planKey, interval);
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1, expand: ['data.product'] });
  return prices.data[0] ?? null;
}

async function resolveCreditPrice(stripe: Stripe, lookupKey: string): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1, expand: ['data.product'] });
  return prices.data[0] ?? null;
}

/* Stripe-authoritative guard: returns true if the customer already has a
   subscription in a blocking status. `canceled` and `incomplete_expired` are
   terminal and do NOT block (the user may start a fresh subscription). */
async function hasBlockingSubscription(stripe: Stripe, customerId: string): Promise<boolean> {
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  return subscriptions.data.some((sub) => BLOCKING_SUBSCRIPTION_STATUSES.has(sub.status));
}

async function handle(req: Request, requestId: string, cors: Record<string, string>): Promise<Response> {
  if (req.method !== 'POST') return fail(requestId, 'INVALID_REQUEST', 'Method not allowed', 405, cors);

  const userId = await getUserId(req.headers.get('authorization'));
  if (!userId) return fail(requestId, 'AUTH_REQUIRED', 'Authentication required', 401, cors);

  const stripe = getStripe();
  if (!stripe) return fail(requestId, 'CONFIGURATION_ERROR', 'Checkout is not fully configured.', 503, cors);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400, cors); }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle();
  const email = (profile?.email as string) ?? '';

  const returnBase = resolveReturnBase(body);
  const successUrl = `${returnBase}/checkout/complete`;
  const cancelUrl = `${returnBase}/pricing?billing=cancelled`;
  const portalReturnUrl = `${returnBase}/pricing?billing=portal-return`;

  const action = typeof body.action === 'string' ? body.action : 'checkout';

  /* ── Billing portal ── */
  if (action === 'portal') {
    const { data: billingCustomer } = await admin
      .from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
    if (!billingCustomer?.stripe_customer_id) return fail(requestId, 'NOT_FOUND', 'No billing customer found.', 404, cors);

    const { data: anySubscription } = await admin
      .from('subscriptions').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (!anySubscription) return fail(requestId, 'NOT_FOUND', 'No subscription found.', 404, cors);

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: billingCustomer.stripe_customer_id as string,
        return_url: portalReturnUrl,
      });
      return json({ requestId, code: 'OK', url: portalSession.url }, 200, cors);
    } catch {
      return fail(requestId, 'STRIPE_ERROR', 'Could not open the billing portal.', 502, cors);
    }
  }

  /* ── AI credit top-up (one-time payment, NOT a subscription) ── */
  if (action === 'credit_topup') {
    const packKey = body.packKey;
    if (!isValidCreditPack(packKey)) return fail(requestId, 'INVALID_PACK', 'Unknown credit pack.', 400, cors);
    const pack = CREDIT_PACKS[packKey];

    const requestKey = body.requestKey;
    if (!isValidUuid(requestKey)) return fail(requestId, 'INVALID_REQUEST_KEY', 'requestKey must be a valid UUID.', 400, cors);

    let customerId: string;
    try {
      customerId = await getOrCreateCustomer(stripe, admin, userId, email);
    } catch {
      return fail(requestId, 'STRIPE_ERROR', 'Could not prepare billing.', 502, cors);
    }

    let price: Stripe.Price | null;
    try {
      price = await resolveCreditPrice(stripe, pack.lookupKey);
    } catch {
      return fail(requestId, 'STRIPE_ERROR', 'Could not resolve credit pricing.', 502, cors);
    }
    if (!validateCreditPrice(price, pack.credits)) {
      return fail(requestId, 'PRICE_NOT_CONFIGURED', 'No valid one-time GBP credit price is configured.', 503, cors);
    }

    const idempotencyKey = buildCreditIdempotencyKey(userId, requestKey);
    const creditSuccessUrl = `${returnBase}/credits?purchase=processing`;
    const creditCancelUrl = `${returnBase}/credits?purchase=cancelled`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: userId,
      metadata: {
        forge_user_id: userId,
        forge_purchase_type: 'credit_topup',
        forge_credit_pack: packKey,
        forge_credit_amount: String(pack.credits),
      },
      payment_intent_data: {
        metadata: {
          forge_user_id: userId,
          forge_purchase_type: 'credit_topup',
          forge_credit_pack: packKey,
          forge_credit_amount: String(pack.credits),
        },
      },
      success_url: creditSuccessUrl,
      cancel_url: creditCancelUrl,
    };
    if (ENABLE_AUTOMATIC_TAX) sessionParams.automatic_tax = { enabled: true };

    try {
      const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
      return json({ requestId, code: 'OK', url: session.url }, 200, cors);
    } catch {
      return fail(requestId, 'CHECKOUT_UNAVAILABLE', 'Could not start credit checkout.', 502, cors);
    }
  }

  /* ── Hosted checkout (subscription) ── */
  const planKey = body.planKey;
  const billingInterval = isValidInterval(body.billingInterval) ? body.billingInterval : null;

  if (!isValidBillablePlan(planKey)) return fail(requestId, 'INVALID_PLAN', 'Unknown or non-billable plan.', 400, cors);
  if (!billingInterval) return fail(requestId, 'INVALID_INTERVAL', 'billingInterval must be "month" or "year".', 400, cors);

  const requestKey = body.requestKey;
  if (!isValidUuid(requestKey)) return fail(requestId, 'INVALID_REQUEST_KEY', 'requestKey must be a valid UUID.', 400, cors);

  // Stripe customer first — one Forge user maps to one Stripe customer.
  // Never create a second customer to bypass the subscription guard.
  let customerId: string;
  try {
    customerId = await getOrCreateCustomer(stripe, admin, userId, email);
  } catch {
    return fail(requestId, 'STRIPE_ERROR', 'Could not prepare billing.', 502, cors);
  }

  // Stripe is authoritative for whether another billable subscription exists.
  // Supabase can lag Stripe, so never rely on public.subscriptions here.
  let alreadySubscribed = false;
  try {
    alreadySubscribed = await hasBlockingSubscription(stripe, customerId);
  } catch {
    return fail(requestId, 'STRIPE_ERROR', 'Could not verify your current subscription.', 502, cors);
  }
  if (alreadySubscribed) {
    return json({
      requestId, code: 'ERROR', errorCode: 'ACTIVE_SUBSCRIPTION_EXISTS',
      message: 'You already have an active Forge subscription.',
      manageBilling: true,
    }, 409, cors);
  }

  let price: Stripe.Price | null;
  try {
    price = await resolvePrice(stripe, planKey, billingInterval);
  } catch {
    return fail(requestId, 'STRIPE_ERROR', 'Could not resolve pricing.', 502, cors);
  }
  if (!validatePrice(price, planKey)) {
    return fail(requestId, 'PRICE_NOT_CONFIGURED', 'No valid recurring GBP price is configured for this plan.', 503, cors);
  }

  const idempotencyKey = buildIdempotencyKey(userId, requestKey);
  const integrationIdentifier = generateIntegrationIdentifier();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: userId,
    metadata: { forge_user_id: userId, plan_key: planKey, billing_interval: billingInterval, integration_identifier: integrationIdentifier },
    subscription_data: { metadata: { forge_user_id: userId, plan_key: planKey, billing_interval: billingInterval } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
  if (ENABLE_AUTOMATIC_TAX) sessionParams.automatic_tax = { enabled: true };

  try {
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
    return json({ requestId, code: 'OK', url: session.url }, 200, cors);
  } catch {
    return fail(requestId, 'CHECKOUT_UNAVAILABLE', 'Could not start checkout.', 502, cors);
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);

  // OPTIONS is answered unconditionally, first, before anything that can fail.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  try {
    return await handle(req, requestId, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'Unexpected error';
    return fail(requestId, 'CHECKOUT_UNAVAILABLE', message, 500, cors);
  }
});
