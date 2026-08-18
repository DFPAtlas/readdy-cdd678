// Forge Stripe Webhook — public receiver (Stripe cannot send a Forge JWT).
// Authenticated exclusively via Stripe webhook signature verification before any DB write.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@22';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const STRIPE_RESTRICTED_KEY = Deno.env.get('STRIPE_RESTRICTED_KEY') ?? '';

const STRIPE_API_VERSION = '2026-06-24.dahlia';

const ALLOWED_PLAN_KEYS = ['starter', 'builder', 'pro', 'agency'];
const VALID_STATUSES = ['active', 'trialing', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'paused', 'canceled'];

const HANDLED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stripe = STRIPE_RESTRICTED_KEY
  ? new Stripe(STRIPE_RESTRICTED_KEY, { apiVersion: STRIPE_API_VERSION })
  : null;

function iso(epochSec) {
  return epochSec ? new Date(epochSec * 1000).toISOString() : null;
}

function safeError(err) {
  const msg = err instanceof Error ? err.message : String(err ?? 'unknown error');
  return msg.slice(0, 500);
}

// Map Stripe spelling exactly; migrate any legacy double-L 'cancelled' to Stripe's 'canceled'.
function normalizeStatus(status) {
  const s = typeof status === 'string' ? status : 'incomplete';
  if (s === 'cancelled') return 'canceled';
  return VALID_STATUSES.includes(s) ? s : 'incomplete';
}

// Normalize plan from the active Stripe Price lookup key (never from stale Subscription metadata).
function normalizePlan(lookupKey, recurringInterval) {
  if (typeof lookupKey !== 'string' || !lookupKey) return null;
  const base = lookupKey.endsWith('-yearly') ? lookupKey.slice(0, -'-yearly'.length) : lookupKey;
  if (!ALLOWED_PLAN_KEYS.includes(base)) return null;
  const interval = recurringInterval === 'year' ? 'year' : recurringInterval === 'month' ? 'month' : null;
  if (!interval) return null;
  return { planKey: base, interval };
}

function customerIdOf(obj) {
  if (!obj) return null;
  const c = obj.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && typeof c.id === 'string') return c.id;
  return null;
}

// Resolve Forge user in order: subscription metadata, checkout client_reference_id,
// checkout metadata, then billing_customers mapping for the Stripe customer.
async function resolveUserId(sub, session) {
  if (sub?.metadata?.forge_user_id) return sub.metadata.forge_user_id;
  if (session?.client_reference_id) return session.client_reference_id;
  if (session?.metadata?.forge_user_id) return session.metadata.forge_user_id;
  const customerId = customerIdOf(sub) ?? customerIdOf(session);
  if (customerId) {
    const { data } = await admin
      .from('billing_customers')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }
  return null;
}

async function ensureUsagePeriod(userId, subscriptionId, periodStart, periodEnd) {
  if (!userId || !periodStart || !periodEnd) return;
  const { data: existing } = await admin
    .from('usage_periods')
    .select('id')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle();
  if (existing) return;
  const { error } = await admin.from('usage_periods').insert({
    user_id: userId,
    subscription_id: subscriptionId ?? null,
    period_start: periodStart,
    period_end: periodEnd,
    status: 'open',
    created_at: new Date().toISOString(),
  });
  if (error) console.error('usage_period insert failed', error.message);
}

async function markEvent(eventId, status, safeErrorVal = null) {
  await admin
    .from('billing_events')
    .update({
      processing_status: status,
      safe_error: safeErrorVal,
      processed_at: status === 'processed' ? new Date().toISOString() : null,
    })
    .eq('stripe_event_id', eventId);
}

// Returns 'new' | 'duplicate' | 'retry'. Duplicate = already processed (successful no-op).
async function recordEvent(eventId, eventType) {
  const { error: insertErr } = await admin
    .from('billing_events')
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
      processing_status: 'received',
      attempt_count: 1,
      received_at: new Date().toISOString(),
    });

  if (!insertErr) {
    await admin
      .from('billing_events')
      .update({ processing_status: 'processing' })
      .eq('stripe_event_id', eventId);
    return 'new';
  }

  const { data: existing } = await admin
    .from('billing_events')
    .select('processing_status, attempt_count')
    .eq('stripe_event_id', eventId)
    .maybeSingle();

  if (!existing) return 'new';
  if (existing.processing_status === 'processed') return 'duplicate';

  const attempt = (existing.attempt_count ?? 0) + 1;
  await admin
    .from('billing_events')
    .update({ processing_status: 'processing', attempt_count: attempt })
    .eq('stripe_event_id', eventId);
  return 'retry';
}

