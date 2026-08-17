-- ============================================================================
-- FORGE — DATABASE SCHEMA BASELINE
-- ============================================================================
-- Captures the canonical application schema of THE FORGE as discovered from
-- the live Supabase database on 2026-08-15.
--
-- This is a BASELINE, not a historical migration record. The live database was
-- built manually (outside `supabase db push`); only two migrations existed
-- remotely before this baseline was authored (see docs/database-migrations.md).
--
-- IMPORTANT:
--   * SCHEMA ONLY — no user / customer / content data is included.
--   * IDEMPOTENT — every statement uses IF NOT EXISTS / OR REPLACE / DROP IF
--     EXISTS so it is safe to run against a database that already contains
--     these objects. It never issues DROP TABLE / TRUNCATE / DELETE / DROP
--     SCHEMA / CASCADE against production.
--   * This baseline reflects CURRENT state, including later manual edits that
--     post-date the two remote migrations (notably `current_user_plan`, which
--     is SECURITY DEFINER + plpgsql in the live DB).
--
-- Apply to the existing production DB WITHOUT re-executing via:
--     supabase migration repair --status applied 20260815000000
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. APPLICATION SCHEMA (forge_internal)
--    Holds internal helper/trigger functions used by public tables.
-- ----------------------------------------------------------------------------
create schema if not exists forge_internal;

-- ----------------------------------------------------------------------------
-- 3. TABLES (dependency-safe order)
-- ----------------------------------------------------------------------------

-- profiles
create table if not exists public.profiles (
  id uuid not null,
  email text,
  display_name text,
  initials text,
  avatar_url text,
  preferences jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  role text not null default 'user'::text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

-- workspaces
create table if not exists public.workspaces (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  owner_id uuid not null,
  member_count integer not null default 1,
  project_count integer not null default 0,
  settings jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint workspaces_pkey primary key (id),
  constraint workspaces_slug_key unique (slug),
  constraint workspaces_owner_id_fkey foreign key (owner_id) references public.profiles(id) on delete cascade
);

-- projects
create table if not exists public.projects (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  workspace_id uuid not null,
  status text not null default 'draft'::text,
  blueprint jsonb,
  settings jsonb,
  stats jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint projects_pkey primary key (id),
  constraint projects_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade
);

-- ai_providers
create table if not exists public.ai_providers (
  id uuid not null default gen_random_uuid(),
  provider_key text not null,
  display_name text not null,
  status text not null default 'disabled'::text,
  base_url text,
  capabilities jsonb,
  data_classification text not null default 'cloud'::text,
  last_health_check timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ai_providers_pkey primary key (id),
  constraint ai_providers_provider_key_key unique (provider_key)
);

-- ai_models
create table if not exists public.ai_models (
  id uuid not null default gen_random_uuid(),
  provider_id uuid not null,
  model_key text not null,
  display_name text,
  capabilities jsonb,
  allowed_plans jsonb,
  context_window integer,
  input_types jsonb,
  output_types jsonb,
  relative_speed integer,
  relative_cost integer,
  routing_priority integer not null default 100,
  fallback_priority integer,
  data_handling text not null default 'cloud'::text,
  enabled boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ai_models_pkey primary key (id),
  constraint ai_models_provider_id_model_key_key unique (provider_id, model_key),
  constraint ai_models_provider_id_fkey foreign key (provider_id) references public.ai_providers(id) on delete cascade
);

-- feature_flags
create table if not exists public.feature_flags (
  id uuid not null default gen_random_uuid(),
  flag_key text not null,
  configuration jsonb,
  enabled boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint feature_flags_pkey primary key (id),
  constraint feature_flags_flag_key_key unique (flag_key)
);

-- plan_entitlements
create table if not exists public.plan_entitlements (
  id uuid not null default gen_random_uuid(),
  plan_key text not null,
  entitlement_key text not null,
  limit_value bigint,
  configuration jsonb,
  active boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  constraint plan_entitlements_pkey primary key (id),
  constraint plan_entitlements_plan_entitlement_key unique (plan_key, entitlement_key)
);

-- platform_admins
create table if not exists public.platform_admins (
  user_id uuid not null,
  role text not null default 'support_admin'::text,
  permissions jsonb,
  active boolean not null default true,
  granted_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint platform_admins_pkey primary key (user_id)
);

-- platform_incidents
create table if not exists public.platform_incidents (
  id uuid not null default gen_random_uuid(),
  severity text not null,
  title text not null,
  affected_services jsonb,
  status text not null default 'investigating'::text,
  incident_lead uuid,
  started_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint platform_incidents_pkey primary key (id)
);

-- incident_events
create table if not exists public.incident_events (
  id uuid not null default gen_random_uuid(),
  incident_id uuid not null,
  actor_id uuid,
  event_type text,
  message text,
  created_at timestamp with time zone not null default now(),
  constraint incident_events_pkey primary key (id),
  constraint incident_events_incident_id_fkey foreign key (incident_id) references public.platform_incidents(id) on delete cascade
);

-- service_health_checks
create table if not exists public.service_health_checks (
  id uuid not null default gen_random_uuid(),
  service_key text not null,
  environment text not null,
  status text not null,
  response_time_ms integer,
  safe_error text,
  checked_at timestamp with time zone not null default now(),
  constraint service_health_checks_pkey primary key (id)
);

-- admin_audit_events
create table if not exists public.admin_audit_events (
  id uuid not null default gen_random_uuid(),
  admin_user_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  safe_metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint admin_audit_events_pkey primary key (id)
);

-- notifications
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'info'::text,
  title text not null,
  message text,
  is_read boolean not null default false,
  project_id uuid,
  action_url text,
  created_at timestamp with time zone not null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint notifications_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- subscriptions
create table if not exists public.subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_price_id text,
  plan_key text not null default 'free'::text,
  status text not null default 'incomplete'::text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  trial_end timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  billing_interval text,
  stripe_event_created timestamp with time zone,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id)
);

-- billing_customers
create table if not exists public.billing_customers (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  stripe_customer_id text,
  billing_email text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_customers_pkey primary key (id),
  constraint billing_customers_stripe_customer_id_key unique (stripe_customer_id),
  constraint billing_customers_user_id_key unique (user_id)
);

-- billing_events
create table if not exists public.billing_events (
  id uuid not null default gen_random_uuid(),
  stripe_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received'::text,
  attempt_count integer not null default 0,
  safe_error text,
  received_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone,
  constraint billing_events_pkey primary key (id),
  constraint billing_events_stripe_event_id_key unique (stripe_event_id)
);

-- ai_entitlements
create table if not exists public.ai_entitlements (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid not null,
  plan_code text not null default 'free'::text,
  monthly_credit_limit integer not null default 300,
  monthly_request_limit integer not null default 30,
  daily_page_request_limit integer not null default 5,
  maximum_prompt_characters integer not null default 2000,
  maximum_output_tokens integer not null default 2048,
  allowed_task_classes text[] not null default '{fast_edit,copywriting,seo}'::text[],
  period_start timestamp with time zone not null default date_trunc('month'::text, now()),
  period_end timestamp with time zone not null default (date_trunc('month'::text, now()) + '1 mon'::interval),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint ai_entitlements_pkey primary key (id),
  constraint ai_entitlements_user_workspace_unique unique (user_id, workspace_id),
  constraint ai_entitlements_daily_page_request_limit_check check ((daily_page_request_limit >= 0)),
  constraint ai_entitlements_maximum_output_tokens_check check ((maximum_output_tokens >= 0)),
  constraint ai_entitlements_maximum_prompt_characters_check check ((maximum_prompt_characters >= 0)),
  constraint ai_entitlements_monthly_credit_limit_check check ((monthly_credit_limit >= 0)),
  constraint ai_entitlements_monthly_request_limit_check check ((monthly_request_limit >= 0))
);

-- usage_periods
create table if not exists public.usage_periods (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  subscription_id uuid,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  status text not null default 'open'::text,
  created_at timestamp with time zone not null default now(),
  constraint usage_periods_pkey primary key (id)
);

-- usage_ledger
create table if not exists public.usage_ledger (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,
  period_id uuid,
  usage_type text not null,
  quantity bigint not null default 0,
  status text not null default 'reserved'::text,
  idempotency_key text,
  provider text,
  model text,
  safe_metadata jsonb,
  created_at timestamp with time zone not null default now(),
  settled_at timestamp with time zone,
  constraint usage_ledger_pkey primary key (id),
  constraint usage_ledger_idempotency_key_key unique (idempotency_key)
);

-- workspace_ai_keys
create table if not exists public.workspace_ai_keys (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  provider_key text not null,
  encrypted_key text not null,
  key_suffix text not null,
  environment text not null default 'production'::text,
  created_by uuid,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint workspace_ai_keys_pkey primary key (id),
  constraint workspace_ai_keys_workspace_id_provider_key_environment_key unique (workspace_id, provider_key, environment)
);

-- ai_jobs
create table if not exists public.ai_jobs (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid,
  project_id uuid,
  requested_scope text not null default 'page'::text,
  task_type text not null,
  status text not null default 'queued'::text,
  selected_model_id uuid,
  selected_model_key text,
  selected_provider text,
  estimated_credits integer not null default 0,
  reserved_credits integer not null default 0,
  settled_credits integer not null default 0,
  idempotency_key text not null,
  safe_error text,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  constraint ai_jobs_pkey primary key (id),
  constraint ai_jobs_idempotency_key_key unique (idempotency_key),
  constraint ai_jobs_selected_model_id_fkey foreign key (selected_model_id) references public.ai_models(id) on delete set null
);

-- ai_agent_runs
create table if not exists public.ai_agent_runs (
  id uuid not null default gen_random_uuid(),
  ai_job_id uuid not null,
  agent_type text not null,
  model_id uuid,
  model_key text,
  status text not null default 'queued'::text,
  input_units integer not null default 0,
  output_units integer not null default 0,
  duration_ms integer not null default 0,
  safe_metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint ai_agent_runs_pkey primary key (id),
  constraint ai_agent_runs_ai_job_id_fkey foreign key (ai_job_id) references public.ai_jobs(id) on delete cascade,
  constraint ai_agent_runs_model_id_fkey foreign key (model_id) references public.ai_models(id) on delete set null
);

-- ai_change_sets
create table if not exists public.ai_change_sets (
  id uuid not null default gen_random_uuid(),
  ai_job_id uuid not null,
  project_id uuid not null,
  base_version_id uuid,
  operations jsonb,
  validation_status text not null default 'pending'::text,
  decision_status text not null default 'pending'::text,
  decided_by uuid,
  decided_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint ai_change_sets_pkey primary key (id),
  constraint ai_change_sets_ai_job_id_fkey foreign key (ai_job_id) references public.ai_jobs(id) on delete cascade
);

-- ai_usage_events
create table if not exists public.ai_usage_events (
  id uuid not null default gen_random_uuid(),
  request_id text not null,
  user_id uuid not null,
  workspace_id uuid not null,
  project_id uuid,
  page_id text,
  provider text,
  model text,
  task_class text,
  status text not null default 'pending'::text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  credits_used integer not null default 0,
  estimated_cost_micros bigint not null default 0,
  duration_ms integer not null default 0,
  error_code text,
  created_at timestamp with time zone not null default now(),
  constraint ai_usage_events_pkey primary key (id),
  constraint ai_usage_events_request_id_key unique (request_id),
  constraint ai_usage_events_credits_used_check check ((credits_used >= 0)),
  constraint ai_usage_events_duration_ms_check check ((duration_ms >= 0)),
  constraint ai_usage_events_estimated_cost_micros_check check ((estimated_cost_micros >= 0)),
  constraint ai_usage_events_input_tokens_check check ((input_tokens >= 0)),
  constraint ai_usage_events_output_tokens_check check ((output_tokens >= 0)),
  constraint ai_usage_events_status_check check ((status = any (array['pending'::text, 'success'::text, 'failed'::text, 'cancelled'::text, 'rejected'::text, 'fallback'::text])))
);

