-- ============================================================================
-- FORGE — UNIFY PLATFORM ADMIN AUTHORITY
-- ============================================================================
-- Removes divergent admin authorization sources and makes `platform_admins`
-- the SINGLE trusted source of platform-admin authority across RLS and all
-- Edge Functions.
--
-- BEFORE (three divergent sources):
--   1. forge-admin          -> platform_admins (correct)
--   2. is_forge_admin() RLS -> profiles.role = 'forge_admin'
--   3. forge-providers      -> profiles.role = 'admin'
--
-- AFTER:
--   * is_forge_admin()               -> active platform_admins record
--   * has_platform_permission(uid,p) -> role + stored-permission aware check
--   * AI-related RLS                 -> ai.operate
--   * Template RLS                   -> templates.moderate
--   * profiles.role                  -> NO LONGER used for platform authz
--
-- NOTE: This migration does NOT drop `profiles.role`. It is retained because
-- it may still have non-admin business use, but it is no longer read by any
-- platform-authorization path. Legacy values ('forge_admin' / 'admin') are not
-- auto-migrated — see "LEGACY ROLE MIGRATION" note at the bottom.
--
-- Idempotent: functions use CREATE OR REPLACE; policies use DROP IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. `is_forge_admin` — now resolves from `platform_admins` (active), not
--    `profiles.role`. Kept as a coarse "is an active platform admin" gate for
--    any legacy callers; the specific policies below prefer the finer-grained
--    `has_platform_permission`.
-- ---------------------------------------------------------------------------
create or replace function public.is_forge_admin(p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select (auth.uid() is distinct from p_user_id) = false
    and exists (
      select 1 from public.platform_admins pa
      where pa.user_id = p_user_id and pa.active = true
    );
$function$;

-- ---------------------------------------------------------------------------
-- 2. `has_platform_permission` — permission-aware check mirroring the Owner
--    Console `ROLE_PERMISSIONS` model (forge-admin edge function).
--    * super_admin -> wildcard
--    * stored `permissions` jsonb array may grant an explicit permission or '*'
--    * remaining roles map to their fixed permission sets.
-- ---------------------------------------------------------------------------
create or replace function public.has_platform_permission(p_user_id uuid, p_permission text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select (auth.uid() is distinct from p_user_id) = false
    and exists (
      select 1 from public.platform_admins pa
      where pa.user_id = p_user_id
        and pa.active = true
        and (
          pa.role = 'super_admin'
          or coalesce(pa.permissions, '[]'::jsonb) ? '*'
          or coalesce(pa.permissions, '[]'::jsonb) ? p_permission
          or (pa.role = 'operations_admin' and p_permission = any (array['dashboard.read','health.read','deployments.operate','ai.operate','incidents.manage','forms.read']))
          or (pa.role = 'support_admin' and p_permission = any (array['dashboard.read','users.manage','users.suspend','projects.inspect','support.mode','forms.read']))
          or (pa.role = 'billing_admin' and p_permission = any (array['dashboard.read','billing.read','billing.operate']))
          or (pa.role = 'security_admin' and p_permission = any (array['dashboard.read','security.read','audit.read','users.manage','health.read']))
          or (pa.role = 'template_moderator' and p_permission = any (array['dashboard.read','templates.moderate']))
        )
    );
$function$;

-- ---------------------------------------------------------------------------
-- 3. `can_admin_template` — template admin now resolves through
--    `templates.moderate` (Owner + Template Moderator), not `is_forge_admin`.
-- ---------------------------------------------------------------------------
create or replace function public.can_admin_template(tid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.templates t
    where t.id = tid and (
      t.owner_id = auth.uid()
      or public.has_platform_permission(auth.uid(), 'templates.moderate')
    )
  );
$function$;

-- ---------------------------------------------------------------------------
-- 4. RLS policies — privileged access now resolves through platform_admins.
--    AI tables -> ai.operate; template tables -> templates.moderate.
-- ---------------------------------------------------------------------------

-- ai_change_sets
drop policy if exists "ai_change_sets_select_admin" on public.ai_change_sets;
create policy "ai_change_sets_select_admin" on public.ai_change_sets for select to authenticated using (has_platform_permission(auth.uid(), 'ai.operate'));

-- ai_jobs
drop policy if exists "ai_jobs_select_admin" on public.ai_jobs;
create policy "ai_jobs_select_admin" on public.ai_jobs for select to authenticated using (has_platform_permission(auth.uid(), 'ai.operate'));

-- ai_models
drop policy if exists "ai_models_admin_delete" on public.ai_models;
create policy "ai_models_admin_delete" on public.ai_models for delete to authenticated using (has_platform_permission(auth.uid(), 'ai.operate'));
drop policy if exists "ai_models_admin_update" on public.ai_models;
create policy "ai_models_admin_update" on public.ai_models for update to authenticated using (has_platform_permission(auth.uid(), 'ai.operate')) with check (has_platform_permission(auth.uid(), 'ai.operate'));
drop policy if exists "ai_models_admin_write" on public.ai_models;
create policy "ai_models_admin_write" on public.ai_models for insert to authenticated with check (has_platform_permission(auth.uid(), 'ai.operate'));

-- ai_providers
drop policy if exists "ai_providers_admin_delete" on public.ai_providers;
create policy "ai_providers_admin_delete" on public.ai_providers for delete to authenticated using (has_platform_permission(auth.uid(), 'ai.operate'));
drop policy if exists "ai_providers_admin_update" on public.ai_providers;
create policy "ai_providers_admin_update" on public.ai_providers for update to authenticated using (has_platform_permission(auth.uid(), 'ai.operate')) with check (has_platform_permission(auth.uid(), 'ai.operate'));
drop policy if exists "ai_providers_admin_write" on public.ai_providers;
create policy "ai_providers_admin_write" on public.ai_providers for insert to authenticated with check (has_platform_permission(auth.uid(), 'ai.operate'));

-- template_reviews
drop policy if exists "template_reviews_insert" on public.template_reviews;
create policy "template_reviews_insert" on public.template_reviews for insert to public with check (has_platform_permission(auth.uid(), 'templates.moderate'));
drop policy if exists "template_reviews_select" on public.template_reviews;
create policy "template_reviews_select" on public.template_reviews for select to public using (((reviewer_id = auth.uid()) or (exists (select 1 from templates t where ((t.id = template_reviews.template_id) and (t.owner_id = auth.uid())))) or has_platform_permission(auth.uid(), 'templates.moderate')));
drop policy if exists "template_reviews_update" on public.template_reviews;
create policy "template_reviews_update" on public.template_reviews for update to public using (has_platform_permission(auth.uid(), 'templates.moderate')) with check (has_platform_permission(auth.uid(), 'templates.moderate'));

-- templates
drop policy if exists "templates_delete" on public.templates;
create policy "templates_delete" on public.templates for delete to public using (((owner_id = auth.uid()) or has_platform_permission(auth.uid(), 'templates.moderate')));
drop policy if exists "templates_update" on public.templates;
create policy "templates_update" on public.templates for update to public using (((owner_id = auth.uid()) or has_platform_permission(auth.uid(), 'templates.moderate'))) with check (((owner_id = auth.uid()) or has_platform_permission(auth.uid(), 'templates.moderate')));

-- ---------------------------------------------------------------------------
-- 5. LEGACY ROLE MIGRATION NOTE
-- ---------------------------------------------------------------------------
-- `profiles.role` is retained but is no longer used for platform authorization.
-- No auto-promotion is performed. If legacy admins existed (roles 'forge_admin'
-- or 'admin'), they must be mapped to `platform_admins` conservatively and
-- manually — never auto-mapped to super_admin. To seed the FIRST Owner after
-- this migration, insert explicitly, e.g.:
--
--   insert into public.platform_admins (user_id, role, permissions, active)
--   values ('<auth.users id>', 'super_admin', '["*"]', true);
--
-- The Owner role remains explicitly controlled.
-- ============================================================================