/* ── AI credit top-up grant ─────────────────────────────────────────────
   One-time payment (mode = 'payment') for forge_purchase_type =
   'credit_topup'. Grants purchased credits ONLY when payment_status is
   'paid'. Idempotent on `stripe-credit-{checkout_session_id}` so a retried
   webhook never grants twice. Never stores card/CVC/secret material. */
async function handleCreditTopup(session, event) {
  if (session.mode !== 'payment') return { ok: true, ignored: 'not_payment_session' };
  const meta = session.metadata ?? {};
  if (meta.forge_purchase_type !== 'credit_topup') return { ok: true, ignored: 'not_credit_topup' };
  if (session.payment_status !== 'paid') return { ok: true, ignored: 'payment_not_paid' };

  const userId = session.client_reference_id || meta.forge_user_id || null;
  if (!userId) return { ok: false, reason: 'no_user_mapping' };

  // Trusted credit amount — read from Stripe Price/product metadata where
  // available (server-side truth), falling back to session metadata.
  let credits = Number(meta.forge_credit_amount);
  let priceId = null;
  try {
    if (stripe) {
      const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items.data.price.product'] });
      const price = full?.line_items?.data?.[0]?.price ?? null;
      if (price) {
        if (price.type !== 'one_time') return { ok: false, reason: 'not_one_time_price' };
        priceId = price.id ?? null;
        const product = (typeof price.product === 'string') ? null : price.product;
        const productCredits = product?.metadata?.forge_credit_amount;
        if (productCredits) credits = Number(productCredits);
      }
    }
  } catch {
    /* keep session metadata fallback */
  }

  if (!Number.isFinite(credits) || credits <= 0) return { ok: false, reason: 'invalid_credit_amount' };

  const idempotencyKey = `stripe-credit-${session.id}`;
  const packKey = meta.forge_credit_pack ?? null;
  const paymentIntentId = (typeof session.payment_intent === 'string') ? session.payment_intent : (session.payment_intent?.id ?? null);

  // Idempotency: verify no settled purchase with this key already exists.
  const { data: existing } = await admin
    .from('usage_ledger')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing) return { ok: true, skipped: 'already_granted' };

  const { error } = await admin.from('usage_ledger').insert({
    user_id: userId,
    usage_type: 'ai_credit_purchase',
    quantity: credits,
    status: 'settled',
    idempotency_key: idempotencyKey,
    provider: 'stripe',
    safe_metadata: {
      purchase_type: 'credit_topup',
      pack_key: packKey,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_price_id: priceId,
      stripe_event_id: event.id,
    },
    settled_at: new Date().toISOString(),
  });

  if (error) return { ok: false, reason: 'db_error' };
  return { ok: true, credits };
}

async function applySubscription(sub, session, eventCreatedSec) {
  const userId = await resolveUserId(sub, session);
  if (!userId) return { ok: false, reason: 'no_user_mapping' };

  const item = sub?.items?.data?.[0];
  const price = item?.price ?? null;
  const lookupKey = price?.lookup_key ?? null;
  const norm = normalizePlan(lookupKey, price?.recurring?.interval ?? null);
  if (!norm) return { ok: false, reason: 'unknown_price', lookupKey };

  const stripeCustomerId = customerIdOf(sub);
  const status = normalizeStatus(sub?.status);

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_event_created')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();
  if (existing?.stripe_event_created) {
    const existingSec = Math.floor(new Date(existing.stripe_event_created).getTime() / 1000);
    if (eventCreatedSec < existingSec) return { ok: true, skipped: 'out_of_order' };
  }

  const snapshot = {
    stripe_subscription_id: sub.id,
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_price_id: price?.id ?? null,
    plan_key: norm.planKey,
    billing_interval: norm.interval,
    status,
    current_period_start: iso(item?.current_period_start),
    current_period_end: iso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    trial_end: iso(sub.trial_end),
    stripe_event_created: iso(eventCreatedSec),
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await admin
    .from('subscriptions')
    .upsert(snapshot, { onConflict: 'stripe_subscription_id' })
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, reason: 'db_error' };

  await ensureUsagePeriod(userId, upserted?.id ?? null, snapshot.current_period_start, snapshot.current_period_end);
  return { ok: true, planKey: norm.planKey, status };
}