-- assets
create table if not exists public.assets (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  type text not null default 'other'::text,
  mime_type text,
  size bigint not null default 0,
  url text,
  alt_text text,
  created_at timestamp with time zone not null default now(),
  constraint assets_pkey primary key (id),
  constraint assets_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- builds
create table if not exists public.builds (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  version text,
  status text not null default 'queued'::text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration integer,
  build_number integer,
  source_version_id uuid,
  requested_by uuid,
  environment text,
  blueprint_checksum text,
  artifact_path text,
  artifact_checksum text,
  warning_count integer default 0,
  error_count integer default 0,
  manifest jsonb,
  failure_code text,
  failure_message text,
  cancelled_at timestamp with time zone,
  constraint builds_pkey primary key (id),
  constraint builds_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- project_versions
create table if not exists public.project_versions (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  label text,
  description text,
  build_id uuid,
  is_checkpoint boolean not null default false,
  created_at timestamp with time zone not null default now(),
  blueprint jsonb,
  schema_version integer not null default 3,
  version_number integer not null,
  source text not null default 'manual'::text,
  created_by uuid,
  page_ids jsonb,
  change_summary text,
  checksum text,
  parent_version_id uuid,
  restored_from_version_id uuid,
  published_at timestamp with time zone,
  metadata jsonb,
  constraint project_versions_pkey primary key (id),
  constraint project_versions_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_versions_build_id_fkey foreign key (build_id) references public.builds(id) on delete set null
);

-- exports
create table if not exists public.exports (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  version_id uuid,
  format text not null default 'zip'::text,
  status text not null default 'pending'::text,
  file_size bigint,
  download_url text,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  requested_by uuid,
  build_id uuid,
  artifact_path text,
  checksum text,
  expires_at timestamp with time zone,
  manifest jsonb,
  failure_code text,
  failure_message text,
  constraint exports_pkey primary key (id),
  constraint exports_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint exports_version_id_fkey foreign key (version_id) references public.project_versions(id) on delete set null
);

-- deployments
create table if not exists public.deployments (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  build_id uuid,
  source_version_id uuid,
  requested_by uuid,
  environment text not null,
  provider text,
  provider_project_id text,
  provider_deployment_id text,
  status text not null default 'queued'::text,
  deployment_url text,
  artifact_checksum text,
  idempotency_key text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_ms bigint,
  error_code text,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint deployments_pkey primary key (id),
  constraint deployments_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- deployment_events
create table if not exists public.deployment_events (
  id uuid not null default gen_random_uuid(),
  deployment_id uuid not null,
  project_id uuid not null,
  event_type text not null,
  previous_status text,
  new_status text,
  message text,
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint deployment_events_pkey primary key (id),
  constraint deployment_events_deployment_id_fkey foreign key (deployment_id) references public.deployments(id) on delete cascade
);

-- domains
create table if not exists public.domains (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  hostname text not null,
  environment text not null default 'production'::text,
  provider text,
  status text not null default 'pending'::text,
  verification_token_hash text,
  dns_records jsonb,
  ssl_status text not null default 'pending'::text,
  verified_at timestamp with time zone,
  last_checked_at timestamp with time zone,
  is_primary boolean not null default false,
  redirect_www boolean not null default false,
  force_https boolean not null default true,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint domains_pkey primary key (id),
  constraint domains_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- cms_collections
create table if not exists public.cms_collections (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  singular_name text not null,
  slug text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  description text,
  icon text,
  display_field_key text,
  sort_field_key text,
  default_sort_order text not null default 'desc'::text,
  status text not null default 'active'::text,
  created_by uuid,
  constraint cms_collections_pkey primary key (id),
  constraint cms_collections_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- cms_items
create table if not exists public.cms_items (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  collection_id uuid not null,
  slug text not null,
  created_at timestamp with time zone not null default now(),
  status text not null default 'draft'::text,
  field_values jsonb not null default jsonb_build_object(),
  published_values jsonb,
  scheduled_publish_at timestamp with time zone,
  scheduled_unpublish_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  published_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  constraint cms_items_pkey primary key (id),
  constraint cms_items_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint cms_items_collection_id_fkey foreign key (collection_id) references public.cms_collections(id) on delete cascade
);

-- cms_fields
create table if not exists public.cms_fields (
  id uuid not null default gen_random_uuid(),
  collection_id uuid not null,
  field_key text not null,
  field_type text not null,
  label text not null,
  position integer not null default 0,
  created_at timestamp with time zone not null default now(),
  required boolean not null default false,
  unique_value boolean not null default false,
  configuration jsonb not null default jsonb_build_object(),
  validation jsonb not null default jsonb_build_object(),
  updated_at timestamp with time zone not null default now(),
  constraint cms_fields_pkey primary key (id),
  constraint cms_fields_collection_id_fkey foreign key (collection_id) references public.cms_collections(id) on delete cascade
);

-- cms_item_versions
create table if not exists public.cms_item_versions (
  id uuid not null default gen_random_uuid(),
  cms_item_id uuid not null,
  version_number integer not null,
  values jsonb not null default jsonb_build_object(),
  status text not null default 'draft'::text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint cms_item_versions_pkey primary key (id),
  constraint cms_item_versions_cms_item_id_fkey foreign key (cms_item_id) references public.cms_items(id) on delete cascade
);

-- cms_relationships
create table if not exists public.cms_relationships (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  source_collection_id uuid not null,
  source_item_id uuid not null,
  field_key text not null,
  target_collection_id uuid not null,
  target_item_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint cms_relationships_pkey primary key (id),
  constraint cms_relationships_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint cms_relationships_source_item_id_fkey foreign key (source_item_id) references public.cms_items(id) on delete cascade,
  constraint cms_relationships_target_item_id_fkey foreign key (target_item_id) references public.cms_items(id) on delete cascade
);

-- project_members
create table if not exists public.project_members (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null,
  role text not null default 'reviewer'::text,
  status text not null default 'active'::text,
  invited_by uuid,
  joined_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_members_pkey primary key (id),
  constraint project_members_project_id_user_id_key unique (project_id, user_id),
  constraint project_members_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_members_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint project_members_invited_by_fkey foreign key (invited_by) references public.profiles(id) on delete set null
);

-- project_invitations
create table if not exists public.project_invitations (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  email_normalized text not null,
  role text not null default 'reviewer'::text,
  token_hash text not null,
  expires_at timestamp with time zone,
  invited_by uuid,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint project_invitations_pkey primary key (id),
  constraint project_invitations_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_invitations_invited_by_fkey foreign key (invited_by) references public.profiles(id) on delete set null
);

-- project_approvals
create table if not exists public.project_approvals (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  version_id uuid not null,
  environment text not null default 'production'::text,
  requested_by uuid,
  requested_from uuid,
  status text not null default 'awaiting_review'::text,
  decision_note text,
  requested_at timestamp with time zone not null default now(),
  decided_at timestamp with time zone,
  constraint project_approvals_pkey primary key (id),
  constraint project_approvals_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_approvals_version_id_fkey foreign key (version_id) references public.project_versions(id) on delete cascade,
  constraint project_approvals_requested_by_fkey foreign key (requested_by) references public.profiles(id) on delete set null,
  constraint project_approvals_requested_from_fkey foreign key (requested_from) references public.profiles(id) on delete set null
);

-- project_comments
create table if not exists public.project_comments (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  page_id uuid,
  element_id uuid,
  parent_comment_id uuid,
  author_id uuid not null,
  body text not null,
  position_data jsonb,
  status text not null default 'open'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  constraint project_comments_pkey primary key (id),
  constraint project_comments_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint project_comments_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade,
  constraint project_comments_parent_comment_id_fkey foreign key (parent_comment_id) references public.project_comments(id) on delete cascade,
  constraint project_comments_resolved_by_fkey foreign key (resolved_by) references public.profiles(id) on delete set null
);

-- collaboration_events
create table if not exists public.collaboration_events (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  actor_id uuid,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  safe_metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint collaboration_events_pkey primary key (id),
  constraint collaboration_events_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint collaboration_events_actor_id_fkey foreign key (actor_id) references public.profiles(id) on delete set null
);

-- forms
create table if not exists public.forms (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  page_id text,
  name text not null,
  slug text not null,
  status text not null default 'draft'::text,
  configuration jsonb not null default jsonb_build_object(),
  success_action text not null default 'message'::text,
  success_message text,
  redirect_url text,
  retention_days integer not null default 365,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint forms_pkey primary key (id),
  constraint forms_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- form_fields
create table if not exists public.form_fields (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null,
  field_key text not null,
  field_type text not null,
  label text not null default ''::text,
  position integer not null default 0,
  required boolean not null default false,
  validation jsonb not null default jsonb_build_object(),
  configuration jsonb not null default jsonb_build_object(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint form_fields_pkey primary key (id),
  constraint form_fields_form_id_field_key_key unique (form_id, field_key),
  constraint form_fields_form_id_fkey foreign key (form_id) references public.forms(id) on delete cascade
);

-- form_integrations
create table if not exists public.form_integrations (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null,
  integration_type text not null,
  status text not null default 'disabled'::text,
  encrypted_configuration jsonb not null default jsonb_build_object(),
  field_mapping jsonb not null default jsonb_build_object(),
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint form_integrations_pkey primary key (id),
  constraint form_integrations_form_id_fkey foreign key (form_id) references public.forms(id) on delete cascade
);

-- form_submissions
create table if not exists public.form_submissions (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null,
  project_id uuid not null,
  deployment_id uuid,
  submission_reference text not null,
  status text not null default 'unread'::text,
  submitted_data jsonb not null default jsonb_build_object(),
  source_url text,
  source_domain text,
  referrer text,
  user_agent_hash text,
  ip_hash text,
  consent_data jsonb not null default jsonb_build_object(),
  spam_score numeric,
  created_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone,
  deleted_at timestamp with time zone,
  constraint form_submissions_pkey primary key (id),
  constraint form_submissions_project_id_submission_reference_key unique (project_id, submission_reference),
  constraint form_submissions_form_id_fkey foreign key (form_id) references public.forms(id) on delete cascade,
  constraint form_submissions_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint form_submissions_deployment_id_fkey foreign key (deployment_id) references public.deployments(id) on delete set null
);

-- form_delivery_events
create table if not exists public.form_delivery_events (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null,
  integration_id uuid,
  event_type text not null,
  status text not null default 'pending'::text,
  attempt_number integer not null default 0,
  provider_reference text,
  error_code text,
  safe_error_message text,
  created_at timestamp with time zone not null default now(),
  constraint form_delivery_events_pkey primary key (id),
  constraint form_delivery_events_submission_id_fkey foreign key (submission_id) references public.form_submissions(id) on delete cascade,
  constraint form_delivery_events_integration_id_fkey foreign key (integration_id) references public.form_integrations(id) on delete set null
);

-- form_files
create table if not exists public.form_files (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null,
  form_id uuid not null,
  storage_path text not null,
  original_filename text not null,
  safe_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  scan_status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  constraint form_files_pkey primary key (id),
  constraint form_files_submission_id_fkey foreign key (submission_id) references public.form_submissions(id) on delete cascade,
  constraint form_files_form_id_fkey foreign key (form_id) references public.forms(id) on delete cascade
);

-- forge_analytics_sites
create table if not exists public.forge_analytics_sites (
  id uuid not null default gen_random_uuid(),
  site_key text not null,
  project_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint forge_analytics_sites_pkey primary key (id),
  constraint forge_analytics_sites_site_key_key unique (site_key),
  constraint forge_analytics_sites_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- forge_analytics_events
create table if not exists public.forge_analytics_events (
  id uuid not null default gen_random_uuid(),
  site_id uuid not null,
  event_type text not null default 'page_view'::text,
  path text,
  referrer text,
  country text,
  device text,
  browser text,
  created_at timestamp with time zone not null default now(),
  visitor_id text,
  constraint forge_analytics_events_pkey primary key (id),
  constraint forge_analytics_events_site_id_fkey foreign key (site_id) references public.forge_analytics_sites(id) on delete cascade
);

-- workflows
create table if not exists public.workflows (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft'::text,
  current_version_id uuid,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint workflows_pkey primary key (id),
  constraint workflows_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint workflows_status_check check ((status = any (array['draft'::text, 'active'::text, 'paused'::text, 'failed'::text])))
);

-- workflow_versions
create table if not exists public.workflow_versions (
  id uuid not null default gen_random_uuid(),
  workflow_id uuid not null,
  version_number integer not null,
  definition jsonb,
  validation_status text not null default 'unvalidated'::text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint workflow_versions_pkey primary key (id),
  constraint workflow_versions_workflow_id_version_number_key unique (workflow_id, version_number),
  constraint workflow_versions_workflow_id_fkey foreign key (workflow_id) references public.workflows(id) on delete cascade,
  constraint workflow_versions_validation_status_check check ((validation_status = any (array['unvalidated'::text, 'valid'::text, 'invalid'::text])))
);

-- workflow_connections
create table if not exists public.workflow_connections (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  connection_type text not null,
  display_name text not null,
  encrypted_configuration jsonb,
  status text not null default 'disabled'::text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint workflow_connections_pkey primary key (id),
  constraint workflow_connections_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint workflow_connections_status_check check ((status = any (array['enabled'::text, 'disabled'::text, 'error'::text])))
);

-- workflow_runs
create table if not exists public.workflow_runs (
  id uuid not null default gen_random_uuid(),
  workflow_id uuid not null,
  workflow_version_id uuid not null,
  project_id uuid not null,
  trigger_type text not null,
  trigger_reference text,
  status text not null default 'queued'::text,
  idempotency_key text not null,
  is_test boolean not null default false,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  safe_error text,
  constraint workflow_runs_pkey primary key (id),
  constraint workflow_runs_project_id_idempotency_key_key unique (project_id, idempotency_key),
  constraint workflow_runs_workflow_id_fkey foreign key (workflow_id) references public.workflows(id) on delete cascade,
  constraint workflow_runs_workflow_version_id_fkey foreign key (workflow_version_id) references public.workflow_versions(id),
  constraint workflow_runs_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint workflow_runs_status_check check ((status = any (array['queued'::text, 'running'::text, 'waiting'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'expired'::text, 'dead_letter'::text])))
);

-- workflow_step_runs
create table if not exists public.workflow_step_runs (
  id uuid not null default gen_random_uuid(),
  workflow_run_id uuid not null,
  node_id text not null,
  node_type text not null,
  status text not null default 'pending'::text,
  attempt_number integer not null default 0,
  safe_input_metadata jsonb,
  safe_output_metadata jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  safe_error text,
  constraint workflow_step_runs_pkey primary key (id),
  constraint workflow_step_runs_workflow_run_id_fkey foreign key (workflow_run_id) references public.workflow_runs(id) on delete cascade,
  constraint workflow_step_runs_status_check check ((status = any (array['pending'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text, 'cancelled'::text])))
);

-- workflow_approvals
create table if not exists public.workflow_approvals (
  id uuid not null default gen_random_uuid(),
  workflow_run_id uuid not null,
  node_id text not null,
  requested_from uuid,
  status text not null default 'pending'::text,
  expires_at timestamp with time zone,
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  constraint workflow_approvals_pkey primary key (id),
  constraint workflow_approvals_workflow_run_id_fkey foreign key (workflow_run_id) references public.workflow_runs(id) on delete cascade,
  constraint workflow_approvals_status_check check ((status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);

-- templates
create table if not exists public.templates (
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null,
  workspace_id uuid,
  template_type text not null default 'website'::text,
  name text not null,
  slug text not null,
  description text,
  visibility text not null default 'private'::text,
  moderation_status text not null default 'draft'::text,
  current_version_id uuid,
  licence_key text not null default 'forge-community'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint templates_pkey primary key (id),
  constraint templates_owner_id_slug_key unique (owner_id, slug),
  constraint templates_owner_id_fkey foreign key (owner_id) references public.profiles(id) on delete cascade,
  constraint templates_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete set null
);

-- template_versions
create table if not exists public.template_versions (
  id uuid not null default gen_random_uuid(),
  template_id uuid not null,
  version text not null default '1.0.0'::text,
  manifest jsonb not null,
  integrity_checksum text not null,
  compatibility text,
  release_notes text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint template_versions_pkey primary key (id),
  constraint template_versions_template_id_version_key unique (template_id, version),
  constraint template_versions_template_id_fkey foreign key (template_id) references public.templates(id) on delete cascade,
  constraint template_versions_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null
);

-- template_assets
create table if not exists public.template_assets (
  id uuid not null default gen_random_uuid(),
  template_version_id uuid not null,
  asset_id uuid not null,
  licence_metadata jsonb,
  checksum text,
  created_at timestamp with time zone not null default now(),
  constraint template_assets_pkey primary key (id),
  constraint template_assets_template_version_id_fkey foreign key (template_version_id) references public.template_versions(id) on delete cascade,
  constraint template_assets_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete cascade
);

-- template_installations
create table if not exists public.template_installations (
  id uuid not null default gen_random_uuid(),
  template_id uuid,
  template_version_id uuid,
  project_id uuid,
  installed_by uuid,
  accepted_licence_version text,
  installation_mode text not null,
  created_at timestamp with time zone not null default now(),
  constraint template_installations_pkey primary key (id),
  constraint template_installations_template_id_fkey foreign key (template_id) references public.templates(id) on delete set null,
  constraint template_installations_template_version_id_fkey foreign key (template_version_id) references public.template_versions(id) on delete set null,
  constraint template_installations_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint template_installations_installed_by_fkey foreign key (installed_by) references public.profiles(id) on delete set null
);

-- template_reviews
create table if not exists public.template_reviews (
  id uuid not null default gen_random_uuid(),
  template_id uuid not null,
  reviewer_id uuid,
  status text not null default 'pending'::text,
  findings jsonb,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  constraint template_reviews_pkey primary key (id),
  constraint template_reviews_template_id_fkey foreign key (template_id) references public.templates(id) on delete cascade,
  constraint template_reviews_reviewer_id_fkey foreign key (reviewer_id) references public.profiles(id) on delete set null
);

-- site_roles
create table if not exists public.site_roles (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  role_key text not null,
  name text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  constraint site_roles_pkey primary key (id),
  constraint site_roles_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- site_members
create table if not exists public.site_members (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  auth_user_id uuid,
  email_normalized text,
  display_name text,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone,
  constraint site_members_pkey primary key (id),
  constraint site_members_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- site_member_roles
create table if not exists public.site_member_roles (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  site_member_id uuid not null,
  site_role_id uuid not null,
  granted_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint site_member_roles_pkey primary key (id),
  constraint site_member_roles_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint site_member_roles_site_member_id_fkey foreign key (site_member_id) references public.site_members(id) on delete cascade,
  constraint site_member_roles_site_role_id_fkey foreign key (site_role_id) references public.site_roles(id) on delete cascade
);

-- site_profile_fields
create table if not exists public.site_profile_fields (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  field_key text not null,
  field_type text not null default 'text'::text,
  label text not null,
  required boolean not null default false,
  member_editable boolean not null default false,
  visibility text not null default 'private'::text,
  configuration jsonb not null default jsonb_build_object(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint site_profile_fields_pkey primary key (id),
  constraint site_profile_fields_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade
);

-- site_profile_values
create table if not exists public.site_profile_values (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  site_member_id uuid not null,
  field_id uuid not null,
  value jsonb,
  updated_at timestamp with time zone not null default now(),
  constraint site_profile_values_pkey primary key (id),
  constraint site_profile_values_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint site_profile_values_site_member_id_fkey foreign key (site_member_id) references public.site_members(id) on delete cascade,
  constraint site_profile_values_field_id_fkey foreign key (field_id) references public.site_profile_fields(id) on delete cascade
);

-- site_auth_events
create table if not exists public.site_auth_events (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  site_member_id uuid,
  event_type text not null,
  safe_metadata jsonb not null default jsonb_build_object(),
  created_at timestamp with time zone not null default now(),
  constraint site_auth_events_pkey primary key (id),
  constraint site_auth_events_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  constraint site_auth_events_site_member_id_fkey foreign key (site_member_id) references public.site_members(id) on delete set null
);

-- support_access_sessions
create table if not exists public.support_access_sessions (
  id uuid not null default gen_random_uuid(),
  admin_user_id uuid not null,
  project_id uuid not null,
  scope text,
  reason text,
  status text not null default 'active'::text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  constraint support_access_sessions_pkey primary key (id)
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
--    Emitted idempotently. Constraint-backed indexes are already created by the
--    inline PRIMARY KEY / UNIQUE constraints above; IF NOT EXISTS skips them.
-- ----------------------------------------------------------------------------

create index if not exists idx_admin_audit_admin on public.admin_audit_events using btree (admin_user_id, created_at desc);
create index if not exists idx_ai_agent_runs_job on public.ai_agent_runs using btree (ai_job_id);
create index if not exists idx_ai_change_sets_job on public.ai_change_sets using btree (ai_job_id);
create index if not exists idx_ai_change_sets_project on public.ai_change_sets using btree (project_id);
create index if not exists idx_ai_entitlements_user on public.ai_entitlements using btree (user_id);
create index if not exists idx_ai_jobs_project on public.ai_jobs using btree (project_id);
create index if not exists idx_ai_jobs_status on public.ai_jobs using btree (status);
create index if not exists idx_ai_jobs_user on public.ai_jobs using btree (user_id, created_at desc);
create index if not exists idx_ai_models_enabled on public.ai_models using btree (enabled);
create index if not exists idx_ai_models_provider on public.ai_models using btree (provider_id);
create index if not exists idx_ai_usage_created on public.ai_usage_events using btree (created_at);
create index if not exists idx_ai_usage_page on public.ai_usage_events using btree (page_id);
create index if not exists idx_ai_usage_project on public.ai_usage_events using btree (project_id);
create index if not exists idx_ai_usage_user on public.ai_usage_events using btree (user_id);
create index if not exists idx_ai_usage_workspace on public.ai_usage_events using btree (workspace_id);
create index if not exists idx_billing_customers_user_id on public.billing_customers using btree (user_id);
create index if not exists idx_billing_events_status on public.billing_events using btree (processing_status);
create index if not exists builds_project_created_idx on public.builds using btree (project_id, started_at desc);
create unique index if not exists builds_project_number_key on public.builds using btree (project_id, build_number) where (build_number is not null);
create index if not exists cms_collections_project_idx on public.cms_collections using btree (project_id);
create unique index if not exists cms_collections_project_slug_key on public.cms_collections using btree (project_id, slug);
create index if not exists cms_fields_collection_idx on public.cms_fields using btree (collection_id);
create unique index if not exists cms_fields_collection_key_idx on public.cms_fields using btree (collection_id, field_key);
create index if not exists cms_item_versions_item_idx on public.cms_item_versions using btree (cms_item_id);
create unique index if not exists cms_item_versions_item_version_key on public.cms_item_versions using btree (cms_item_id, version_number);
create unique index if not exists cms_items_collection_slug_key on public.cms_items using btree (collection_id, slug);
create index if not exists cms_items_collection_status_idx on public.cms_items using btree (collection_id, status);
create index if not exists cms_items_project_idx on public.cms_items using btree (project_id);
create index if not exists cms_relationships_project_idx on public.cms_relationships using btree (project_id);
create index if not exists cms_relationships_source_idx on public.cms_relationships using btree (source_item_id);
create index if not exists cms_relationships_target_idx on public.cms_relationships using btree (target_item_id);
create unique index if not exists cms_relationships_unique_link on public.cms_relationships using btree (source_item_id, field_key, target_item_id);
create index if not exists idx_collab_events_created on public.collaboration_events using btree (created_at desc);
create index if not exists idx_collab_events_project on public.collaboration_events using btree (project_id);
create index if not exists deployment_events_created_idx on public.deployment_events using btree (created_at desc);
create index if not exists deployment_events_deployment_idx on public.deployment_events using btree (deployment_id);
create index if not exists deployment_events_project_idx on public.deployment_events using btree (project_id);
create index if not exists deployments_environment_idx on public.deployments using btree (environment);
create index if not exists deployments_project_created_idx on public.deployments using btree (project_id, created_at desc);
create unique index if not exists deployments_project_idempotency_uniq on public.deployments using btree (project_id, idempotency_key);
create index if not exists deployments_project_idx on public.deployments using btree (project_id);
create index if not exists deployments_status_idx on public.deployments using btree (status);
create index if not exists domains_hostname_idx on public.domains using btree (hostname);
create unique index if not exists domains_hostname_uniq on public.domains using btree (lower(hostname));
create index if not exists domains_project_idx on public.domains using btree (project_id);
create index if not exists domains_status_idx on public.domains using btree (status);
create index if not exists exports_project_created_idx on public.exports using btree (project_id, created_at desc);
create index if not exists idx_feature_flags_key on public.feature_flags using btree (flag_key);
create index if not exists idx_analytics_events_site_created on public.forge_analytics_events using btree (site_id, created_at desc);
create index if not exists idx_analytics_sites_project on public.forge_analytics_sites using btree (project_id);
create index if not exists form_delivery_events_status_idx on public.form_delivery_events using btree (status);
create index if not exists form_delivery_events_submission_idx on public.form_delivery_events using btree (submission_id);
create index if not exists form_fields_form_idx on public.form_fields using btree (form_id);
create index if not exists form_fields_form_pos_idx on public.form_fields using btree (form_id, "position");
create index if not exists form_files_form_idx on public.form_files using btree (form_id);
create index if not exists form_files_submission_idx on public.form_files using btree (submission_id);
create index if not exists form_integrations_form_idx on public.form_integrations using btree (form_id);
create index if not exists form_submissions_created_idx on public.form_submissions using btree (created_at desc);
create index if not exists form_submissions_form_idx on public.form_submissions using btree (form_id);
create index if not exists form_submissions_project_idx on public.form_submissions using btree (project_id);
create index if not exists form_submissions_spam_idx on public.form_submissions using btree (spam_score);
create index if not exists form_submissions_status_idx on public.form_submissions using btree (status);
create index if not exists forms_project_idx on public.forms using btree (project_id);
create unique index if not exists forms_project_slug_idx on public.forms using btree (project_id, slug);
create index if not exists forms_status_idx on public.forms using btree (status);
create index if not exists idx_incident_events_incident on public.incident_events using btree (incident_id, created_at);
create index if not exists idx_plan_entitlements_plan on public.plan_entitlements using btree (plan_key) where active;
create index if not exists idx_incidents_status on public.platform_incidents using btree (status);
create index if not exists idx_project_approvals_project on public.project_approvals using btree (project_id);
create index if not exists idx_project_approvals_status on public.project_approvals using btree (status);
create index if not exists idx_project_approvals_version on public.project_approvals using btree (version_id);
create index if not exists idx_project_comments_page on public.project_comments using btree (page_id);
create index if not exists idx_project_comments_parent on public.project_comments using btree (parent_comment_id);
create index if not exists idx_project_comments_project on public.project_comments using btree (project_id);
create index if not exists idx_project_invitations_email on public.project_invitations using btree (email_normalized);
create index if not exists idx_project_invitations_project on public.project_invitations using btree (project_id);
create index if not exists idx_project_invitations_token on public.project_invitations using btree (token_hash);
create index if not exists idx_project_members_project on public.project_members using btree (project_id);
create index if not exists idx_project_members_user on public.project_members using btree (user_id);
create index if not exists project_versions_created_by_idx on public.project_versions using btree (created_by);
create index if not exists project_versions_project_checkpoint_idx on public.project_versions using btree (project_id) where (is_checkpoint = true);
create index if not exists project_versions_project_created_idx on public.project_versions using btree (project_id, created_at desc);
create unique index if not exists project_versions_project_number_idx on public.project_versions using btree (project_id, version_number);
create index if not exists project_versions_published_idx on public.project_versions using btree (project_id) where (published_at is not null);
create index if not exists idx_health_service on public.service_health_checks using btree (service_key, environment, checked_at desc);
create index if not exists site_auth_events_project_idx on public.site_auth_events using btree (project_id, created_at);
create unique index if not exists site_member_roles_member_role_key on public.site_member_roles using btree (site_member_id, site_role_id);
create index if not exists site_member_roles_project_idx on public.site_member_roles using btree (project_id);
create index if not exists site_members_auth_idx on public.site_members using btree (auth_user_id);
create unique index if not exists site_members_project_email_key on public.site_members using btree (project_id, email_normalized);
create index if not exists site_members_project_idx on public.site_members using btree (project_id);
create unique index if not exists site_profile_fields_project_key_key on public.site_profile_fields using btree (project_id, field_key);
create unique index if not exists site_profile_values_member_field_key on public.site_profile_values using btree (site_member_id, field_id);
create index if not exists site_profile_values_member_idx on public.site_profile_values using btree (site_member_id);
create unique index if not exists site_roles_project_key_key on public.site_roles using btree (project_id, role_key);
create index if not exists idx_subscriptions_status on public.subscriptions using btree (status);
create index if not exists idx_subscriptions_user_id on public.subscriptions using btree (user_id);
create index if not exists idx_support_access_project on public.support_access_sessions using btree (project_id, status);
create index if not exists idx_template_assets_asset on public.template_assets using btree (asset_id);
create index if not exists idx_template_assets_version on public.template_assets using btree (template_version_id);
create index if not exists idx_template_installations_project on public.template_installations using btree (project_id);
create index if not exists idx_template_installations_template on public.template_installations using btree (template_id);
create index if not exists idx_template_reviews_template on public.template_reviews using btree (template_id);
create index if not exists idx_template_versions_template on public.template_versions using btree (template_id);
create index if not exists idx_templates_owner on public.templates using btree (owner_id);
create index if not exists idx_templates_visibility on public.templates using btree (visibility, moderation_status);
create index if not exists idx_templates_workspace on public.templates using btree (workspace_id);
create index if not exists idx_usage_ledger_user_created on public.usage_ledger using btree (user_id, created_at);
create index if not exists idx_usage_ledger_user_status on public.usage_ledger using btree (user_id, status);
create index if not exists idx_usage_periods_user on public.usage_periods using btree (user_id, status);
create unique index if not exists usage_periods_user_period_start_key on public.usage_periods using btree (user_id, period_start);
create index if not exists idx_workflow_approvals_run on public.workflow_approvals using btree (workflow_run_id);
create index if not exists idx_workflow_connections_project on public.workflow_connections using btree (project_id);
create index if not exists idx_workflow_runs_project on public.workflow_runs using btree (project_id);
create index if not exists idx_workflow_runs_status on public.workflow_runs using btree (status);
create index if not exists idx_workflow_runs_workflow on public.workflow_runs using btree (workflow_id);
create index if not exists idx_workflow_step_runs_run on public.workflow_step_runs using btree (workflow_run_id);
create index if not exists idx_workflow_versions_workflow on public.workflow_versions using btree (workflow_id);
create index if not exists idx_workflows_project on public.workflows using btree (project_id);
create index if not exists idx_workflows_status on public.workflows using btree (status);
create index if not exists idx_workspace_ai_keys_ws on public.workspace_ai_keys using btree (workspace_id);

-- ----------------------------------------------------------------------------
-- 5. FUNCTIONS (public schema)
--    Reproduced verbatim from pg_get_functiondef of the live database.
-- ----------------------------------------------------------------------------

create or replace function public.can_access_template(tid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.templates t
    where t.id = tid and (
      t.owner_id = auth.uid()
      or (t.workspace_id is not null and exists (select 1 from public.workspaces w where w.id = t.workspace_id and w.owner_id = auth.uid()))
      or (t.visibility = 'community' and t.moderation_status = 'approved')
    )
  );
$function$;

create or replace function public.can_admin_template(tid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.templates t
    where t.id = tid and (t.owner_id = auth.uid() or public.is_forge_admin(auth.uid()))
  );
$function$;

create or replace function public.check_advanced_seo_access(p_user_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'advanced_seo_access'
    and pe.active;

  if (v_plan->>'paid_access') = 'false' or v_limit is null or v_limit < 1 then
    return jsonb_build_object('allowed', false, 'error_code', 'FEATURE_NOT_INCLUDED', 'included', false, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'included', true, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_asset_storage_limit(p_user_id uuid, p_extra_bytes bigint)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit_mb bigint;
  v_limit_bytes bigint;
  v_current_bytes bigint := 0;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_bytes is null or p_extra_bytes < 0 then
    raise exception 'p_extra_bytes must be non-negative';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit_mb
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'asset_storage_mb'
    and pe.active;

  select coalesce(sum(a.size), 0)::bigint into v_current_bytes
  from public.assets a
  join public.projects p on p.id = a.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id;

  v_limit_bytes := case when v_limit_mb is null then null else v_limit_mb * 1024 * 1024 end;

  if v_limit_bytes is not null and (v_current_bytes + p_extra_bytes) > v_limit_bytes then
    return jsonb_build_object('allowed', false, 'error_code', 'PLAN_LIMIT_REACHED', 'current', v_current_bytes, 'limit', v_limit_bytes, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'current', v_current_bytes, 'limit', v_limit_bytes, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_custom_domains_limit(p_user_id uuid, p_project_id uuid, p_extra_domains integer)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
  v_current integer := 0;
  v_owned boolean := false;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_domains is null or p_extra_domains < 1 then
    raise exception 'p_extra_domains must be at least 1';
  end if;

  if p_project_id is not null then
    select exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = p_project_id and w.owner_id = p_user_id
    ) into v_owned;
    if not v_owned then
      raise exception 'Project not found or access denied';
    end if;
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'custom_domains'
    and pe.active;

  select count(*) into v_current
  from public.domains d
  join public.projects p on p.id = d.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id;

  if (v_plan->>'paid_access') = 'false' then
    return jsonb_build_object('allowed', false, 'error_code', 'FEATURE_NOT_INCLUDED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  if v_limit is not null and (v_current + p_extra_domains) > v_limit then
    return jsonb_build_object('allowed', false, 'error_code', 'PLAN_LIMIT_REACHED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_export_access(p_user_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'export_access'
    and pe.active;

  if (v_plan->>'paid_access') = 'false' or v_limit is null or v_limit < 1 then
    return jsonb_build_object('allowed', false, 'error_code', 'FEATURE_NOT_INCLUDED', 'included', false, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'included', true, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_form_submissions_limit(p_project_id uuid, p_extra integer)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_owner uuid;
  v_plan jsonb;
  v_limit bigint;
  v_current integer := 0;
  v_period_start timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Not authenticated';
    end if;
    if not exists (
      select 1 from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = p_project_id and w.owner_id = auth.uid()
    ) then
      raise exception 'Not authorized for this project';
    end if;
  end if;

  if p_extra is null or p_extra < 1 then
    raise exception 'p_extra must be at least 1';
  end if;

  select w.owner_id into v_owner
  from public.projects p
  join public.workspaces w on w.id = p.workspace_id
  where p.id = p_project_id;

  if v_owner is null then
    raise exception 'Project not found';
  end if;

  v_plan := public.resolve_effective_plan(v_owner);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'monthly_form_submissions'
    and pe.active;

  select s.current_period_start into v_period_start
  from public.subscriptions s
  where s.user_id = v_owner
    and s.status in ('active','trialing','past_due')
  order by s.created_at desc limit 1;

  if v_period_start is null then
    v_period_start := date_trunc('month', now());
  end if;

  select count(*) into v_current
  from public.form_submissions fs
  join public.projects p on p.id = fs.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = v_owner
    and fs.deleted_at is null
    and fs.created_at >= v_period_start;

  if v_limit is not null and (v_current + p_extra) > v_limit then
    return jsonb_build_object('allowed', false, 'error_code', 'PLAN_LIMIT_REACHED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_page_limit(p_user_id uuid, p_project_id uuid, p_extra_pages integer)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan text := 'free';
  v_limit bigint;
  v_current integer;
  v_next text := 'starter';
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_pages is null or p_extra_pages < 1 then
    raise exception 'p_extra_pages must be at least 1';
  end if;

  select coalesce(jsonb_array_length(p.blueprint -> 'pages'), 0)::integer
    into v_current
  from public.projects p
  join public.workspaces w on w.id = p.workspace_id
  where p.id = p_project_id and w.owner_id = p_user_id;

  if not found then
    raise exception 'Project not found or access denied';
  end if;

  select public.current_user_plan(p_user_id) into v_plan;
  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan
    and pe.entitlement_key = 'max_pages_per_project'
    and pe.active;

  v_next := case v_plan
    when 'free' then 'starter'
    when 'starter' then 'builder'
    when 'builder' then 'pro'
    when 'pro' then 'agency'
    else 'agency'
  end;

  if v_limit is not null and (v_current + p_extra_pages) > v_limit then
    return jsonb_build_object('allowed', false, 'current', v_current, 'limit', v_limit, 'plan', v_plan, 'next_plan', v_next);
  end if;
  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan, 'next_plan', v_next);
end;
$function$;

create or replace function public.check_priority_ai_access(p_user_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'priority_ai_access'
    and pe.active;

  if (v_plan->>'paid_access') = 'false' or v_limit is null or v_limit < 1 then
    return jsonb_build_object('allowed', false, 'error_code', 'FEATURE_NOT_INCLUDED', 'included', false, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'included', true, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_project_limit(p_user_id uuid, p_extra_projects integer)
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan text := 'free';
  v_limit bigint;
  v_current integer := 0;
  v_next text := 'starter';
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_projects is null or p_extra_projects < 1 then
    raise exception 'p_extra_projects must be at least 1';
  end if;

  select public.current_user_plan(p_user_id) into v_plan;
  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan
    and pe.entitlement_key = 'max_active_projects'
    and pe.active;

  select count(*)::integer into v_current
  from public.projects p
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id
    and coalesce(p.status, 'draft') <> 'archived';

  v_next := case v_plan
    when 'free' then 'starter'
    when 'starter' then 'builder'
    when 'builder' then 'pro'
    when 'pro' then 'agency'
    else 'agency'
  end;

  if v_limit is not null and (v_current + p_extra_projects) > v_limit then
    return jsonb_build_object('allowed', false, 'current', v_current, 'limit', v_limit, 'plan', v_plan, 'next_plan', v_next);
  end if;
  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan, 'next_plan', v_next);
end;
$function$;

create or replace function public.check_published_sites_limit(p_user_id uuid, p_extra_sites integer)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
  v_current integer := 0;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_sites is null or p_extra_sites < 1 then
    raise exception 'p_extra_sites must be at least 1';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'published_sites'
    and pe.active;

  select count(distinct d.project_id) into v_current
  from public.deployments d
  join public.projects p on p.id = d.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id
    and d.environment = 'production'
    and d.status in ('active','completed');

  if (v_plan->>'paid_access') = 'false' then
    return jsonb_build_object('allowed', false, 'error_code', 'PUBLISHING_NOT_INCLUDED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  if v_limit is not null and (v_current + p_extra_sites) > v_limit then
    return jsonb_build_object('allowed', false, 'error_code', 'PLAN_LIMIT_REACHED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.check_team_members_limit(p_user_id uuid, p_project_id uuid, p_extra_members integer)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_plan jsonb;
  v_limit bigint;
  v_current integer := 0;
  v_collab bigint;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;
  if p_extra_members is null or p_extra_members < 1 then
    raise exception 'p_extra_members must be at least 1';
  end if;

  v_plan := public.resolve_effective_plan(p_user_id);

  select pe.limit_value into v_limit
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'max_team_members'
    and pe.active;

  select pe.limit_value into v_collab
  from public.plan_entitlements pe
  where pe.plan_key = v_plan->>'plan_key'
    and pe.entitlement_key = 'collaboration_access'
    and pe.active;

  select count(distinct pm.user_id) into v_current
  from public.project_members pm
  join public.projects p on p.id = pm.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id and pm.status = 'active';

  select v_current + count(distinct pi.email_normalized) into v_current
  from public.project_invitations pi
  join public.projects p on p.id = pi.project_id
  join public.workspaces w on w.id = p.workspace_id
  where w.owner_id = p_user_id and pi.revoked_at is null and pi.accepted_at is null;

  if (v_plan->>'paid_access') = 'false' or v_collab is null or v_collab < 1 then
    return jsonb_build_object('allowed', false, 'error_code', 'FEATURE_NOT_INCLUDED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  if v_limit is not null and (v_current + p_extra_members) > v_limit then
    return jsonb_build_object('allowed', false, 'error_code', 'PLAN_LIMIT_REACHED', 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
  end if;

  return jsonb_build_object('allowed', true, 'current', v_current, 'limit', v_limit, 'plan', v_plan->>'plan_key', 'access_level', v_plan->>'access_level', 'next_plan', v_plan->>'next_plan');
end;
$function$;

create or replace function public.cms_collections_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;

create or replace function public.cms_fields_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$function$;

create or replace function public.cms_item_versions_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := coalesce(new.created_at, now());
    return new;
  end if;
  raise exception 'CMS item versions are immutable';
end;
$function$;

create or replace function public.cms_items_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare r text;
begin
  if tg_op = 'INSERT' then
    r := forge_project_role(new.project_id);
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    if new.status is null then new.status := 'draft'; end if;
    if r not in ('owner','admin') then
      new.status := 'draft';
      new.scheduled_publish_at := null;
      new.scheduled_unpublish_at := null;
    end if;
  else
    r := forge_project_role(old.project_id);
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.project_id := old.project_id;
    new.collection_id := old.collection_id;
    new.updated_by := auth.uid();
    new.updated_at := now();
    if new.status is distinct from old.status and r not in ('owner','admin') then
      raise exception 'Only editors can change publication status';
    end if;
    if new.status = 'published' and old.status is distinct from 'published' then
      new.published_values := new.field_values;
      new.published_at := now();
    end if;
    if new.status is distinct from 'published' and old.status = 'published' then
      new.published_at := null;
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.cms_relationships_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  src_project uuid;
  tgt_project uuid;
begin
  select project_id into src_project from cms_items where id = new.source_item_id;
  select project_id into tgt_project from cms_items where id = new.target_item_id;
  if src_project is null or tgt_project is null or src_project <> tgt_project or src_project <> new.project_id then
    raise exception 'Cross-project CMS relationships are forbidden';
  end if;
  new.project_id := src_project;
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$function$;

create or replace function public.current_user_plan(p_user_id uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_sub record;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    return null;
  end if;

  select s.plan_key, s.status, s.cancel_at_period_end, s.current_period_end
    into v_sub
  from public.subscriptions s
  where s.user_id = p_user_id
  order by s.created_at desc, s.updated_at desc
  limit 1;

  if v_sub is null then
    return 'free';
  end if;

  if v_sub.status in ('active','trialing','past_due') then
    return case when v_sub.plan_key in ('starter','builder','pro','agency') then v_sub.plan_key else 'free' end;
  end if;

  if v_sub.status = 'canceled' and v_sub.cancel_at_period_end = true
     and v_sub.current_period_end is not null and v_sub.current_period_end > now() then
    return case when v_sub.plan_key in ('starter','builder','pro','agency') then v_sub.plan_key else 'free' end;
  end if;

  return 'free';
end;
$function$;

create or replace function public.forge_collection_role(cid uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$ select forge_project_role(c.project_id) from cms_collections c where c.id = cid; $function$;

create or replace function public.forge_item_role(iid uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$ select forge_project_role(i.project_id) from cms_items i where i.id = iid; $function$;

create or replace function public.forge_project_role(pid uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$ select pm.role from project_members pm where pm.project_id = pid and pm.user_id = auth.uid() and pm.status = 'active' limit 1; $function$;

create or replace function public.forge_site_admin(pid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(forge_project_role(pid) in ('owner','admin'), false);
$function$;

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, display_name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    upper(substring(coalesce(new.email, 'u') from 1 for 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.is_forge_admin(p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select (auth.uid() is distinct from p_user_id) = false
    and exists (select 1 from profiles where id = p_user_id and role = 'forge_admin');
$function$;

create or replace function public.is_project_member(pid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = auth.uid() and status = 'active'
  );
$function$;

create or replace function public.is_workspace_owner(pid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.projects p
    join public.workspaces w on w.id = p.workspace_id
    where p.id = pid and w.owner_id = auth.uid()
  );
$function$;

create or replace function public.prevent_project_id_change()
 returns trigger
 language plpgsql
as $function$
begin
  if new.project_id is distinct from old.project_id then
    raise exception 'project_id cannot be changed after creation';
  end if;
  return new;
end;
$function$;

create or replace function public.project_invitations_role_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role = 'owner' and not public.is_workspace_owner(new.project_id) then
      raise exception 'Only the workspace owner can invite with the owner role';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.project_member_role(pid uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select role from public.project_members
  where project_id = pid and user_id = auth.uid() and status = 'active'
  limit 1;
$function$;

create or replace function public.project_members_role_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role = 'owner' and not public.is_workspace_owner(new.project_id) then
      raise exception 'Only the workspace owner can grant the owner role';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role = 'owner' and old.role is distinct from 'owner'
       and not public.is_workspace_owner(new.project_id) then
      raise exception 'Only the workspace owner can grant the owner role';
    end if;
    if old.role = 'owner' and new.role is distinct from 'owner'
       and not public.is_workspace_owner(new.project_id) then
      raise exception 'Only the workspace owner can revoke the owner role';
    end if;
  elsif tg_op = 'DELETE' then
    if old.role = 'owner' and not public.is_workspace_owner(old.project_id) then
      raise exception 'Only the workspace owner can remove an owner';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.protect_profiles_role()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'You are not allowed to change your account role.';
  end if;
  return new;
end;
$function$;

create or replace function public.release_ai_credits(p_reservation_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from usage_ledger where id = p_reservation_id and user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update usage_ledger set status = 'released' where id = p_reservation_id and status = 'reserved';
end;
$function$;

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

  select coalesce(s.plan_key, 'free') into v_plan from subscriptions s
    where s.user_id = p_user_id and s.status in ('active','trialing','past_due')
    order by s.created_at desc limit 1;

  select pe.limit_value into v_limit from plan_entitlements pe
    where pe.plan_key = v_plan and pe.entitlement_key = 'monthly_ai_credits' and pe.active;

  select coalesce(s.current_period_start, date_trunc('month', now())) into v_period_start
    from subscriptions s
    where s.user_id = p_user_id and s.status in ('active','trialing','past_due')
    order by s.created_at desc limit 1;
  if v_period_start is null then v_period_start := date_trunc('month', now()); end if;

  select coalesce(sum(quantity), 0) into v_used from usage_ledger
    where user_id = p_user_id and usage_type = 'ai_credit'
      and status in ('reserved','settled') and created_at >= v_period_start;

  if v_limit is not null and (v_used + p_quantity) > v_limit then
    return jsonb_build_object('ok', false, 'error_code', 'INSUFFICIENT_CREDITS', 'used', v_used, 'limit', v_limit, 'plan', v_plan);
  end if;

  insert into usage_ledger (user_id, project_id, usage_type, quantity, status, idempotency_key, provider, model, safe_metadata)
  values (p_user_id, p_project_id, p_usage_type, p_quantity, 'reserved', p_idempotency_key, p_provider, p_model, p_metadata)
  returning id into v_reservation;

  return jsonb_build_object('ok', true, 'reservation_id', v_reservation, 'used', v_used + p_quantity, 'limit', v_limit, 'plan', v_plan);
end;
$function$;

create or replace function public.resolve_effective_plan(p_user_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_sub record;
  v_plan text := 'free';
  v_access text := 'free';
  v_paid boolean := false;
  v_next text := 'starter';
  v_status text := null;
  v_period_end timestamptz := null;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized for this user';
  end if;

  select s.plan_key, s.status, s.cancel_at_period_end, s.current_period_end
    into v_sub
  from public.subscriptions s
  where s.user_id = p_user_id
  order by s.created_at desc, s.updated_at desc
  limit 1;

  if v_sub is null then
    v_plan := 'free'; v_access := 'free'; v_paid := false; v_status := null; v_period_end := null;
  elsif v_sub.status in ('active','trialing') then
    v_plan := v_sub.plan_key; v_access := 'paid'; v_paid := true;
    v_status := v_sub.status; v_period_end := v_sub.current_period_end;
  elsif v_sub.status = 'past_due' then
    v_plan := v_sub.plan_key; v_access := 'grace'; v_paid := false;
    v_status := v_sub.status; v_period_end := v_sub.current_period_end;
  elsif v_sub.status = 'canceled' and v_sub.cancel_at_period_end = true
        and v_sub.current_period_end is not null and v_sub.current_period_end > now() then
    v_plan := v_sub.plan_key; v_access := 'paid'; v_paid := true;
    v_status := v_sub.status; v_period_end := v_sub.current_period_end;
  else
    v_plan := 'free'; v_access := 'free'; v_paid := false;
    v_status := v_sub.status; v_period_end := v_sub.current_period_end;
  end if;

  if v_plan not in ('starter','builder','pro','agency') then
    v_plan := 'free';
  end if;

  v_next := case v_plan
    when 'free' then 'starter'
    when 'starter' then 'builder'
    when 'builder' then 'pro'
    when 'pro' then 'agency'
    else 'agency'
  end;

  return jsonb_build_object(
    'plan_key', v_plan,
    'access_level', v_access,
    'paid_access', v_paid,
    'subscription_status', v_status,
    'period_end', v_period_end,
    'reset_date', v_period_end,
    'next_plan', v_next
  );
end;
$function$;

create or replace function public.settle_ai_credits(p_reservation_id uuid, p_actual_quantity bigint, p_provider text, p_model text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_actual_quantity is null or p_actual_quantity < 0 then
    raise exception 'actual_quantity must be non-negative';
  end if;

  if not exists (select 1 from usage_ledger where id = p_reservation_id and user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;

  update usage_ledger set status = 'settled', quantity = p_actual_quantity,
    provider = coalesce(p_provider, provider), model = coalesce(p_model, model), settled_at = now()
  where id = p_reservation_id and status = 'reserved';
end;
$function$;

create or replace function public.site_auth_events_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    raise exception 'site_auth_events is append-only';
  end if;
  return new;
end;
$function$;

create or replace function public.site_member_has_role(pid uuid, rkey text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.site_members m
    join public.site_member_roles mr on mr.site_member_id = m.id
    join public.site_roles r on r.id = mr.site_role_id
    where m.project_id = pid and m.auth_user_id = auth.uid() and m.status = 'active' and r.role_key = rkey
  );
$function$;

create or replace function public.site_member_of(pid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.site_members
    where project_id = pid and auth_user_id = auth.uid() and status = 'active'
  );
$function$;

create or replace function public.site_members_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id then
      raise exception 'project_id cannot change';
    end if;
    if not forge_site_admin(old.project_id) then
      if new.status is distinct from old.status
         or new.auth_user_id is distinct from old.auth_user_id
         or new.email_normalized is distinct from old.email_normalized then
        raise exception 'members cannot change account status or identity';
      end if;
    end if;
    new.updated_at = now();
  end if;
  return new;
end;
$function$;

create or replace function public.site_profile_values_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  editable boolean;
begin
  if forge_site_admin(new.project_id) then
    new.updated_at = now();
    return new;
  end if;
  if not exists (
    select 1 from public.site_members
    where id = new.site_member_id and auth_user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'cannot edit another member profile';
  end if;
  select member_editable into editable from public.site_profile_fields where id = new.field_id;
  if editable is not true then
    raise exception 'field is not member-editable';
  end if;
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.workflow_approvals_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'UPDATE' then
    new.workflow_run_id := old.workflow_run_id;
    new.node_id := old.node_id;
    if old.status = 'pending' and new.status in ('approved','rejected') then
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.workflow_connections_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.project_id := old.project_id;
  end if;
  return new;
end;
$function$;

create or replace function public.workflow_versions_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op in ('UPDATE','DELETE') then
    raise exception 'workflow versions are immutable';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  end if;
  return new;
end;
$function$;

create or replace function public.workflows_activate_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    if public.forge_project_role(new.project_id) not in ('owner','admin') then
      raise exception 'only owners and admins can activate workflows';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.workflows_audit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.project_id := old.project_id;
  end if;
  return new;
end;
$function$;

-- ----------------------------------------------------------------------------
-- 6. FUNCTIONS (forge_internal schema)
-- ----------------------------------------------------------------------------

create or replace function forge_internal.create_project_version(p_project_id uuid, p_blueprint jsonb, p_schema_version integer, p_label text, p_description text, p_source text, p_page_ids jsonb, p_change_summary text, p_checksum text, p_parent_version_id uuid, p_restored_from_version_id uuid, p_published_at timestamp with time zone, p_metadata jsonb, p_is_checkpoint boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'forge_internal'
as $function$
declare
  v_owner uuid;
  v_next int;
  v_id uuid;
  v_created timestamptz;
begin
  select w.owner_id into v_owner
  from public.projects p
  join public.workspaces w on w.id = p.workspace_id
  where p.id = p_project_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'PROJECT_FORBIDDEN' using errcode = '42501';
  end if;

  perform 1 from public.projects where id = p_project_id for update;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.project_versions
  where project_id = p_project_id;

  insert into public.project_versions (
    project_id, blueprint, schema_version, version_number, source, created_by,
    label, description, page_ids, change_summary, checksum, parent_version_id,
    restored_from_version_id, published_at, metadata, is_checkpoint
  )
  values (
    p_project_id, p_blueprint, p_schema_version, v_next, coalesce(p_source, 'manual'),
    auth.uid(), p_label, p_description, p_page_ids, p_change_summary, p_checksum,
    p_parent_version_id, p_restored_from_version_id, p_published_at, p_metadata,
    coalesce(p_is_checkpoint, false)
  )
  returning id, version_number, created_at into v_id, v_next, v_created;

  return jsonb_build_object('id', v_id, 'version_number', v_next, 'created_at', v_created);
end;
$function$;

create or replace function forge_internal.prevent_domain_provider_field_edit()
 returns trigger
 language plpgsql
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    if (new.status is distinct from old.status)
       or (new.verified_at is distinct from old.verified_at)
       or (new.ssl_status is distinct from old.ssl_status)
       or (new.verification_token_hash is distinct from old.verification_token_hash) then
      raise exception 'Provider-controlled domain fields cannot be edited from the browser';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function forge_internal.project_versions_immutable()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  raise exception 'Project versions are immutable' using errcode = '42501';
end;
$function$;

create or replace function forge_internal.reserve_ai_usage(p_request_id text, p_user_id uuid, p_workspace_id uuid, p_project_id uuid, p_page_id text, p_task_class text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'forge_internal', 'public', 'pg_temp'
as $function$
declare
  ent record;
  monthly_used integer;
  page_used integer;
  already boolean;
begin
  select * into ent from public.ai_entitlements
    where user_id = p_user_id
      and now() between period_start and period_end
    order by created_at desc
    limit 1;

  if ent.id is null then
    return jsonb_build_object('ok', false, 'error_code', 'NO_ENTITLEMENT');
  end if;

  select exists(
    select 1 from public.ai_usage_events where request_id = p_request_id
  ) into already;

  if already then
    return jsonb_build_object('ok', true, 'already_reserved', true,
      'monthly_remaining', greatest(ent.monthly_request_limit -
        (select count(*) from public.ai_usage_events
          where user_id = p_user_id and created_at >= ent.period_start and status in ('success','pending')), 0),
      'daily_remaining', greatest(ent.daily_page_request_limit -
        (select count(*) from public.ai_usage_events
          where user_id = p_user_id and page_id = p_page_id and created_at >= date_trunc('day', now()) and status in ('success','pending')), 0));
  end if;

  select count(*) into monthly_used from public.ai_usage_events
    where user_id = p_user_id
      and created_at >= ent.period_start
      and status in ('success','pending');

  if monthly_used >= ent.monthly_request_limit then
    return jsonb_build_object('ok', false, 'error_code', 'MONTHLY_LIMIT_REACHED',
      'current', monthly_used, 'max', ent.monthly_request_limit,
      'reset_time', ent.period_end);
  end if;

  select count(*) into page_used from public.ai_usage_events
    where user_id = p_user_id
      and page_id = p_page_id
      and created_at >= date_trunc('day', now())
      and status in ('success','pending');

  if page_used >= ent.daily_page_request_limit then
    return jsonb_build_object('ok', false, 'error_code', 'PAGE_LIMIT_REACHED',
      'current', page_used, 'max', ent.daily_page_request_limit,
      'reset_time', date_trunc('day', now()) + interval '1 day');
  end if;

  insert into public.ai_usage_events
    (request_id, user_id, workspace_id, project_id, page_id, task_class, status)
  values
    (p_request_id, p_user_id, p_workspace_id, p_project_id, p_page_id, p_task_class, 'pending')
  on conflict (request_id) do nothing;

  return jsonb_build_object('ok', true, 'reserved', true,
    'monthly_remaining', greatest(ent.monthly_request_limit - monthly_used - 1, 0),
    'daily_remaining', greatest(ent.daily_page_request_limit - page_used - 1, 0),
    'plan_code', ent.plan_code);
end;
$function$;

-- ----------------------------------------------------------------------------
-- 7. TRIGGERS
-- ----------------------------------------------------------------------------

drop trigger if exists builds_no_project_change on public.builds;
create trigger builds_no_project_change before update on public.builds for each row execute function prevent_project_id_change();

drop trigger if exists cms_collections_audit_trigger on public.cms_collections;
create trigger cms_collections_audit_trigger before insert or update on public.cms_collections for each row execute function cms_collections_audit();

drop trigger if exists cms_fields_audit_trigger on public.cms_fields;
create trigger cms_fields_audit_trigger before insert or update on public.cms_fields for each row execute function cms_fields_audit();

drop trigger if exists cms_item_versions_guard_trigger on public.cms_item_versions;
create trigger cms_item_versions_guard_trigger before insert or delete or update on public.cms_item_versions for each row execute function cms_item_versions_guard();

drop trigger if exists cms_items_audit_trigger on public.cms_items;
create trigger cms_items_audit_trigger before insert or update on public.cms_items for each row execute function cms_items_audit();

drop trigger if exists cms_relationships_guard_trigger on public.cms_relationships;
create trigger cms_relationships_guard_trigger before insert or update on public.cms_relationships for each row execute function cms_relationships_guard();

drop trigger if exists domains_block_provider_edits on public.domains;
create trigger domains_block_provider_edits before update on public.domains for each row execute function forge_internal.prevent_domain_provider_field_edit();

drop trigger if exists exports_no_project_change on public.exports;
create trigger exports_no_project_change before update on public.exports for each row execute function prevent_project_id_change();

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles for each row execute function protect_profiles_role();

drop trigger if exists project_invitations_role_guard on public.project_invitations;
create trigger project_invitations_role_guard before insert on public.project_invitations for each row execute function project_invitations_role_guard();

drop trigger if exists project_members_role_guard on public.project_members;
create trigger project_members_role_guard before insert or delete or update on public.project_members for each row execute function project_members_role_guard();

drop trigger if exists project_versions_immutable on public.project_versions;
create trigger project_versions_immutable before delete or update on public.project_versions for each row execute function forge_internal.project_versions_immutable();

drop trigger if exists site_auth_events_guard_trigger on public.site_auth_events;
create trigger site_auth_events_guard_trigger before update on public.site_auth_events for each row execute function site_auth_events_guard();

drop trigger if exists site_members_audit_trigger on public.site_members;
create trigger site_members_audit_trigger before update on public.site_members for each row execute function site_members_audit();

drop trigger if exists site_profile_values_guard_trigger on public.site_profile_values;
create trigger site_profile_values_guard_trigger before insert or update on public.site_profile_values for each row execute function site_profile_values_guard();

drop trigger if exists workflow_approvals_guard on public.workflow_approvals;
create trigger workflow_approvals_guard before update on public.workflow_approvals for each row execute function workflow_approvals_guard();

drop trigger if exists workflow_connections_audit on public.workflow_connections;
create trigger workflow_connections_audit before insert or update on public.workflow_connections for each row execute function workflow_connections_audit();

drop trigger if exists workflow_versions_guard on public.workflow_versions;
create trigger workflow_versions_guard before insert or delete or update on public.workflow_versions for each row execute function workflow_versions_guard();

drop trigger if exists workflows_000_audit on public.workflows;
create trigger workflows_000_audit before insert or update on public.workflows for each row execute function workflows_audit();

drop trigger if exists workflows_001_activate on public.workflows;
create trigger workflows_001_activate before update on public.workflows for each row execute function workflows_activate_guard();

-- profile creation hook on auth.users (Supabase-managed schema)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY — ENABLE
-- ----------------------------------------------------------------------------

alter table public.admin_audit_events enable row level security;
alter table public.ai_agent_runs enable row level security;
alter table public.ai_change_sets enable row level security;
alter table public.ai_entitlements enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_providers enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.assets enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_events enable row level security;
alter table public.builds enable row level security;
alter table public.cms_collections enable row level security;
alter table public.cms_fields enable row level security;
alter table public.cms_item_versions enable row level security;
alter table public.cms_items enable row level security;
alter table public.cms_relationships enable row level security;
alter table public.collaboration_events enable row level security;
alter table public.deployment_events enable row level security;
alter table public.deployments enable row level security;
alter table public.domains enable row level security;
alter table public.exports enable row level security;
alter table public.feature_flags enable row level security;
alter table public.forge_analytics_events enable row level security;
alter table public.forge_analytics_sites enable row level security;
alter table public.form_delivery_events enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_files enable row level security;
alter table public.form_integrations enable row level security;
alter table public.form_submissions enable row level security;
alter table public.forms enable row level security;
alter table public.incident_events enable row level security;
alter table public.notifications enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_incidents enable row level security;
alter table public.profiles enable row level security;
alter table public.project_approvals enable row level security;
alter table public.project_comments enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_members enable row level security;
alter table public.project_versions enable row level security;
alter table public.projects enable row level security;
alter table public.service_health_checks enable row level security;
alter table public.site_auth_events enable row level security;
alter table public.site_member_roles enable row level security;
alter table public.site_members enable row level security;
alter table public.site_profile_fields enable row level security;
alter table public.site_profile_values enable row level security;
alter table public.site_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.support_access_sessions enable row level security;
alter table public.template_assets enable row level security;
alter table public.template_installations enable row level security;
alter table public.template_reviews enable row level security;
alter table public.template_versions enable row level security;
alter table public.templates enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.usage_periods enable row level security;
alter table public.workflow_approvals enable row level security;
alter table public.workflow_connections enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_step_runs enable row level security;
alter table public.workflow_versions enable row level security;
alter table public.workflows enable row level security;
alter table public.workspace_ai_keys enable row level security;
alter table public.workspaces enable row level security;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY — POLICIES
-- ----------------------------------------------------------------------------

-- ai_agent_runs
drop policy if exists "ai_agent_runs_select_own" on public.ai_agent_runs;
create policy "ai_agent_runs_select_own" on public.ai_agent_runs for select to authenticated using ((exists (select 1 from ai_jobs j where ((j.id = ai_agent_runs.ai_job_id) and (j.user_id = auth.uid())))));

-- ai_change_sets
drop policy if exists "ai_change_sets_select_admin" on public.ai_change_sets;
create policy "ai_change_sets_select_admin" on public.ai_change_sets for select to authenticated using (is_forge_admin(auth.uid()));
drop policy if exists "ai_change_sets_select_own" on public.ai_change_sets;
create policy "ai_change_sets_select_own" on public.ai_change_sets for select to authenticated using ((exists (select 1 from ai_jobs j where ((j.id = ai_change_sets.ai_job_id) and (j.user_id = auth.uid())))));

-- ai_entitlements
drop policy if exists "ai_entitlements_select_own" on public.ai_entitlements;
create policy "ai_entitlements_select_own" on public.ai_entitlements for select to authenticated using ((user_id = auth.uid()));

-- ai_jobs
drop policy if exists "ai_jobs_insert_own" on public.ai_jobs;
create policy "ai_jobs_insert_own" on public.ai_jobs for insert to authenticated with check ((user_id = auth.uid()));
drop policy if exists "ai_jobs_select_admin" on public.ai_jobs;
create policy "ai_jobs_select_admin" on public.ai_jobs for select to authenticated using (is_forge_admin(auth.uid()));
drop policy if exists "ai_jobs_select_own" on public.ai_jobs;
create policy "ai_jobs_select_own" on public.ai_jobs for select to authenticated using ((user_id = auth.uid()));

-- ai_models
drop policy if exists "ai_models_admin_delete" on public.ai_models;
create policy "ai_models_admin_delete" on public.ai_models for delete to authenticated using (is_forge_admin(auth.uid()));
drop policy if exists "ai_models_admin_update" on public.ai_models;
create policy "ai_models_admin_update" on public.ai_models for update to authenticated using (is_forge_admin(auth.uid())) with check (is_forge_admin(auth.uid()));
drop policy if exists "ai_models_admin_write" on public.ai_models;
create policy "ai_models_admin_write" on public.ai_models for insert to authenticated with check (is_forge_admin(auth.uid()));
drop policy if exists "ai_models_select_auth" on public.ai_models;
create policy "ai_models_select_auth" on public.ai_models for select to authenticated using (true);

-- ai_providers
drop policy if exists "ai_providers_admin_delete" on public.ai_providers;
create policy "ai_providers_admin_delete" on public.ai_providers for delete to authenticated using (is_forge_admin(auth.uid()));
drop policy if exists "ai_providers_admin_update" on public.ai_providers;
create policy "ai_providers_admin_update" on public.ai_providers for update to authenticated using (is_forge_admin(auth.uid())) with check (is_forge_admin(auth.uid()));
drop policy if exists "ai_providers_admin_write" on public.ai_providers;
create policy "ai_providers_admin_write" on public.ai_providers for insert to authenticated with check (is_forge_admin(auth.uid()));
drop policy if exists "ai_providers_select_auth" on public.ai_providers;
create policy "ai_providers_select_auth" on public.ai_providers for select to authenticated using (true);

-- ai_usage_events
drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
create policy "ai_usage_events_select_own" on public.ai_usage_events for select to authenticated using ((user_id = auth.uid()));

-- assets
drop policy if exists "assets_owner_all" on public.assets;
create policy "assets_owner_all" on public.assets for all to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = assets.project_id) and (w.owner_id = auth.uid())))));

-- billing_customers
drop policy if exists "billing_customers_read_own" on public.billing_customers;
create policy "billing_customers_read_own" on public.billing_customers for select to public using ((auth.uid() = user_id));

-- builds
drop policy if exists "builds_owner_all" on public.builds;
create policy "builds_owner_all" on public.builds for all to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = builds.project_id) and (w.owner_id = auth.uid())))));

-- cms_collections
drop policy if exists "cms_collections_delete" on public.cms_collections;
create policy "cms_collections_delete" on public.cms_collections for delete to authenticated using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "cms_collections_insert" on public.cms_collections;
create policy "cms_collections_insert" on public.cms_collections for insert to authenticated with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "cms_collections_select" on public.cms_collections;
create policy "cms_collections_select" on public.cms_collections for select to authenticated using ((forge_project_role(project_id) is not null));
drop policy if exists "cms_collections_update" on public.cms_collections;
create policy "cms_collections_update" on public.cms_collections for update to authenticated using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text]))) with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));

-- cms_fields
drop policy if exists "cms_fields_delete" on public.cms_fields;
create policy "cms_fields_delete" on public.cms_fields for delete to authenticated using ((forge_collection_role(collection_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "cms_fields_insert" on public.cms_fields;
create policy "cms_fields_insert" on public.cms_fields for insert to authenticated with check ((forge_collection_role(collection_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "cms_fields_select" on public.cms_fields;
create policy "cms_fields_select" on public.cms_fields for select to authenticated using ((forge_collection_role(collection_id) is not null));
drop policy if exists "cms_fields_update" on public.cms_fields;
create policy "cms_fields_update" on public.cms_fields for update to authenticated using ((forge_collection_role(collection_id) = any (array['owner'::text, 'admin'::text]))) with check ((forge_collection_role(collection_id) = any (array['owner'::text, 'admin'::text])));

-- cms_item_versions
drop policy if exists "cms_item_versions_insert" on public.cms_item_versions;
create policy "cms_item_versions_insert" on public.cms_item_versions for insert to authenticated with check ((forge_item_role(cms_item_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text])));
drop policy if exists "cms_item_versions_select" on public.cms_item_versions;
create policy "cms_item_versions_select" on public.cms_item_versions for select to authenticated using ((forge_item_role(cms_item_id) is not null));

-- cms_items
drop policy if exists "cms_items_delete" on public.cms_items;
create policy "cms_items_delete" on public.cms_items for delete to authenticated using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "cms_items_insert" on public.cms_items;
create policy "cms_items_insert" on public.cms_items for insert to authenticated with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text])));
drop policy if exists "cms_items_select" on public.cms_items;
create policy "cms_items_select" on public.cms_items for select to authenticated using ((forge_project_role(project_id) is not null));
drop policy if exists "cms_items_update" on public.cms_items;
create policy "cms_items_update" on public.cms_items for update to authenticated using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text]))) with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text])));

-- cms_relationships
drop policy if exists "cms_relationships_delete" on public.cms_relationships;
create policy "cms_relationships_delete" on public.cms_relationships for delete to authenticated using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text])));
drop policy if exists "cms_relationships_insert" on public.cms_relationships;
create policy "cms_relationships_insert" on public.cms_relationships for insert to authenticated with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'copywriter'::text, 'designer'::text])));
drop policy if exists "cms_relationships_select" on public.cms_relationships;
create policy "cms_relationships_select" on public.cms_relationships for select to authenticated using ((forge_project_role(project_id) is not null));

-- collaboration_events
drop policy if exists "member_insert" on public.collaboration_events;
create policy "member_insert" on public.collaboration_events for insert to public with check ((is_project_member(project_id) and (actor_id = auth.uid())));
drop policy if exists "members_select" on public.collaboration_events;
create policy "members_select" on public.collaboration_events for select to public using (is_project_member(project_id));

-- deployment_events
drop policy if exists "deployment_events_select_owned" on public.deployment_events;
create policy "deployment_events_select_owned" on public.deployment_events for select to authenticated using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = deployment_events.project_id) and (w.owner_id = auth.uid())))));

-- deployments
drop policy if exists "deployments_select_owned" on public.deployments;
create policy "deployments_select_owned" on public.deployments for select to authenticated using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = deployments.project_id) and (w.owner_id = auth.uid())))));

