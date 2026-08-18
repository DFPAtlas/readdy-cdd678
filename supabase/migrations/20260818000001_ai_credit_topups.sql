-- ============================================================================
-- FORGE — AI CREDIT TOP-UPS (Prompt 3: secure one-time credit purchases)
-- ============================================================================
-- Adds the purchased-credit bucket alongside the existing monthly-included
-- bucket, enforces monthly-first → purchased-second consumption order, and
-- provides a trusted balance helper consumed by the server.
--
-- CREDIT BUCKET MODEL
--   * MONTHLY INCLUDED  — plan entitlement `monthly_ai_credits`, resets each
--     billing period. Consumed first.
--   * PURCHASED         — `usage_ledger` rows with `usage_type =
--     'ai_credit_purchase'` (settled). Never reset; persist until consumed.
--
-- The authoritative balance is ALWAYS computed server-side here. The browser
-- never holds an authoritative balance; it only displays returned values.
--
-- FORWARD-ONLY and IDEMPOTENT: `create or replace function` / `create index
-- if not exists`. It does NOT edit the baseline migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. INDEX — purchased-credit lookup by user + type
-- ---------------------------------------------------------------------------
create index if not exists idx_usage_ledger_user_type
  on public.usage_ledger (user_id, usage_type, status);

-- ---------------------------------------------------------------------------
-- 2. forge_credit_balance(p_user_id)
--    Trusted balance: monthly included + purchased, monthly consumed first.
--    Callable by service_role (Edge Functions) or by the owning user.
--    Returns:
--      plan_key, monthly_credit_limit, monthly_credits_used,
--      monthly_credits_remaining, purchased_credits_total,
--      purchased_credits_used, purchased_credits_remaining,
--      total_credits_remaining
-- ---------------------------------------------------------------------------
create or replace function public.forge_credit_balance(p_user_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan text := 'free';
  v_limit bigint := 0;
  v_period_start timestamptz;
  v_monthly_used bigint := 0;
  v_purchased_total bigint := 0;
  v_consumed_all bigint := 0;
  v_monthly_consumed_all bigint := 0;
  v_prior_monthly bigint := 0;
  v_purchased_used bigint := 0;
begin
  -- Authorization: service_role (Edge Functions) or the owning user only.
  if auth.role() is distinct from 'service_role' then
    if auth.uid() is null or auth.uid() is distinct from p_user_id then
      raise exception 'Not authorized for this user';
    end if;
  end if;

  -- Effective plan + monthly credit limit.
  select coalesce(s.plan_key, 'free') into v_plan
  from public.subscriptions s
  where s.user_id = p_user_id and s.status in ('active','trialing','past_due')
  order by s.created_at desc limit 1;
  if v_plan not in ('starter','builder','pro','agency') then v_plan := 'free'; end if;

  select coalesce(pe.limit_value, 0) into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan and pe.entitlement_key = 'monthly_ai_credits' and pe.active;

  -- Current period start (subscription period, else calendar month).
  select coalesce(s.current_period_start, date_trunc('month', now())) into v_period_start
  from public.subscriptions s
  where s.user_id = p_user_id and s.status in ('active','trialing','past_due')
  order by s.created_at desc limit 1;
  if v_period_start is null then v_period_start := date_trunc('month', now()); end if;

  -- Monthly consumption in the current period.
  select coalesce(sum(quantity), 0) into v_monthly_used
  from public.usage_ledger
  where user_id = p_user_id and usage_type = 'ai_credit'
    and status in ('reserved','settled') and created_at >= v_period_start;

  -- Purchased credits granted (settled purchase entries).
  select coalesce(sum(quantity), 0) into v_purchased_total
  from public.usage_ledger
  where user_id = p_user_id and usage_type = 'ai_credit_purchase' and status = 'settled';

  -- Total AI consumption across all time.
  select coalesce(sum(quantity), 0) into v_consumed_all
  from public.usage_ledger
  where user_id = p_user_id and usage_type = 'ai_credit' and status in ('reserved','settled');

  -- Monthly allowance consumed in all PRIOR closed billing periods.
  select coalesce(sum(least(p.c, v_limit)), 0) into v_prior_monthly
  from (
    select up.period_start, up.period_end,
      coalesce((
        select sum(ul.quantity) from public.usage_ledger ul
        where ul.user_id = p_user_id and ul.usage_type = 'ai_credit'
          and ul.status in ('reserved','settled')
          and ul.created_at >= up.period_start and ul.created_at < up.period_end
      ), 0) as c
    from public.usage_periods up
    where up.user_id = p_user_id and up.period_end < now()
  ) p;

  v_monthly_consumed_all := least(v_monthly_used, v_limit) + v_prior_monthly;
  v_purchased_used := greatest(0, v_consumed_all - v_monthly_consumed_all);
  -- Purchased can never be consumed beyond what was granted.
  v_purchased_used := least(v_purchased_used, v_purchased_total);

  return jsonb_build_object(
    'plan_key', v_plan,
    'monthly_credit_limit', v_limit,
    'monthly_credits_used', least(v_monthly_used, v_limit),
    'monthly_credits_remaining', greatest(0, v_limit - v_monthly_used),
    'purchased_credits_total', v_purchased_total,
    'purchased_credits_used', v_purchased_used,
    'purchased_credits_remaining', greatest(0, v_purchased_total - v_purchased_used),
    'total_credits_remaining', greatest(0, v_limit - v_monthly_used) + greatest(0, v_purchased_total - v_purchased_used)
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. reserve_ai_credits — monthly-first, purchased-second.
--    A reservation is allowed when the requested quantity fits within the
--    combined remaining monthly + purchased credits (monthly consumed first).
--    The returned INSUFFICIENT_CREDITS payload keeps the existing shape plus
--    the purchased/total remaining figures.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_ai_credits(p_user_id uuid, p_project_id uuid, p_usage_type text, p_quantity bigint, p_idempotency_key text, p_provider text, p_model text, p_metadata jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_plan text := 'free';
  v_limit bigint;
  v_period_start timestamptz;
  v_used bigint;
  v_reservation uuid;
  v_balance jsonb;
  v_monthly_remaining bigint := 0;
  v_purchased_remaining bigint := 0;
  v_total_remaining bigint := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized for this user';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  select id into v_reservation from usage_ledger
    where idempotency_key = p_idempotency_key and user_id = p_user_id;
  if v_reservation is not null then
    return jsonb_build_object('ok', true, 'reservation_id', v_reservation, 'idempotent', true);
  end if;

  -- Resolve plan (for the error payload) and compute the trusted balance.
  select coalesce(s.plan_key, 'free') into v_plan from subscriptions s
    where s.user_id = p_user_id and s.status in ('active','trialing','past_due')
    order by s.created_at desc limit 1;
  if v_plan not in ('starter','builder','pro','agency') then v_plan := 'free'; end if;

  v_balance := public.forge_credit_balance(p_user_id);
  v_limit := coalesce((v_balance->>'monthly_credit_limit')::bigint, 0);
  v_used := coalesce((v_balance->>'monthly_credits_used')::bigint, 0);
  v_monthly_remaining := coalesce((v_balance->>'monthly_credits_remaining')::bigint, 0);
  v_purchased_remaining := coalesce((v_balance->>'purchased_credits_remaining')::bigint, 0);
  v_total_remaining := v_monthly_remaining + v_purchased_remaining;

  if p_quantity > v_total_remaining then
    return jsonb_build_object(
      'ok', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'used', v_used,
      'limit', v_limit,
      'purchased_remaining', v_purchased_remaining,
      'total_remaining', v_total_remaining,
      'plan', v_plan
    );
  end if;

  insert into usage_ledger (user_id, project_id, usage_type, quantity, status, idempotency_key, provider, model, safe_metadata)
  values (p_user_id, p_project_id, p_usage_type, p_quantity, 'reserved', p_idempotency_key, p_provider, p_model, p_metadata)
  returning id into v_reservation;

  return jsonb_build_object('ok', true, 'reservation_id', v_reservation, 'used', v_used + p_quantity, 'limit', v_limit, 'plan', v_plan);
end;
$function$;