async function applyDeletion(sub, eventCreatedSec) {
  const userId = await resolveUserId(sub, null);
  if (!userId) return { ok: false, reason: 'no_user_mapping' };

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, plan_key, billing_interval, stripe_event_created')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();

  if (existing?.stripe_event_created) {
    const existingSec = Math.floor(new Date(existing.stripe_event_created).getTime() / 1000);
    if (eventCreatedSec < existingSec) return { ok: true, skipped: 'out_of_order' };
  }

  const item = sub?.items?.data?.[0];
  const price = item?.price ?? null;
  const norm = normalizePlan(price?.lookup_key ?? null, price?.recurring?.interval ?? null);
  const planKey = norm?.planKey ?? existing?.plan_key ?? null;
  const billingInterval = norm?.interval ?? existing?.billing_interval ?? null;
  if (!planKey) return { ok: false, reason: 'unknown_price' };

  const periodStart = item?.current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? null;

  const { error } = await admin
    .from('subscriptions')
    .upsert(
      {
        stripe_subscription_id: sub.id,
        user_id: userId,
        stripe_customer_id: customerIdOf(sub),
        stripe_price_id: price?.id ?? null,
        plan_key: planKey,
        billing_interval: billingInterval,
        status: 'canceled',
        current_period_start: iso(periodStart),
        current_period_end: iso(periodEnd),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        trial_end: iso(sub.trial_end),
        stripe_event_created: iso(eventCreatedSec),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' },
    );

  if (error) return { ok: false, reason: 'db_error' };
  return { ok: true, status: 'canceled' };
}

async function retrieveSubscription(subscriptionId) {
  if (!stripe || !subscriptionId) return null;
  return stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
}

async function handleEvent(event) {
  const createdSec = event.created;
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // Credit top-ups are one-time payments and must not be treated as subscriptions.
      if (session.mode === 'payment' && session.metadata?.forge_purchase_type === 'credit_topup') {
        return handleCreditTopup(session, event);
      }
      if (typeof session.subscription === 'string') {
        const sub = await retrieveSubscription(session.subscription);
        if (sub) return applySubscription(sub, session, createdSec);
      }
      return { ok: true, ignored: 'no_subscription' };
    }
    case 'checkout.session.expired':
      return { ok: true, ignored: 'session_expired' };
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = await retrieveSubscription(event.data.object.id);
      if (!sub) return { ok: false, reason: 'subscription_not_found' };
      return applySubscription(sub, null, createdSec);
    }
    case 'customer.subscription.deleted':
      return applyDeletion(event.data.object, createdSec);
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (typeof invoice.subscription === 'string') {
        const sub = await retrieveSubscription(invoice.subscription);
        if (sub) return applySubscription(sub, null, createdSec);
      }
      return { ok: true, ignored: 'no_subscription' };
    }
    default:
      return { ok: true, ignored: true };
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  // Verify signature before touching the body as JSON. Read the raw body exactly once.
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const rawBody = await req.text();

  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('WEBHOOK_SIGNATURE_VERIFY_FAILED', safeError(err));
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const recordKind = await recordEvent(event.id, event.type);
  if (recordKind === 'duplicate') {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const result = await handleEvent(event);
    if (!result.ok) {
      await markEvent(event.id, 'failed', result.reason ?? 'processing_failed');
      return new Response(JSON.stringify({ received: true, retry: true }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    await markEvent(event.id, 'processed');
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    await markEvent(event.id, 'failed', safeError(err));
    return new Response(JSON.stringify({ received: true, retry: true }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