-- domains
drop policy if exists "domains_delete_owned" on public.domains;
create policy "domains_delete_owned" on public.domains for delete to authenticated using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = domains.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "domains_insert_owned" on public.domains;
create policy "domains_insert_owned" on public.domains for insert to authenticated with check ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = domains.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "domains_select_owned" on public.domains;
create policy "domains_select_owned" on public.domains for select to authenticated using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = domains.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "domains_update_owned" on public.domains;
create policy "domains_update_owned" on public.domains for update to authenticated using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = domains.project_id) and (w.owner_id = auth.uid()))))) with check ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = domains.project_id) and (w.owner_id = auth.uid())))));

-- exports
drop policy if exists "exports_owner_all" on public.exports;
create policy "exports_owner_all" on public.exports for all to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = exports.project_id) and (w.owner_id = auth.uid())))));

-- forge_analytics_events
drop policy if exists "events_select_members" on public.forge_analytics_events;
create policy "events_select_members" on public.forge_analytics_events for select to public using ((exists (select 1 from forge_analytics_sites s where ((s.id = forge_analytics_events.site_id) and is_project_member(s.project_id)))));

-- forge_analytics_sites
drop policy if exists "sites_delete_members" on public.forge_analytics_sites;
create policy "sites_delete_members" on public.forge_analytics_sites for delete to public using (is_project_member(project_id));
drop policy if exists "sites_insert_members" on public.forge_analytics_sites;
create policy "sites_insert_members" on public.forge_analytics_sites for insert to public with check (is_project_member(project_id));
drop policy if exists "sites_select_members" on public.forge_analytics_sites;
create policy "sites_select_members" on public.forge_analytics_sites for select to public using (is_project_member(project_id));

