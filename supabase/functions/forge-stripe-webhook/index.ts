import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe@14';

/* ──────────────────────────────────────────────────────────────
   Forge Stripe Webhook — signature-verified, idempotent Stripe
   event ingestion. Public (Stripe has no Forge JWT) but every event
   is verified against STRIPE_WEBHOOK_SECRET before any processing.
   ────────────────────────────────────────────────────────────── */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const STRIPE_RESTRICTED_KEY = Deno.env.get('STRIPE_RESTRICTED_KEY') ?? '';

let stripe: Stripe | null = null;
if (STRIPE_RESTRICTED_KEY) {
  stripe = new Stripe(STRIPE_RESTRICTED_KEY, { apiVersion: '2024-06-20' });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function recordEvent(admin: ReturnType<typeof createClient>, stripeEventId: string, eventType: string) {
  // Insert is deduped by the unique stripe_event_id constraint. A conflict
  // means the event was already processed — return false so we skip it.
  const { error } = await admin.from('billing_events').insert({
    stripe_event_id: stripeEventId, event_type: eventType, processing_status: 'received', received_at: new Date().toISOString(),
  });
  return !error;
}

async function markProcessed(admin: ReturnType<typeof createClient>, stripeEventId: string, status: string, safeError?: string) {
  await admin.from('billing_events').update({
    processing_status: status, safe_error: safeError ?? null, processed_at: new Date().toISOString(),
  }).eq('stripe_event_id', stripeEventId);
}

async function applySubscription(admin: ReturnType<typeof createClient>, sub: Stripe.Subscription) {
  const userId = (sub.metadata?.forge_user_id) ?? (sub.items.data[0]?.price?.metadata?.forge_user_id);
  if (!userId) return;

  const price = sub.items.data[0]?.price;
  const planKey = (sub.metadata?.plan_key) ?? (price?.lookup_key) ?? 'free';

  await admin.from('subscriptions').upsert({
    stripe_subscription_id: sub.id,
    user_id: userId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_price_id: price?.id ?? null,
    plan_key: planKey,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
}

async function handleEvent(admin: ReturnType<typeof createClient>, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string' && stripe) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        await applySubscription(admin, sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await applySubscription(admin, event.data.object as Stripe.Subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.forge_user_id;
      if (userId) {
        await admin.from('subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (typeof invoice.subscription === 'string' && stripe) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await applySubscription(admin, sub);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (typeof invoice.subscription === 'string') {
        await admin.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
    default:
      break;
  }
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook not configured' }, 503);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing signature' }, 400);

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return json({ error: 'Invalid signature' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const isNew = await recordEvent(admin, event.id, event.type);
  if (!isNew) return json({ received: true, duplicate: true });

  try {
    await handleEvent(admin, event);
    await markProcessed(admin, event.id, 'processed');
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : 'processing error';
    await markProcessed(admin, event.id, 'failed', message);
    return json({ received: true, error: 'processing_failed' }, 500);
  }

  // Return quickly; heavier follow-up work would be queued here.
  return json({ received: true });
});
