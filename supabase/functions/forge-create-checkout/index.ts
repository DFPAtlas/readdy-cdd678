import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@14';

/* ──────────────────────────────────────────────────────────────
   Forge Create Checkout — authenticated Stripe Checkout + Portal.
   Prices, customers and sessions are all resolved server-side.
   Never fakes a purchase: returns NOT_CONFIGURED when Stripe is
   not wired, and never exposes price IDs or customer IDs.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_RESTRICTED_KEY = Deno.env.get('STRIPE_RESTRICTED_KEY') ?? '';

const PLAN_KEYS = ['free', 'starter', 'pro', 'agency'] as const;

let stripe: Stripe | null = null;
if (STRIPE_RESTRICTED_KEY) {
  stripe = new Stripe(STRIPE_RESTRICTED_KEY, { apiVersion: '2024-06-20' });
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = /^https:\/\/[^/]*readdy\.ai$/.test(origin ?? '') || /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '');
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

function error(requestId: string, errorCode: string, message: string, status = 400) {
  return json({ requestId, code: 'ERROR', errorCode, message }, status);
}

async function getUserId(authHeader: string | null) {
  if (!authHeader) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function getOrCreateCustomer(admin: ReturnType<typeof createClient>, userId: string, email: string) {
  const { data: existing } = await admin.from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const customer = await stripe!.customers.create({
    email: email || undefined,
    metadata: { forge_user_id: userId, integration_identifier: 'forge' },
  });
  await admin.from('billing_customers').upsert(
    { user_id: userId, stripe_customer_id: customer.id, billing_email: email || null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  return customer.id;
}

async function resolvePriceId(planKey: string): Promise<string | null> {
  const prices = await stripe!.prices.list({ lookup_keys: [planKey], active: true, limit: 1 });
  return prices.data[0]?.id ?? null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return error(requestId, 'INVALID_REQUEST', 'Method not allowed', 405);

  const authHeader = req.headers.get('authorization');
  const userId = await getUserId(authHeader);
  if (!userId) return error(requestId, 'AUTH_REQUIRED', 'Authentication required', 401);

  if (!stripe) {
    return error(requestId, 'NOT_CONFIGURED', 'Billing is not configured.', 503);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return error(requestId, 'INVALID_REQUEST', 'Malformed JSON', 400); }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle();
  const email = (profile?.email as string) ?? '';

  // Trusted origin for redirects (origin already allow-listed by CORS).
  const origin = req.headers.get('origin') ?? Deno.env.get('FORGE_APP_URL') ?? '';
  const successUrl = `${origin}/projects/sandbox?billing=success`;
  const cancelUrl = `${origin}/projects/sandbox?billing=cancelled`;

  const action = typeof body.action === 'string' ? body.action : 'checkout';

  /* ── Customer Portal ── */
  if (action === 'portal') {
    const customerId = await getOrCreateCustomer(admin, userId, email);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/projects/sandbox?billing=portal-return`,
    });
    return json({ requestId, code: 'OK', url: session.url }, 200, cors);
  }

  /* ── Checkout ── */
  const planKey = typeof body.planKey === 'string' ? body.planKey : '';
  if (!PLAN_KEYS.includes(planKey as typeof PLAN_KEYS[number]) || planKey === 'free') {
    return error(requestId, 'INVALID_PLAN', 'Unknown or non-billable plan', 400);
  }

  // Prevent duplicate active subscriptions.
  const { data: active } = await admin.from('subscriptions').select('id')
    .eq('user_id', userId).in('status', ['active', 'trialing', 'past_due']).maybeSingle();
  if (active) {
    return error(requestId, 'ACTIVE_SUBSCRIPTION', 'You already have an active subscription. Use Manage billing to change plans.', 409);
  }

  const priceId = await resolvePriceId(planKey);
  if (!priceId) {
    return error(requestId, 'PRICE_NOT_CONFIGURED', `No active Stripe price is mapped to the "${planKey}" plan.`, 503);
  }

  const customerId = await getOrCreateCustomer(admin, userId, email);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { forge_user_id: userId, plan_key: planKey, integration_identifier: 'forge' },
    subscription_data: { metadata: { forge_user_id: userId, plan_key: planKey } },
  }, { idempotencyKey: `forge-checkout-${userId}-${planKey}` });

  return json({ requestId, code: 'OK', url: session.url }, 200, cors);
});