-- form_delivery_events
drop policy if exists "form_delivery_events_select_owner" on public.form_delivery_events;
create policy "form_delivery_events_select_owner" on public.form_delivery_events for select to public using ((exists (select 1 from ((form_submissions s join projects p on ((p.id = s.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((s.id = form_delivery_events.submission_id) and (w.owner_id = auth.uid())))));

-- form_fields
drop policy if exists "form_fields_delete_owner" on public.form_fields;
create policy "form_fields_delete_owner" on public.form_fields for delete to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_fields.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_fields_insert_owner" on public.form_fields;
create policy "form_fields_insert_owner" on public.form_fields for insert to public with check ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_fields.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_fields_select_owner" on public.form_fields;
create policy "form_fields_select_owner" on public.form_fields for select to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_fields.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_fields_update_owner" on public.form_fields;
create policy "form_fields_update_owner" on public.form_fields for update to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_fields.form_id) and (w.owner_id = auth.uid()))))) with check ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_fields.form_id) and (w.owner_id = auth.uid())))));

-- form_files
drop policy if exists "form_files_select_owner" on public.form_files;
create policy "form_files_select_owner" on public.form_files for select to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_files.form_id) and (w.owner_id = auth.uid())))));

-- form_integrations
drop policy if exists "form_integrations_delete_owner" on public.form_integrations;
create policy "form_integrations_delete_owner" on public.form_integrations for delete to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_integrations.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_integrations_insert_owner" on public.form_integrations;
create policy "form_integrations_insert_owner" on public.form_integrations for insert to public with check ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_integrations.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_integrations_select_owner" on public.form_integrations;
create policy "form_integrations_select_owner" on public.form_integrations for select to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_integrations.form_id) and (w.owner_id = auth.uid())))));
drop policy if exists "form_integrations_update_owner" on public.form_integrations;
create policy "form_integrations_update_owner" on public.form_integrations for update to public using ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_integrations.form_id) and (w.owner_id = auth.uid()))))) with check ((exists (select 1 from ((forms f join projects p on ((p.id = f.project_id))) join workspaces w on ((w.id = p.workspace_id))) where ((f.id = form_integrations.form_id) and (w.owner_id = auth.uid())))));

-- form_submissions
drop policy if exists "form_submissions_select_owner" on public.form_submissions;
create policy "form_submissions_select_owner" on public.form_submissions for select to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = form_submissions.project_id) and (w.owner_id = auth.uid())))));

-- forms
drop policy if exists "forms_delete_owner" on public.forms;
create policy "forms_delete_owner" on public.forms for delete to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = forms.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "forms_insert_owner" on public.forms;
create policy "forms_insert_owner" on public.forms for insert to public with check ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = forms.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "forms_select_owner" on public.forms;
create policy "forms_select_owner" on public.forms for select to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = forms.project_id) and (w.owner_id = auth.uid())))));
drop policy if exists "forms_update_owner" on public.forms;
create policy "forms_update_owner" on public.forms for update to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = forms.project_id) and (w.owner_id = auth.uid()))))) with check ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = forms.project_id) and (w.owner_id = auth.uid())))));

-- notifications
drop policy if exists "notifications_own_all" on public.notifications;
create policy "notifications_own_all" on public.notifications for all to public using ((user_id = auth.uid()));

-- plan_entitlements
drop policy if exists "plan_entitlements_read_active" on public.plan_entitlements;
create policy "plan_entitlements_read_active" on public.plan_entitlements for select to public using (((active = true) and (auth.uid() is not null)));

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to public using ((id = auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to public using ((id = auth.uid()));

-- project_approvals
drop policy if exists "decider_update" on public.project_approvals;
create policy "decider_update" on public.project_approvals for update to public using (((requested_from = auth.uid()) or is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text])))) with check (((requested_from = auth.uid()) or is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "member_insert" on public.project_approvals;
create policy "member_insert" on public.project_approvals for insert to public with check ((is_project_member(project_id) and (requested_by = auth.uid())));
drop policy if exists "members_select" on public.project_approvals;
create policy "members_select" on public.project_approvals for select to public using (is_project_member(project_id));
drop policy if exists "owner_admin_delete" on public.project_approvals;
create policy "owner_admin_delete" on public.project_approvals for delete to public using ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));

-- project_comments
drop policy if exists "author_or_admin_delete" on public.project_comments;
create policy "author_or_admin_delete" on public.project_comments for delete to public using (((author_id = auth.uid()) or is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "author_or_admin_update" on public.project_comments;
create policy "author_or_admin_update" on public.project_comments for update to public using (((author_id = auth.uid()) or is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text])))) with check (((author_id = auth.uid()) or is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "member_insert" on public.project_comments;
create policy "member_insert" on public.project_comments for insert to public with check ((is_project_member(project_id) and (author_id = auth.uid())));
drop policy if exists "members_select" on public.project_comments;
create policy "members_select" on public.project_comments for select to public using (is_project_member(project_id));

-- project_invitations
drop policy if exists "members_select" on public.project_invitations;
create policy "members_select" on public.project_invitations for select to public using (is_project_member(project_id));
drop policy if exists "owner_admin_delete" on public.project_invitations;
create policy "owner_admin_delete" on public.project_invitations for delete to public using ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "owner_admin_insert" on public.project_invitations;
create policy "owner_admin_insert" on public.project_invitations for insert to public with check ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "owner_admin_update" on public.project_invitations;
create policy "owner_admin_update" on public.project_invitations for update to public using ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text])))) with check ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));

-- project_members
drop policy if exists "members_select" on public.project_members;
create policy "members_select" on public.project_members for select to public using (is_project_member(project_id));
drop policy if exists "owner_admin_delete" on public.project_members;
create policy "owner_admin_delete" on public.project_members for delete to public using ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "owner_admin_insert" on public.project_members;
create policy "owner_admin_insert" on public.project_members for insert to public with check ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));
drop policy if exists "owner_admin_update" on public.project_members;
create policy "owner_admin_update" on public.project_members for update to public using ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text])))) with check ((is_workspace_owner(project_id) or (project_member_role(project_id) = any (array['owner'::text, 'admin'::text]))));

-- project_versions
drop policy if exists "project_versions_owner_all" on public.project_versions;
create policy "project_versions_owner_all" on public.project_versions for all to public using ((exists (select 1 from (projects p join workspaces w on ((w.id = p.workspace_id))) where ((p.id = project_versions.project_id) and (w.owner_id = auth.uid())))));

-- projects
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects for all to public using ((exists (select 1 from workspaces w where ((w.id = projects.workspace_id) and (w.owner_id = auth.uid())))));

-- site_auth_events
drop policy if exists "site_auth_events_insert" on public.site_auth_events;
create policy "site_auth_events_insert" on public.site_auth_events for insert to public with check (forge_site_admin(project_id));
drop policy if exists "site_auth_events_select" on public.site_auth_events;
create policy "site_auth_events_select" on public.site_auth_events for select to public using (forge_site_admin(project_id));

-- site_member_roles
drop policy if exists "site_member_roles_delete" on public.site_member_roles;
create policy "site_member_roles_delete" on public.site_member_roles for delete to public using (forge_site_admin(project_id));
drop policy if exists "site_member_roles_insert" on public.site_member_roles;
create policy "site_member_roles_insert" on public.site_member_roles for insert to public with check (forge_site_admin(project_id));
drop policy if exists "site_member_roles_select" on public.site_member_roles;
create policy "site_member_roles_select" on public.site_member_roles for select to public using ((forge_site_admin(project_id) or (site_member_id in (select site_members.id from site_members where ((site_members.auth_user_id = auth.uid()) and (site_members.status = 'active'::text))))));
drop policy if exists "site_member_roles_update" on public.site_member_roles;
create policy "site_member_roles_update" on public.site_member_roles for update to public using (forge_site_admin(project_id)) with check (forge_site_admin(project_id));

-- site_members
drop policy if exists "site_members_delete" on public.site_members;
create policy "site_members_delete" on public.site_members for delete to public using (forge_site_admin(project_id));
drop policy if exists "site_members_insert" on public.site_members;
create policy "site_members_insert" on public.site_members for insert to public with check (forge_site_admin(project_id));
drop policy if exists "site_members_select" on public.site_members;
create policy "site_members_select" on public.site_members for select to public using ((forge_site_admin(project_id) or ((auth_user_id = auth.uid()) and (status = 'active'::text))));
drop policy if exists "site_members_update" on public.site_members;
create policy "site_members_update" on public.site_members for update to public using ((forge_site_admin(project_id) or ((auth_user_id = auth.uid()) and (status = 'active'::text)))) with check ((forge_site_admin(project_id) or ((auth_user_id = auth.uid()) and (status = 'active'::text))));

-- site_profile_fields
drop policy if exists "site_profile_fields_delete" on public.site_profile_fields;
create policy "site_profile_fields_delete" on public.site_profile_fields for delete to public using (forge_site_admin(project_id));
drop policy if exists "site_profile_fields_insert" on public.site_profile_fields;
create policy "site_profile_fields_insert" on public.site_profile_fields for insert to public with check (forge_site_admin(project_id));
drop policy if exists "site_profile_fields_select" on public.site_profile_fields;
create policy "site_profile_fields_select" on public.site_profile_fields for select to public using ((forge_site_admin(project_id) or site_member_of(project_id)));
drop policy if exists "site_profile_fields_update" on public.site_profile_fields;
create policy "site_profile_fields_update" on public.site_profile_fields for update to public using (forge_site_admin(project_id)) with check (forge_site_admin(project_id));

-- site_profile_values
drop policy if exists "site_profile_values_delete" on public.site_profile_values;
create policy "site_profile_values_delete" on public.site_profile_values for delete to public using (forge_site_admin(project_id));
drop policy if exists "site_profile_values_insert" on public.site_profile_values;
create policy "site_profile_values_insert" on public.site_profile_values for insert to public with check ((forge_site_admin(project_id) or (site_member_id in (select site_members.id from site_members where ((site_members.auth_user_id = auth.uid()) and (site_members.status = 'active'::text))))));
drop policy if exists "site_profile_values_select" on public.site_profile_values;
create policy "site_profile_values_select" on public.site_profile_values for select to public using ((forge_site_admin(project_id) or (site_member_id in (select site_members.id from site_members where ((site_members.auth_user_id = auth.uid()) and (site_members.status = 'active'::text))))));
drop policy if exists "site_profile_values_update" on public.site_profile_values;
create policy "site_profile_values_update" on public.site_profile_values for update to public using ((forge_site_admin(project_id) or (site_member_id in (select site_members.id from site_members where ((site_members.auth_user_id = auth.uid()) and (site_members.status = 'active'::text)))))) with check ((forge_site_admin(project_id) or (site_member_id in (select site_members.id from site_members where ((site_members.auth_user_id = auth.uid()) and (site_members.status = 'active'::text))))));

-- site_roles
drop policy if exists "site_roles_delete" on public.site_roles;
create policy "site_roles_delete" on public.site_roles for delete to public using (forge_site_admin(project_id));
drop policy if exists "site_roles_insert" on public.site_roles;
create policy "site_roles_insert" on public.site_roles for insert to public with check (forge_site_admin(project_id));
drop policy if exists "site_roles_select" on public.site_roles;
create policy "site_roles_select" on public.site_roles for select to public using ((forge_site_admin(project_id) or site_member_of(project_id)));
drop policy if exists "site_roles_update" on public.site_roles;
create policy "site_roles_update" on public.site_roles for update to public using (forge_site_admin(project_id)) with check (forge_site_admin(project_id));

-- subscriptions
drop policy if exists "subscriptions_read_own" on public.subscriptions;
create policy "subscriptions_read_own" on public.subscriptions for select to public using ((auth.uid() = user_id));

-- template_assets
drop policy if exists "template_assets_delete" on public.template_assets;
create policy "template_assets_delete" on public.template_assets for delete to public using ((exists (select 1 from template_versions tv where ((tv.id = template_assets.template_version_id) and can_admin_template(tv.template_id)))));
drop policy if exists "template_assets_insert" on public.template_assets;
create policy "template_assets_insert" on public.template_assets for insert to public with check ((exists (select 1 from template_versions tv where ((tv.id = template_assets.template_version_id) and can_admin_template(tv.template_id)))));
drop policy if exists "template_assets_select" on public.template_assets;
create policy "template_assets_select" on public.template_assets for select to public using ((exists (select 1 from template_versions tv where ((tv.id = template_assets.template_version_id) and can_access_template(tv.template_id)))));

-- template_installations
drop policy if exists "template_installations_insert" on public.template_installations;
create policy "template_installations_insert" on public.template_installations for insert to public with check (((installed_by = auth.uid()) and is_project_member(project_id)));
drop policy if exists "template_installations_select" on public.template_installations;
create policy "template_installations_select" on public.template_installations for select to public using ((installed_by = auth.uid()));

-- template_reviews
drop policy if exists "template_reviews_insert" on public.template_reviews;
create policy "template_reviews_insert" on public.template_reviews for insert to public with check (is_forge_admin(auth.uid()));
drop policy if exists "template_reviews_select" on public.template_reviews;
create policy "template_reviews_select" on public.template_reviews for select to public using (((reviewer_id = auth.uid()) or (exists (select 1 from templates t where ((t.id = template_reviews.template_id) and (t.owner_id = auth.uid())))) or is_forge_admin(auth.uid())));
drop policy if exists "template_reviews_update" on public.template_reviews;
create policy "template_reviews_update" on public.template_reviews for update to public using (is_forge_admin(auth.uid())) with check (is_forge_admin(auth.uid()));

-- template_versions
drop policy if exists "template_versions_delete" on public.template_versions;
create policy "template_versions_delete" on public.template_versions for delete to public using (can_admin_template(template_id));
drop policy if exists "template_versions_insert" on public.template_versions;
create policy "template_versions_insert" on public.template_versions for insert to public with check (can_admin_template(template_id));
drop policy if exists "template_versions_select" on public.template_versions;
create policy "template_versions_select" on public.template_versions for select to public using (can_access_template(template_id));
drop policy if exists "template_versions_update" on public.template_versions;
create policy "template_versions_update" on public.template_versions for update to public using (can_admin_template(template_id)) with check (can_admin_template(template_id));

-- templates
drop policy if exists "templates_delete" on public.templates;
create policy "templates_delete" on public.templates for delete to public using (((owner_id = auth.uid()) or is_forge_admin(auth.uid())));
drop policy if exists "templates_insert" on public.templates;
create policy "templates_insert" on public.templates for insert to public with check ((owner_id = auth.uid()));
drop policy if exists "templates_select" on public.templates;
create policy "templates_select" on public.templates for select to public using (((owner_id = auth.uid()) or ((workspace_id is not null) and (exists (select 1 from workspaces w where ((w.id = templates.workspace_id) and (w.owner_id = auth.uid()))))) or ((visibility = 'community'::text) and (moderation_status = 'approved'::text))));
drop policy if exists "templates_update" on public.templates;
create policy "templates_update" on public.templates for update to public using (((owner_id = auth.uid()) or is_forge_admin(auth.uid()))) with check (((owner_id = auth.uid()) or is_forge_admin(auth.uid())));

-- usage_ledger
drop policy if exists "usage_ledger_read_own" on public.usage_ledger;
create policy "usage_ledger_read_own" on public.usage_ledger for select to public using ((auth.uid() = user_id));

-- usage_periods
drop policy if exists "usage_periods_read_own" on public.usage_periods;
create policy "usage_periods_read_own" on public.usage_periods for select to public using ((auth.uid() = user_id));

-- workflow_approvals
drop policy if exists "wa_select" on public.workflow_approvals;
create policy "wa_select" on public.workflow_approvals for select to public using ((exists (select 1 from workflow_runs r where ((r.id = workflow_approvals.workflow_run_id) and is_project_member(r.project_id)))));
drop policy if exists "wa_update" on public.workflow_approvals;
create policy "wa_update" on public.workflow_approvals for update to public using (((requested_from = auth.uid()) or (exists (select 1 from workflow_runs r where ((r.id = workflow_approvals.workflow_run_id) and (forge_project_role(r.project_id) = any (array['owner'::text, 'admin'::text]))))))) with check ((status = any (array['approved'::text, 'rejected'::text])));

-- workflow_connections
drop policy if exists "wc_delete" on public.workflow_connections;
create policy "wc_delete" on public.workflow_connections for delete to public using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "wc_insert" on public.workflow_connections;
create policy "wc_insert" on public.workflow_connections for insert to public with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "wc_select" on public.workflow_connections;
create policy "wc_select" on public.workflow_connections for select to public using (is_project_member(project_id));
drop policy if exists "wc_update" on public.workflow_connections;
create policy "wc_update" on public.workflow_connections for update to public using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text]))) with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));

-- workflow_runs
drop policy if exists "wr_select" on public.workflow_runs;
create policy "wr_select" on public.workflow_runs for select to public using (is_project_member(project_id));

-- workflow_step_runs
drop policy if exists "wsr_select" on public.workflow_step_runs;
create policy "wsr_select" on public.workflow_step_runs for select to public using ((exists (select 1 from workflow_runs r where ((r.id = workflow_step_runs.workflow_run_id) and is_project_member(r.project_id)))));

-- workflow_versions
drop policy if exists "wv_insert" on public.workflow_versions;
create policy "wv_insert" on public.workflow_versions for insert to public with check ((exists (select 1 from workflows w where ((w.id = workflow_versions.workflow_id) and (forge_project_role(w.project_id) = any (array['owner'::text, 'admin'::text, 'developer'::text]))))));
drop policy if exists "wv_select" on public.workflow_versions;
create policy "wv_select" on public.workflow_versions for select to public using ((exists (select 1 from workflows w where ((w.id = workflow_versions.workflow_id) and is_project_member(w.project_id)))));

-- workflows
drop policy if exists "wf_delete" on public.workflows;
create policy "wf_delete" on public.workflows for delete to public using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text])));
drop policy if exists "wf_insert" on public.workflows;
create policy "wf_insert" on public.workflows for insert to public with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'developer'::text])));
drop policy if exists "wf_select" on public.workflows;
create policy "wf_select" on public.workflows for select to public using (is_project_member(project_id));
drop policy if exists "wf_update" on public.workflows;
create policy "wf_update" on public.workflows for update to public using ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'developer'::text]))) with check ((forge_project_role(project_id) = any (array['owner'::text, 'admin'::text, 'developer'::text])));

-- workspaces
drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all" on public.workspaces for all to public using ((owner_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 10. FUNCTION GRANTS
--     Preserve the explicit revokes applied to security-definer helpers that
--     must not be callable by anon/public. All other functions retain the
--     Supabase default grants (public/anon/authenticated/service_role).
-- ----------------------------------------------------------------------------

revoke all on function public.current_user_plan(uuid) from public, anon;
revoke all on function public.check_page_limit(uuid, uuid, integer) from public, anon;
revoke all on function public.check_project_limit(uuid, integer) from public, anon;
revoke all on function public.forge_collection_role(uuid) from public, anon;
revoke all on function public.forge_item_role(uuid) from public, anon;
revoke all on function public.forge_project_role(uuid) from public, anon;

grant execute on function public.current_user_plan(uuid) to authenticated, service_role;
grant execute on function public.check_page_limit(uuid, uuid, integer) to authenticated, service_role;
grant execute on function public.check_project_limit(uuid, integer) to authenticated, service_role;
grant execute on function public.forge_collection_role(uuid) to authenticated, service_role;
grant execute on function public.forge_item_role(uuid) to authenticated, service_role;
grant execute on function public.forge_project_role(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 11. STORAGE — forge-assets bucket + policies
--     Idempotent: does not recreate an existing bucket or destroy its contents.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('forge-assets', 'forge-assets', false, 104857600)
on conflict (id) do nothing;

drop policy if exists "forge-assets delete own" on storage.objects;
create policy "forge-assets delete own" on storage.objects for delete to authenticated using (((bucket_id = 'forge-assets'::text) and ((storage.foldername(name))[1] = (auth.uid())::text)));

drop policy if exists "forge-assets insert own" on storage.objects;
create policy "forge-assets insert own" on storage.objects for insert to authenticated with check (((bucket_id = 'forge-assets'::text) and ((storage.foldername(name))[1] = (auth.uid())::text)));

drop policy if exists "forge-assets select own" on storage.objects;
create policy "forge-assets select own" on storage.objects for select to authenticated using (((bucket_id = 'forge-assets'::text) and ((storage.foldername(name))[1] = (auth.uid())::text)));

drop policy if exists "forge-assets update own" on storage.objects;
create policy "forge-assets update own" on storage.objects for update to authenticated using (((bucket_id = 'forge-assets'::text) and ((storage.foldername(name))[1] = (auth.uid())::text))) with check (((bucket_id = 'forge-assets'::text) and ((storage.foldername(name))[1] = (auth.uid())::text)));