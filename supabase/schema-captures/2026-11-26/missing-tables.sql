-- Schema-only supplement captured from live catalogues on 26 November 2026.
-- REVIEW / DISPOSABLE REPLAY ONLY. This is not an automatic migration or backup.
-- Requires four parent tables from the existing baseline and Supabase roles.
-- Contains no user rows, seeds or secrets. Existing tables cause an error.
begin;
do $$ begin if current_setting('forge.schema_replay', true) is distinct from 'disposable' then
  raise exception 'Set forge.schema_replay=disposable only in a disposable database';
end if; end $$;
set local search_path = pg_catalog, public;

create table public."agent_provider_routes" (
  "id" uuid default gen_random_uuid() not null,
  "agent_id" text not null,
  "environment" text not null,
  "task_type" text not null,
  "primary_connection_id" uuid,
  "primary_model_id" uuid,
  "fallback_connection_id" uuid,
  "fallback_model_id" uuid,
  "failover_enabled" boolean default true not null,
  "is_enabled" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "agent_provider_routes_env_check" CHECK (environment = ANY (ARRAY['development'::text, 'staging'::text, 'production'::text, 'sandbox'::text])),
  constraint "agent_provider_routes_pkey" PRIMARY KEY (id),
  constraint "agent_provider_routes_task_check" CHECK (task_type = ANY (ARRAY['general_reasoning'::text, 'coding'::text, 'debugging'::text, 'research'::text, 'UI_generation'::text, 'summarisation'::text, 'structured_data'::text, 'image_generation'::text, 'embedding'::text])),
  constraint "agent_provider_routes_unique" UNIQUE (agent_id, environment, task_type)
);
alter table public."agent_provider_routes" enable row level security;

create table public."credential_alerts" (
  "id" uuid default gen_random_uuid() not null,
  "dedup_key" text not null,
  "provider_key" text,
  "environment" text,
  "severity" text not null,
  "reason_code" text not null,
  "message" text,
  "recommended_action" text,
  "detected_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null,
  "status" text default 'open'::text not null,
  "acknowledged_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  constraint "credential_alerts_dedup_key_key" UNIQUE (dedup_key),
  constraint "credential_alerts_pkey" PRIMARY KEY (id)
);
alter table public."credential_alerts" enable row level security;

create table public."credential_health_runs" (
  "id" uuid default gen_random_uuid() not null,
  "execution_id" text not null,
  "status" text default 'running'::text not null,
  "started_at" timestamp with time zone default now() not null,
  "finished_at" timestamp with time zone,
  "triggered_by" uuid,
  "total_checked" integer default 0 not null,
  "healthy" integer default 0 not null,
  "warning" integer default 0 not null,
  "failing" integer default 0 not null,
  "safe_summary" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "credential_health_runs_pkey" PRIMARY KEY (id)
);
alter table public."credential_health_runs" enable row level security;

create table public."customer_integration_audit" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid,
  "user_id" uuid,
  "provider_id" text,
  "integration_connection_id" uuid,
  "action" text not null,
  "result" text default 'success'::text not null,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "customer_integration_audit_pkey" PRIMARY KEY (id)
);
alter table public."customer_integration_audit" enable row level security;

create table public."forge_active_requests" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid,
  "request_id" text,
  "started_at" timestamp with time zone default now() not null,
  constraint "forge_active_requests_pkey" PRIMARY KEY (id)
);
alter table public."forge_active_requests" enable row level security;

create table public."forge_usage_state" (
  "id" integer default 1 not null,
  "ai_usage_paused" boolean default false not null,
  "paused_at" timestamp with time zone,
  "paused_by" text,
  "updated_at" timestamp with time zone default now() not null,
  "external_paused" boolean default false not null,
  "external_paused_at" timestamp with time zone,
  "external_paused_by" uuid,
  "external_pause_reason" text,
  "external_resumed_at" timestamp with time zone,
  "external_resumed_by" uuid,
  "external_resume_reason" text,
  constraint "forge_usage_state_id_check" CHECK (id = 1),
  constraint "forge_usage_state_pkey" PRIMARY KEY (id)
);
alter table public."forge_usage_state" enable row level security;

create table public."integration_alert_config" (
  "id" uuid default gen_random_uuid() not null,
  "trigger_key" text not null,
  "enabled" boolean default false not null,
  "channels" jsonb default '["dashboard"]'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_alert_config_pkey" PRIMARY KEY (id),
  constraint "integration_alert_config_trigger_key_key" UNIQUE (trigger_key)
);
alter table public."integration_alert_config" enable row level security;

create table public."integration_alert_deliveries" (
  "id" uuid default gen_random_uuid() not null,
  "incident_id" uuid,
  "trigger_key" text not null,
  "channel" text not null,
  "last_sent_at" timestamp with time zone default now() not null,
  "resolved" boolean default false not null,
  constraint "integration_alert_deliveries_pkey" PRIMARY KEY (id),
  constraint "integration_alert_deliveries_uniq" UNIQUE (incident_id, trigger_key, channel)
);
alter table public."integration_alert_deliveries" enable row level security;

create table public."integration_audit_log" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid,
  "provider_id" text,
  "environment" text,
  "actor_type" text not null,
  "actor_id" text,
  "action" text not null,
  "result" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_audit_log_pkey" PRIMARY KEY (id)
);
alter table public."integration_audit_log" enable row level security;

create table public."integration_budgets" (
  "id" uuid default gen_random_uuid() not null,
  "scope_type" text not null,
  "scope_id" text,
  "environment" text,
  "period" text not null,
  "soft_limit" numeric,
  "hard_limit" numeric,
  "currency" text default 'USD'::text not null,
  "is_enabled" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_budgets_period_check" CHECK (period = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  constraint "integration_budgets_pkey" PRIMARY KEY (id),
  constraint "integration_budgets_scope_type_check" CHECK (scope_type = ANY (ARRAY['provider'::text, 'connection'::text, 'agent'::text, 'environment'::text]))
);
alter table public."integration_budgets" enable row level security;

create table public."integration_credential_events" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid not null,
  "event_type" text not null,
  "actor_id" uuid,
  "reason" text,
  "previous_secret_reference_hash" text,
  "new_secret_reference_hash" text,
  "result" text default 'success'::text not null,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_credential_events_pkey" PRIMARY KEY (id)
);
alter table public."integration_credential_events" enable row level security;

create table public."integration_health_checks" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid not null,
  "status" text not null,
  "response_code" integer,
  "latency_ms" integer,
  "error_category" text,
  "safe_error_message" text,
  "checked_at" timestamp with time zone default now() not null,
  constraint "integration_health_checks_pkey" PRIMARY KEY (id)
);
alter table public."integration_health_checks" enable row level security;

create table public."integration_incident_events" (
  "id" uuid default gen_random_uuid() not null,
  "incident_id" uuid not null,
  "actor_id" uuid,
  "event_type" text not null,
  "message" text,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_incident_events_pkey" PRIMARY KEY (id)
);
alter table public."integration_incident_events" enable row level security;

create table public."integration_incidents" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "severity" text default 'medium'::text not null,
  "status" text default 'open'::text not null,
  "provider" text,
  "integration_connection_id" uuid,
  "environment" text,
  "incident_type" text default 'unknown'::text not null,
  "detected_at" timestamp with time zone default now() not null,
  "acknowledged_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "detected_by" uuid,
  "assigned_to" uuid,
  "summary" text,
  "root_cause_category" text,
  "resolution_summary" text,
  "maintenance" boolean default false not null,
  "maintenance_started_at" timestamp with time zone,
  "maintenance_reason" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_incidents_pkey" PRIMARY KEY (id),
  constraint "integration_incidents_severity_check" CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  constraint "integration_incidents_status_check" CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'mitigating'::text, 'monitoring'::text, 'resolved'::text]))
);
alter table public."integration_incidents" enable row level security;

create table public."integration_limits" (
  "id" uuid default gen_random_uuid() not null,
  "scope_type" text not null,
  "scope_id" text,
  "environment" text,
  "requests_per_minute" integer,
  "requests_per_hour" integer,
  "requests_per_day" integer,
  "max_concurrent" integer,
  "monthly_request_limit" integer,
  "usage_paused" boolean default false not null,
  "is_enabled" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_limits_pkey" PRIMARY KEY (id),
  constraint "integration_limits_scope_type_check" CHECK (scope_type = ANY (ARRAY['provider'::text, 'connection'::text, 'agent'::text, 'environment'::text]))
);
alter table public."integration_limits" enable row level security;

create table public."integration_project_assignments" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid not null,
  "project_id" uuid not null,
  "granted_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_project_assignments_pkey" PRIMARY KEY (id),
  constraint "integration_project_assignments_unique" UNIQUE (integration_connection_id, project_id)
);
alter table public."integration_project_assignments" enable row level security;

create table public."integration_requests" (
  "id" uuid default gen_random_uuid() not null,
  "request_id" text not null,
  "integration_connection_id" uuid,
  "provider_id" text,
  "environment" text,
  "agent_id" text,
  "operation" text,
  "idempotency_key" text,
  "status" text not null,
  "error_code" text,
  "latency_ms" integer,
  "created_at" timestamp with time zone default now() not null,
  "workspace_id" uuid,
  "project_id" uuid,
  constraint "integration_requests_pkey" PRIMARY KEY (id),
  constraint "integration_requests_request_id_key" UNIQUE (request_id)
);
alter table public."integration_requests" enable row level security;

create table public."integration_template_audit" (
  "id" uuid default gen_random_uuid() not null,
  "template_id" uuid,
  "workspace_id" uuid,
  "project_id" uuid,
  "actor_id" uuid,
  "action" text not null,
  "result" text default 'success'::text not null,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_template_audit_pkey" PRIMARY KEY (id)
);
alter table public."integration_template_audit" enable row level security;

create table public."integration_template_items" (
  "id" uuid default gen_random_uuid() not null,
  "template_id" uuid not null,
  "provider" text not null,
  "integration_category" text default 'ai'::text not null,
  "environment" text default 'production'::text not null,
  "required" boolean default true not null,
  "configuration" jsonb,
  "default_access_level" text default 'execute'::text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "integration_template_items_pkey" PRIMARY KEY (id)
);
alter table public."integration_template_items" enable row level security;

create table public."integration_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "description" text,
  "category" text default 'general'::text not null,
  "owner_type" text default 'system'::text not null,
  "owner_id" uuid,
  "status" text default 'active'::text not null,
  "version" integer default 1 not null,
  "routing_presets" jsonb default '[]'::jsonb not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_templates_pkey" PRIMARY KEY (id)
);
alter table public."integration_templates" enable row level security;

create table public."integration_threshold_events" (
  "id" uuid default gen_random_uuid() not null,
  "budget_id" uuid,
  "threshold_pct" integer not null,
  "period_start" timestamp with time zone not null,
  "period_end" timestamp with time zone not null,
  "fired_at" timestamp with time zone default now() not null,
  "notified_at" timestamp with time zone,
  constraint "integration_threshold_events_pkey" PRIMARY KEY (id),
  constraint "integration_threshold_unique" UNIQUE (budget_id, threshold_pct, period_start)
);
alter table public."integration_threshold_events" enable row level security;

create table public."integration_usage_events" (
  "id" uuid default gen_random_uuid() not null,
  "request_id" text not null,
  "integration_connection_id" uuid,
  "agent_id" text,
  "environment" text,
  "provider" text,
  "operation" text,
  "model_id" text,
  "input_units" numeric,
  "output_units" numeric,
  "request_count" integer default 1 not null,
  "estimated_cost" numeric,
  "currency" text default 'USD'::text not null,
  "success" boolean default true not null,
  "latency_ms" integer,
  "created_at" timestamp with time zone default now() not null,
  "workspace_id" uuid,
  "project_id" uuid,
  constraint "integration_usage_events_pkey" PRIMARY KEY (id)
);
alter table public."integration_usage_events" enable row level security;

create table public."integration_webhook_events" (
  "id" uuid default gen_random_uuid() not null,
  "webhook_id" uuid not null,
  "provider_event_id" text,
  "event_type" text,
  "workspace_id" uuid,
  "project_id" uuid,
  "environment" text,
  "status" text default 'received'::text not null,
  "handler" text,
  "safe_data" jsonb,
  "received_at" timestamp with time zone default now() not null,
  "verified_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "request_id" text,
  "safe_error" text,
  constraint "integration_webhook_events_pkey" PRIMARY KEY (id)
);
alter table public."integration_webhook_events" enable row level security;

create table public."integration_webhooks" (
  "id" uuid default gen_random_uuid() not null,
  "integration_connection_id" uuid not null,
  "workspace_id" uuid,
  "project_id" uuid,
  "provider" text not null,
  "environment" text default 'production'::text not null,
  "endpoint_identifier" text not null,
  "status" text default 'enabled'::text not null,
  "signing_secret_reference" text,
  "signing_secret_suffix" text,
  "allowed_events" text[] default ARRAY[]::text[] not null,
  "consecutive_verification_failures" integer default 0 not null,
  "last_received_at" timestamp with time zone,
  "last_verified_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "integration_webhooks_endpoint_unique" UNIQUE (endpoint_identifier),
  constraint "integration_webhooks_pkey" PRIMARY KEY (id)
);
alter table public."integration_webhooks" enable row level security;

create table public."plan_integration_entitlements" (
  "id" uuid default gen_random_uuid() not null,
  "plan_key" text not null,
  "feature_key" text not null,
  "provider_scope" text default 'ai'::text not null,
  "monthly_request_limit" numeric,
  "monthly_unit_limit" numeric,
  "monthly_cost_allowance" numeric,
  "currency" text default 'USD'::text not null,
  "allow_customer_api_key" boolean default true not null,
  "allow_system_provider" boolean default true not null,
  "allow_fallback" boolean default true not null,
  "hard_limit_behavior" text default 'soft'::text not null,
  "is_enabled" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "plan_integration_entitlements_hard_limit_behavior_check" CHECK (hard_limit_behavior = ANY (ARRAY['block'::text, 'soft'::text])),
  constraint "plan_integration_entitlements_pkey" PRIMARY KEY (id),
  constraint "plan_integration_entitlements_unique" UNIQUE (plan_key, feature_key)
);
alter table public."plan_integration_entitlements" enable row level security;

create table public."project_integration_audit" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid,
  "project_id" uuid,
  "integration_connection_id" uuid,
  "provider_id" text,
  "agent_id" text,
  "operation" text,
  "environment" text,
  "action" text not null,
  "result" text default 'success'::text not null,
  "request_id" text,
  "user_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "project_integration_audit_pkey" PRIMARY KEY (id)
);
alter table public."project_integration_audit" enable row level security;

create table public."project_integration_permissions" (
  "id" uuid default gen_random_uuid() not null,
  "project_id" uuid not null,
  "integration_connection_id" uuid not null,
  "environment" text default 'production'::text not null,
  "access_level" text default 'execute'::text not null,
  "allowed_operations" text[] default ARRAY[]::text[] not null,
  "is_enabled" boolean default true not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "project_integration_permissions_pkey" PRIMARY KEY (id),
  constraint "project_integration_permissions_unique" UNIQUE (project_id, integration_connection_id)
);
alter table public."project_integration_permissions" enable row level security;

create table public."project_integration_state" (
  "project_id" uuid not null,
  "paused" boolean default false not null,
  "paused_by" uuid,
  "paused_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null,
  constraint "project_integration_state_pkey" PRIMARY KEY (project_id)
);
alter table public."project_integration_state" enable row level security;

create table public."project_template_applications" (
  "id" uuid default gen_random_uuid() not null,
  "project_id" uuid not null,
  "template_id" uuid not null,
  "version" integer default 1 not null,
  "applied_by" uuid,
  "applied_at" timestamp with time zone default now() not null,
  constraint "project_template_applications_pkey" PRIMARY KEY (id),
  constraint "project_template_applications_unique" UNIQUE (project_id, template_id)
);
alter table public."project_template_applications" enable row level security;

create table public."provider_model_pricing" (
  "id" uuid default gen_random_uuid() not null,
  "provider" text not null,
  "model" text not null,
  "input_unit_price" numeric,
  "output_unit_price" numeric,
  "currency" text default 'USD'::text not null,
  "effective_from" timestamp with time zone default now() not null,
  "is_active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "provider_model_pricing_pkey" PRIMARY KEY (id),
  constraint "provider_model_pricing_unique" UNIQUE (provider, model)
);
alter table public."provider_model_pricing" enable row level security;

create table public."routing_models" (
  "id" uuid default gen_random_uuid() not null,
  "provider_id" text not null,
  "model_key" text not null,
  "display_name" text not null,
  "capability_type" text not null,
  "environment" text default 'production'::text not null,
  "is_enabled" boolean default true not null,
  "context_limit" integer,
  "supports_tools" boolean default false not null,
  "supports_vision" boolean default false not null,
  "supports_structured_output" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "routing_models_capability_type_check" CHECK (capability_type = ANY (ARRAY['chat'::text, 'image_generation'::text, 'embedding'::text])),
  constraint "routing_models_pkey" PRIMARY KEY (id),
  constraint "routing_models_provider_model_unique" UNIQUE (provider_id, model_key)
);
alter table public."routing_models" enable row level security;

create table public."workspace_entitlement_overrides" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid not null,
  "feature_key" text not null,
  "override_amount" numeric not null,
  "start_at" timestamp with time zone default now() not null,
  "expires_at" timestamp with time zone,
  "reason" text not null,
  "created_by" uuid,
  "status" text default 'active'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "workspace_entitlement_overrides_override_amount_check" CHECK (override_amount >= 0::numeric),
  constraint "workspace_entitlement_overrides_pkey" PRIMARY KEY (id),
  constraint "workspace_entitlement_overrides_status_check" CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text]))
);
alter table public."workspace_entitlement_overrides" enable row level security;

create table public."workspace_members" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid not null,
  "user_id" uuid not null,
  "role" text default 'member'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "workspace_members_pkey" PRIMARY KEY (id),
  constraint "workspace_members_unique" UNIQUE (workspace_id, user_id)
);
alter table public."workspace_members" enable row level security;

create table public."workspace_usage_audit" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid,
  "feature_key" text,
  "event_type" text not null,
  "actor_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "workspace_usage_audit_pkey" PRIMARY KEY (id)
);
alter table public."workspace_usage_audit" enable row level security;

create table public."workspace_usage_events" (
  "id" uuid default gen_random_uuid() not null,
  "workspace_id" uuid not null,
  "project_id" uuid,
  "request_id" text not null,
  "feature_key" text not null,
  "integration_connection_id" uuid,
  "provider" text,
  "model_id" text,
  "usage_units" numeric default 1 not null,
  "estimated_provider_cost" numeric,
  "customer_billable_units" numeric default 1 not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "workspace_usage_events_pkey" PRIMARY KEY (id),
  constraint "workspace_usage_events_request_id_key" UNIQUE (request_id)
);
alter table public."workspace_usage_events" enable row level security;
alter table public."agent_provider_routes" add constraint "agent_provider_routes_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES forge_agents(id) ON DELETE CASCADE;
alter table public."agent_provider_routes" add constraint "agent_provider_routes_fallback_connection_id_fkey" FOREIGN KEY (fallback_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
alter table public."agent_provider_routes" add constraint "agent_provider_routes_fallback_model_id_fkey" FOREIGN KEY (fallback_model_id) REFERENCES routing_models(id) ON DELETE SET NULL;
alter table public."agent_provider_routes" add constraint "agent_provider_routes_primary_connection_id_fkey" FOREIGN KEY (primary_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
alter table public."agent_provider_routes" add constraint "agent_provider_routes_primary_model_id_fkey" FOREIGN KEY (primary_model_id) REFERENCES routing_models(id) ON DELETE SET NULL;
CREATE INDEX agent_provider_routes_agent_idx ON public.agent_provider_routes USING btree (agent_id, environment);
revoke all on table public."agent_provider_routes" from public, anon, authenticated, service_role;
grant DELETE on table public."agent_provider_routes" to "postgres";
grant INSERT on table public."agent_provider_routes" to "postgres";
grant MAINTAIN on table public."agent_provider_routes" to "postgres";
grant REFERENCES on table public."agent_provider_routes" to "postgres";
grant SELECT on table public."agent_provider_routes" to "postgres";
grant TRIGGER on table public."agent_provider_routes" to "postgres";
grant TRUNCATE on table public."agent_provider_routes" to "postgres";
grant UPDATE on table public."agent_provider_routes" to "postgres";
grant DELETE on table public."agent_provider_routes" to "anon";
grant INSERT on table public."agent_provider_routes" to "anon";
grant MAINTAIN on table public."agent_provider_routes" to "anon";
grant REFERENCES on table public."agent_provider_routes" to "anon";
grant SELECT on table public."agent_provider_routes" to "anon";
grant TRIGGER on table public."agent_provider_routes" to "anon";
grant TRUNCATE on table public."agent_provider_routes" to "anon";
grant UPDATE on table public."agent_provider_routes" to "anon";
grant DELETE on table public."agent_provider_routes" to "authenticated";
grant INSERT on table public."agent_provider_routes" to "authenticated";
grant MAINTAIN on table public."agent_provider_routes" to "authenticated";
grant REFERENCES on table public."agent_provider_routes" to "authenticated";
grant SELECT on table public."agent_provider_routes" to "authenticated";
grant TRIGGER on table public."agent_provider_routes" to "authenticated";
grant TRUNCATE on table public."agent_provider_routes" to "authenticated";
grant UPDATE on table public."agent_provider_routes" to "authenticated";
grant DELETE on table public."agent_provider_routes" to "service_role";
grant INSERT on table public."agent_provider_routes" to "service_role";
grant MAINTAIN on table public."agent_provider_routes" to "service_role";
grant REFERENCES on table public."agent_provider_routes" to "service_role";
grant SELECT on table public."agent_provider_routes" to "service_role";
grant TRIGGER on table public."agent_provider_routes" to "service_role";
grant TRUNCATE on table public."agent_provider_routes" to "service_role";
grant UPDATE on table public."agent_provider_routes" to "service_role";
CREATE INDEX idx_credential_alerts_provider ON public.credential_alerts USING btree (provider_key, environment);
CREATE INDEX idx_credential_alerts_status ON public.credential_alerts USING btree (status, severity);
revoke all on table public."credential_alerts" from public, anon, authenticated, service_role;
grant DELETE on table public."credential_alerts" to "postgres";
grant INSERT on table public."credential_alerts" to "postgres";
grant MAINTAIN on table public."credential_alerts" to "postgres";
grant REFERENCES on table public."credential_alerts" to "postgres";
grant SELECT on table public."credential_alerts" to "postgres";
grant TRIGGER on table public."credential_alerts" to "postgres";
grant TRUNCATE on table public."credential_alerts" to "postgres";
grant UPDATE on table public."credential_alerts" to "postgres";
grant DELETE on table public."credential_alerts" to "anon";
grant INSERT on table public."credential_alerts" to "anon";
grant MAINTAIN on table public."credential_alerts" to "anon";
grant REFERENCES on table public."credential_alerts" to "anon";
grant SELECT on table public."credential_alerts" to "anon";
grant TRIGGER on table public."credential_alerts" to "anon";
grant TRUNCATE on table public."credential_alerts" to "anon";
grant UPDATE on table public."credential_alerts" to "anon";
grant DELETE on table public."credential_alerts" to "authenticated";
grant INSERT on table public."credential_alerts" to "authenticated";
grant MAINTAIN on table public."credential_alerts" to "authenticated";
grant REFERENCES on table public."credential_alerts" to "authenticated";
grant SELECT on table public."credential_alerts" to "authenticated";
grant TRIGGER on table public."credential_alerts" to "authenticated";
grant TRUNCATE on table public."credential_alerts" to "authenticated";
grant UPDATE on table public."credential_alerts" to "authenticated";
grant DELETE on table public."credential_alerts" to "service_role";
grant INSERT on table public."credential_alerts" to "service_role";
grant MAINTAIN on table public."credential_alerts" to "service_role";
grant REFERENCES on table public."credential_alerts" to "service_role";
grant SELECT on table public."credential_alerts" to "service_role";
grant TRIGGER on table public."credential_alerts" to "service_role";
grant TRUNCATE on table public."credential_alerts" to "service_role";
grant UPDATE on table public."credential_alerts" to "service_role";
CREATE INDEX idx_credential_health_runs_status ON public.credential_health_runs USING btree (status, started_at);
revoke all on table public."credential_health_runs" from public, anon, authenticated, service_role;
grant DELETE on table public."credential_health_runs" to "postgres";
grant INSERT on table public."credential_health_runs" to "postgres";
grant MAINTAIN on table public."credential_health_runs" to "postgres";
grant REFERENCES on table public."credential_health_runs" to "postgres";
grant SELECT on table public."credential_health_runs" to "postgres";
grant TRIGGER on table public."credential_health_runs" to "postgres";
grant TRUNCATE on table public."credential_health_runs" to "postgres";
grant UPDATE on table public."credential_health_runs" to "postgres";
grant DELETE on table public."credential_health_runs" to "anon";
grant INSERT on table public."credential_health_runs" to "anon";
grant MAINTAIN on table public."credential_health_runs" to "anon";
grant REFERENCES on table public."credential_health_runs" to "anon";
grant SELECT on table public."credential_health_runs" to "anon";
grant TRIGGER on table public."credential_health_runs" to "anon";
grant TRUNCATE on table public."credential_health_runs" to "anon";
grant UPDATE on table public."credential_health_runs" to "anon";
grant DELETE on table public."credential_health_runs" to "authenticated";
grant INSERT on table public."credential_health_runs" to "authenticated";
grant MAINTAIN on table public."credential_health_runs" to "authenticated";
grant REFERENCES on table public."credential_health_runs" to "authenticated";
grant SELECT on table public."credential_health_runs" to "authenticated";
grant TRIGGER on table public."credential_health_runs" to "authenticated";
grant TRUNCATE on table public."credential_health_runs" to "authenticated";
grant UPDATE on table public."credential_health_runs" to "authenticated";
grant DELETE on table public."credential_health_runs" to "service_role";
grant INSERT on table public."credential_health_runs" to "service_role";
grant MAINTAIN on table public."credential_health_runs" to "service_role";
grant REFERENCES on table public."credential_health_runs" to "service_role";
grant SELECT on table public."credential_health_runs" to "service_role";
grant TRIGGER on table public."credential_health_runs" to "service_role";
grant TRUNCATE on table public."credential_health_runs" to "service_role";
grant UPDATE on table public."credential_health_runs" to "service_role";
CREATE INDEX customer_integration_audit_conn_idx ON public.customer_integration_audit USING btree (integration_connection_id);
CREATE INDEX customer_integration_audit_workspace_idx ON public.customer_integration_audit USING btree (workspace_id);
revoke all on table public."customer_integration_audit" from public, anon, authenticated, service_role;
grant DELETE on table public."customer_integration_audit" to "postgres";
grant INSERT on table public."customer_integration_audit" to "postgres";
grant MAINTAIN on table public."customer_integration_audit" to "postgres";
grant REFERENCES on table public."customer_integration_audit" to "postgres";
grant SELECT on table public."customer_integration_audit" to "postgres";
grant TRIGGER on table public."customer_integration_audit" to "postgres";
grant TRUNCATE on table public."customer_integration_audit" to "postgres";
grant UPDATE on table public."customer_integration_audit" to "postgres";
grant DELETE on table public."customer_integration_audit" to "anon";
grant INSERT on table public."customer_integration_audit" to "anon";
grant MAINTAIN on table public."customer_integration_audit" to "anon";
grant REFERENCES on table public."customer_integration_audit" to "anon";
grant SELECT on table public."customer_integration_audit" to "anon";
grant TRIGGER on table public."customer_integration_audit" to "anon";
grant TRUNCATE on table public."customer_integration_audit" to "anon";
grant UPDATE on table public."customer_integration_audit" to "anon";
grant DELETE on table public."customer_integration_audit" to "authenticated";
grant INSERT on table public."customer_integration_audit" to "authenticated";
grant MAINTAIN on table public."customer_integration_audit" to "authenticated";
grant REFERENCES on table public."customer_integration_audit" to "authenticated";
grant SELECT on table public."customer_integration_audit" to "authenticated";
grant TRIGGER on table public."customer_integration_audit" to "authenticated";
grant TRUNCATE on table public."customer_integration_audit" to "authenticated";
grant UPDATE on table public."customer_integration_audit" to "authenticated";
grant DELETE on table public."customer_integration_audit" to "service_role";
grant INSERT on table public."customer_integration_audit" to "service_role";
grant MAINTAIN on table public."customer_integration_audit" to "service_role";
grant REFERENCES on table public."customer_integration_audit" to "service_role";
grant SELECT on table public."customer_integration_audit" to "service_role";
grant TRIGGER on table public."customer_integration_audit" to "service_role";
grant TRUNCATE on table public."customer_integration_audit" to "service_role";
grant UPDATE on table public."customer_integration_audit" to "service_role";
alter table public."forge_active_requests" add constraint "forge_active_requests_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
CREATE INDEX forge_active_requests_conn_idx ON public.forge_active_requests USING btree (integration_connection_id);
revoke all on table public."forge_active_requests" from public, anon, authenticated, service_role;
grant DELETE on table public."forge_active_requests" to "postgres";
grant INSERT on table public."forge_active_requests" to "postgres";
grant MAINTAIN on table public."forge_active_requests" to "postgres";
grant REFERENCES on table public."forge_active_requests" to "postgres";
grant SELECT on table public."forge_active_requests" to "postgres";
grant TRIGGER on table public."forge_active_requests" to "postgres";
grant TRUNCATE on table public."forge_active_requests" to "postgres";
grant UPDATE on table public."forge_active_requests" to "postgres";
grant DELETE on table public."forge_active_requests" to "anon";
grant INSERT on table public."forge_active_requests" to "anon";
grant MAINTAIN on table public."forge_active_requests" to "anon";
grant REFERENCES on table public."forge_active_requests" to "anon";
grant SELECT on table public."forge_active_requests" to "anon";
grant TRIGGER on table public."forge_active_requests" to "anon";
grant TRUNCATE on table public."forge_active_requests" to "anon";
grant UPDATE on table public."forge_active_requests" to "anon";
grant DELETE on table public."forge_active_requests" to "authenticated";
grant INSERT on table public."forge_active_requests" to "authenticated";
grant MAINTAIN on table public."forge_active_requests" to "authenticated";
grant REFERENCES on table public."forge_active_requests" to "authenticated";
grant SELECT on table public."forge_active_requests" to "authenticated";
grant TRIGGER on table public."forge_active_requests" to "authenticated";
grant TRUNCATE on table public."forge_active_requests" to "authenticated";
grant UPDATE on table public."forge_active_requests" to "authenticated";
grant DELETE on table public."forge_active_requests" to "service_role";
grant INSERT on table public."forge_active_requests" to "service_role";
grant MAINTAIN on table public."forge_active_requests" to "service_role";
grant REFERENCES on table public."forge_active_requests" to "service_role";
grant SELECT on table public."forge_active_requests" to "service_role";
grant TRIGGER on table public."forge_active_requests" to "service_role";
grant TRUNCATE on table public."forge_active_requests" to "service_role";
grant UPDATE on table public."forge_active_requests" to "service_role";
revoke all on table public."forge_usage_state" from public, anon, authenticated, service_role;
grant DELETE on table public."forge_usage_state" to "postgres";
grant INSERT on table public."forge_usage_state" to "postgres";
grant MAINTAIN on table public."forge_usage_state" to "postgres";
grant REFERENCES on table public."forge_usage_state" to "postgres";
grant SELECT on table public."forge_usage_state" to "postgres";
grant TRIGGER on table public."forge_usage_state" to "postgres";
grant TRUNCATE on table public."forge_usage_state" to "postgres";
grant UPDATE on table public."forge_usage_state" to "postgres";
grant DELETE on table public."forge_usage_state" to "anon";
grant INSERT on table public."forge_usage_state" to "anon";
grant MAINTAIN on table public."forge_usage_state" to "anon";
grant REFERENCES on table public."forge_usage_state" to "anon";
grant SELECT on table public."forge_usage_state" to "anon";
grant TRIGGER on table public."forge_usage_state" to "anon";
grant TRUNCATE on table public."forge_usage_state" to "anon";
grant UPDATE on table public."forge_usage_state" to "anon";
grant DELETE on table public."forge_usage_state" to "authenticated";
grant INSERT on table public."forge_usage_state" to "authenticated";
grant MAINTAIN on table public."forge_usage_state" to "authenticated";
grant REFERENCES on table public."forge_usage_state" to "authenticated";
grant SELECT on table public."forge_usage_state" to "authenticated";
grant TRIGGER on table public."forge_usage_state" to "authenticated";
grant TRUNCATE on table public."forge_usage_state" to "authenticated";
grant UPDATE on table public."forge_usage_state" to "authenticated";
grant DELETE on table public."forge_usage_state" to "service_role";
grant INSERT on table public."forge_usage_state" to "service_role";
grant MAINTAIN on table public."forge_usage_state" to "service_role";
grant REFERENCES on table public."forge_usage_state" to "service_role";
grant SELECT on table public."forge_usage_state" to "service_role";
grant TRIGGER on table public."forge_usage_state" to "service_role";
grant TRUNCATE on table public."forge_usage_state" to "service_role";
grant UPDATE on table public."forge_usage_state" to "service_role";
revoke all on table public."integration_alert_config" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_alert_config" to "postgres";
grant INSERT on table public."integration_alert_config" to "postgres";
grant MAINTAIN on table public."integration_alert_config" to "postgres";
grant REFERENCES on table public."integration_alert_config" to "postgres";
grant SELECT on table public."integration_alert_config" to "postgres";
grant TRIGGER on table public."integration_alert_config" to "postgres";
grant TRUNCATE on table public."integration_alert_config" to "postgres";
grant UPDATE on table public."integration_alert_config" to "postgres";
grant DELETE on table public."integration_alert_config" to "anon";
grant INSERT on table public."integration_alert_config" to "anon";
grant MAINTAIN on table public."integration_alert_config" to "anon";
grant REFERENCES on table public."integration_alert_config" to "anon";
grant SELECT on table public."integration_alert_config" to "anon";
grant TRIGGER on table public."integration_alert_config" to "anon";
grant TRUNCATE on table public."integration_alert_config" to "anon";
grant UPDATE on table public."integration_alert_config" to "anon";
grant DELETE on table public."integration_alert_config" to "authenticated";
grant INSERT on table public."integration_alert_config" to "authenticated";
grant MAINTAIN on table public."integration_alert_config" to "authenticated";
grant REFERENCES on table public."integration_alert_config" to "authenticated";
grant SELECT on table public."integration_alert_config" to "authenticated";
grant TRIGGER on table public."integration_alert_config" to "authenticated";
grant TRUNCATE on table public."integration_alert_config" to "authenticated";
grant UPDATE on table public."integration_alert_config" to "authenticated";
grant DELETE on table public."integration_alert_config" to "service_role";
grant INSERT on table public."integration_alert_config" to "service_role";
grant MAINTAIN on table public."integration_alert_config" to "service_role";
grant REFERENCES on table public."integration_alert_config" to "service_role";
grant SELECT on table public."integration_alert_config" to "service_role";
grant TRIGGER on table public."integration_alert_config" to "service_role";
grant TRUNCATE on table public."integration_alert_config" to "service_role";
grant UPDATE on table public."integration_alert_config" to "service_role";
alter table public."integration_alert_deliveries" add constraint "integration_alert_deliveries_incident_id_fkey" FOREIGN KEY (incident_id) REFERENCES integration_incidents(id) ON DELETE SET NULL;
revoke all on table public."integration_alert_deliveries" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_alert_deliveries" to "postgres";
grant INSERT on table public."integration_alert_deliveries" to "postgres";
grant MAINTAIN on table public."integration_alert_deliveries" to "postgres";
grant REFERENCES on table public."integration_alert_deliveries" to "postgres";
grant SELECT on table public."integration_alert_deliveries" to "postgres";
grant TRIGGER on table public."integration_alert_deliveries" to "postgres";
grant TRUNCATE on table public."integration_alert_deliveries" to "postgres";
grant UPDATE on table public."integration_alert_deliveries" to "postgres";
grant DELETE on table public."integration_alert_deliveries" to "anon";
grant INSERT on table public."integration_alert_deliveries" to "anon";
grant MAINTAIN on table public."integration_alert_deliveries" to "anon";
grant REFERENCES on table public."integration_alert_deliveries" to "anon";
grant SELECT on table public."integration_alert_deliveries" to "anon";
grant TRIGGER on table public."integration_alert_deliveries" to "anon";
grant TRUNCATE on table public."integration_alert_deliveries" to "anon";
grant UPDATE on table public."integration_alert_deliveries" to "anon";
grant DELETE on table public."integration_alert_deliveries" to "authenticated";
grant INSERT on table public."integration_alert_deliveries" to "authenticated";
grant MAINTAIN on table public."integration_alert_deliveries" to "authenticated";
grant REFERENCES on table public."integration_alert_deliveries" to "authenticated";
grant SELECT on table public."integration_alert_deliveries" to "authenticated";
grant TRIGGER on table public."integration_alert_deliveries" to "authenticated";
grant TRUNCATE on table public."integration_alert_deliveries" to "authenticated";
grant UPDATE on table public."integration_alert_deliveries" to "authenticated";
grant DELETE on table public."integration_alert_deliveries" to "service_role";
grant INSERT on table public."integration_alert_deliveries" to "service_role";
grant MAINTAIN on table public."integration_alert_deliveries" to "service_role";
grant REFERENCES on table public."integration_alert_deliveries" to "service_role";
grant SELECT on table public."integration_alert_deliveries" to "service_role";
grant TRIGGER on table public."integration_alert_deliveries" to "service_role";
grant TRUNCATE on table public."integration_alert_deliveries" to "service_role";
grant UPDATE on table public."integration_alert_deliveries" to "service_role";
alter table public."integration_audit_log" add constraint "integration_audit_log_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
CREATE INDEX integration_audit_log_action_idx ON public.integration_audit_log USING btree (action);
CREATE INDEX integration_audit_log_actor_idx ON public.integration_audit_log USING btree (actor_type);
CREATE INDEX integration_audit_log_conn_idx ON public.integration_audit_log USING btree (integration_connection_id, created_at DESC);
CREATE INDEX integration_audit_log_created_idx ON public.integration_audit_log USING btree (created_at DESC);
CREATE INDEX integration_audit_log_env_idx ON public.integration_audit_log USING btree (environment);
CREATE INDEX integration_audit_log_provider_idx ON public.integration_audit_log USING btree (provider_id);
revoke all on table public."integration_audit_log" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_audit_log" to "postgres";
grant INSERT on table public."integration_audit_log" to "postgres";
grant MAINTAIN on table public."integration_audit_log" to "postgres";
grant REFERENCES on table public."integration_audit_log" to "postgres";
grant SELECT on table public."integration_audit_log" to "postgres";
grant TRIGGER on table public."integration_audit_log" to "postgres";
grant TRUNCATE on table public."integration_audit_log" to "postgres";
grant UPDATE on table public."integration_audit_log" to "postgres";
grant DELETE on table public."integration_audit_log" to "anon";
grant INSERT on table public."integration_audit_log" to "anon";
grant MAINTAIN on table public."integration_audit_log" to "anon";
grant REFERENCES on table public."integration_audit_log" to "anon";
grant SELECT on table public."integration_audit_log" to "anon";
grant TRIGGER on table public."integration_audit_log" to "anon";
grant TRUNCATE on table public."integration_audit_log" to "anon";
grant UPDATE on table public."integration_audit_log" to "anon";
grant DELETE on table public."integration_audit_log" to "authenticated";
grant INSERT on table public."integration_audit_log" to "authenticated";
grant MAINTAIN on table public."integration_audit_log" to "authenticated";
grant REFERENCES on table public."integration_audit_log" to "authenticated";
grant SELECT on table public."integration_audit_log" to "authenticated";
grant TRIGGER on table public."integration_audit_log" to "authenticated";
grant TRUNCATE on table public."integration_audit_log" to "authenticated";
grant UPDATE on table public."integration_audit_log" to "authenticated";
grant DELETE on table public."integration_audit_log" to "service_role";
grant INSERT on table public."integration_audit_log" to "service_role";
grant MAINTAIN on table public."integration_audit_log" to "service_role";
grant REFERENCES on table public."integration_audit_log" to "service_role";
grant SELECT on table public."integration_audit_log" to "service_role";
grant TRIGGER on table public."integration_audit_log" to "service_role";
grant TRUNCATE on table public."integration_audit_log" to "service_role";
grant UPDATE on table public."integration_audit_log" to "service_role";
CREATE INDEX integration_budgets_scope_idx ON public.integration_budgets USING btree (scope_type, scope_id, environment, is_enabled);
revoke all on table public."integration_budgets" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_budgets" to "postgres";
grant INSERT on table public."integration_budgets" to "postgres";
grant MAINTAIN on table public."integration_budgets" to "postgres";
grant REFERENCES on table public."integration_budgets" to "postgres";
grant SELECT on table public."integration_budgets" to "postgres";
grant TRIGGER on table public."integration_budgets" to "postgres";
grant TRUNCATE on table public."integration_budgets" to "postgres";
grant UPDATE on table public."integration_budgets" to "postgres";
grant DELETE on table public."integration_budgets" to "anon";
grant INSERT on table public."integration_budgets" to "anon";
grant MAINTAIN on table public."integration_budgets" to "anon";
grant REFERENCES on table public."integration_budgets" to "anon";
grant SELECT on table public."integration_budgets" to "anon";
grant TRIGGER on table public."integration_budgets" to "anon";
grant TRUNCATE on table public."integration_budgets" to "anon";
grant UPDATE on table public."integration_budgets" to "anon";
grant DELETE on table public."integration_budgets" to "authenticated";
grant INSERT on table public."integration_budgets" to "authenticated";
grant MAINTAIN on table public."integration_budgets" to "authenticated";
grant REFERENCES on table public."integration_budgets" to "authenticated";
grant SELECT on table public."integration_budgets" to "authenticated";
grant TRIGGER on table public."integration_budgets" to "authenticated";
grant TRUNCATE on table public."integration_budgets" to "authenticated";
grant UPDATE on table public."integration_budgets" to "authenticated";
grant DELETE on table public."integration_budgets" to "service_role";
grant INSERT on table public."integration_budgets" to "service_role";
grant MAINTAIN on table public."integration_budgets" to "service_role";
grant REFERENCES on table public."integration_budgets" to "service_role";
grant SELECT on table public."integration_budgets" to "service_role";
grant TRIGGER on table public."integration_budgets" to "service_role";
grant TRUNCATE on table public."integration_budgets" to "service_role";
grant UPDATE on table public."integration_budgets" to "service_role";
alter table public."integration_credential_events" add constraint "integration_credential_events_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
CREATE INDEX integration_credential_events_conn_idx ON public.integration_credential_events USING btree (integration_connection_id, created_at DESC);
CREATE INDEX integration_credential_events_type_idx ON public.integration_credential_events USING btree (event_type, created_at DESC);
revoke all on table public."integration_credential_events" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_credential_events" to "postgres";
grant INSERT on table public."integration_credential_events" to "postgres";
grant MAINTAIN on table public."integration_credential_events" to "postgres";
grant REFERENCES on table public."integration_credential_events" to "postgres";
grant SELECT on table public."integration_credential_events" to "postgres";
grant TRIGGER on table public."integration_credential_events" to "postgres";
grant TRUNCATE on table public."integration_credential_events" to "postgres";
grant UPDATE on table public."integration_credential_events" to "postgres";
grant DELETE on table public."integration_credential_events" to "anon";
grant INSERT on table public."integration_credential_events" to "anon";
grant MAINTAIN on table public."integration_credential_events" to "anon";
grant REFERENCES on table public."integration_credential_events" to "anon";
grant SELECT on table public."integration_credential_events" to "anon";
grant TRIGGER on table public."integration_credential_events" to "anon";
grant TRUNCATE on table public."integration_credential_events" to "anon";
grant UPDATE on table public."integration_credential_events" to "anon";
grant DELETE on table public."integration_credential_events" to "authenticated";
grant INSERT on table public."integration_credential_events" to "authenticated";
grant MAINTAIN on table public."integration_credential_events" to "authenticated";
grant REFERENCES on table public."integration_credential_events" to "authenticated";
grant SELECT on table public."integration_credential_events" to "authenticated";
grant TRIGGER on table public."integration_credential_events" to "authenticated";
grant TRUNCATE on table public."integration_credential_events" to "authenticated";
grant UPDATE on table public."integration_credential_events" to "authenticated";
grant DELETE on table public."integration_credential_events" to "service_role";
grant INSERT on table public."integration_credential_events" to "service_role";
grant MAINTAIN on table public."integration_credential_events" to "service_role";
grant REFERENCES on table public."integration_credential_events" to "service_role";
grant SELECT on table public."integration_credential_events" to "service_role";
grant TRIGGER on table public."integration_credential_events" to "service_role";
grant TRUNCATE on table public."integration_credential_events" to "service_role";
grant UPDATE on table public."integration_credential_events" to "service_role";
alter table public."integration_health_checks" add constraint "integration_health_checks_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
CREATE INDEX integration_health_checks_conn_idx ON public.integration_health_checks USING btree (integration_connection_id, checked_at DESC);
revoke all on table public."integration_health_checks" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_health_checks" to "postgres";
grant INSERT on table public."integration_health_checks" to "postgres";
grant MAINTAIN on table public."integration_health_checks" to "postgres";
grant REFERENCES on table public."integration_health_checks" to "postgres";
grant SELECT on table public."integration_health_checks" to "postgres";
grant TRIGGER on table public."integration_health_checks" to "postgres";
grant TRUNCATE on table public."integration_health_checks" to "postgres";
grant UPDATE on table public."integration_health_checks" to "postgres";
grant DELETE on table public."integration_health_checks" to "anon";
grant INSERT on table public."integration_health_checks" to "anon";
grant MAINTAIN on table public."integration_health_checks" to "anon";
grant REFERENCES on table public."integration_health_checks" to "anon";
grant SELECT on table public."integration_health_checks" to "anon";
grant TRIGGER on table public."integration_health_checks" to "anon";
grant TRUNCATE on table public."integration_health_checks" to "anon";
grant UPDATE on table public."integration_health_checks" to "anon";
grant DELETE on table public."integration_health_checks" to "authenticated";
grant INSERT on table public."integration_health_checks" to "authenticated";
grant MAINTAIN on table public."integration_health_checks" to "authenticated";
grant REFERENCES on table public."integration_health_checks" to "authenticated";
grant SELECT on table public."integration_health_checks" to "authenticated";
grant TRIGGER on table public."integration_health_checks" to "authenticated";
grant TRUNCATE on table public."integration_health_checks" to "authenticated";
grant UPDATE on table public."integration_health_checks" to "authenticated";
grant DELETE on table public."integration_health_checks" to "service_role";
grant INSERT on table public."integration_health_checks" to "service_role";
grant MAINTAIN on table public."integration_health_checks" to "service_role";
grant REFERENCES on table public."integration_health_checks" to "service_role";
grant SELECT on table public."integration_health_checks" to "service_role";
grant TRIGGER on table public."integration_health_checks" to "service_role";
grant TRUNCATE on table public."integration_health_checks" to "service_role";
grant UPDATE on table public."integration_health_checks" to "service_role";
alter table public."integration_incident_events" add constraint "integration_incident_events_incident_id_fkey" FOREIGN KEY (incident_id) REFERENCES integration_incidents(id) ON DELETE CASCADE;
CREATE INDEX integration_incident_events_incident_idx ON public.integration_incident_events USING btree (incident_id, created_at DESC);
revoke all on table public."integration_incident_events" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_incident_events" to "postgres";
grant INSERT on table public."integration_incident_events" to "postgres";
grant MAINTAIN on table public."integration_incident_events" to "postgres";
grant REFERENCES on table public."integration_incident_events" to "postgres";
grant SELECT on table public."integration_incident_events" to "postgres";
grant TRIGGER on table public."integration_incident_events" to "postgres";
grant TRUNCATE on table public."integration_incident_events" to "postgres";
grant UPDATE on table public."integration_incident_events" to "postgres";
grant DELETE on table public."integration_incident_events" to "anon";
grant INSERT on table public."integration_incident_events" to "anon";
grant MAINTAIN on table public."integration_incident_events" to "anon";
grant REFERENCES on table public."integration_incident_events" to "anon";
grant SELECT on table public."integration_incident_events" to "anon";
grant TRIGGER on table public."integration_incident_events" to "anon";
grant TRUNCATE on table public."integration_incident_events" to "anon";
grant UPDATE on table public."integration_incident_events" to "anon";
grant DELETE on table public."integration_incident_events" to "authenticated";
grant INSERT on table public."integration_incident_events" to "authenticated";
grant MAINTAIN on table public."integration_incident_events" to "authenticated";
grant REFERENCES on table public."integration_incident_events" to "authenticated";
grant SELECT on table public."integration_incident_events" to "authenticated";
grant TRIGGER on table public."integration_incident_events" to "authenticated";
grant TRUNCATE on table public."integration_incident_events" to "authenticated";
grant UPDATE on table public."integration_incident_events" to "authenticated";
grant DELETE on table public."integration_incident_events" to "service_role";
grant INSERT on table public."integration_incident_events" to "service_role";
grant MAINTAIN on table public."integration_incident_events" to "service_role";
grant REFERENCES on table public."integration_incident_events" to "service_role";
grant SELECT on table public."integration_incident_events" to "service_role";
grant TRIGGER on table public."integration_incident_events" to "service_role";
grant TRUNCATE on table public."integration_incident_events" to "service_role";
grant UPDATE on table public."integration_incident_events" to "service_role";
alter table public."integration_incidents" add constraint "integration_incidents_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
CREATE INDEX integration_incidents_detected_idx ON public.integration_incidents USING btree (detected_at DESC);
CREATE INDEX integration_incidents_env_idx ON public.integration_incidents USING btree (environment);
CREATE INDEX integration_incidents_provider_idx ON public.integration_incidents USING btree (provider);
CREATE INDEX integration_incidents_severity_idx ON public.integration_incidents USING btree (severity);
CREATE INDEX integration_incidents_status_idx ON public.integration_incidents USING btree (status);
revoke all on table public."integration_incidents" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_incidents" to "postgres";
grant INSERT on table public."integration_incidents" to "postgres";
grant MAINTAIN on table public."integration_incidents" to "postgres";
grant REFERENCES on table public."integration_incidents" to "postgres";
grant SELECT on table public."integration_incidents" to "postgres";
grant TRIGGER on table public."integration_incidents" to "postgres";
grant TRUNCATE on table public."integration_incidents" to "postgres";
grant UPDATE on table public."integration_incidents" to "postgres";
grant DELETE on table public."integration_incidents" to "anon";
grant INSERT on table public."integration_incidents" to "anon";
grant MAINTAIN on table public."integration_incidents" to "anon";
grant REFERENCES on table public."integration_incidents" to "anon";
grant SELECT on table public."integration_incidents" to "anon";
grant TRIGGER on table public."integration_incidents" to "anon";
grant TRUNCATE on table public."integration_incidents" to "anon";
grant UPDATE on table public."integration_incidents" to "anon";
grant DELETE on table public."integration_incidents" to "authenticated";
grant INSERT on table public."integration_incidents" to "authenticated";
grant MAINTAIN on table public."integration_incidents" to "authenticated";
grant REFERENCES on table public."integration_incidents" to "authenticated";
grant SELECT on table public."integration_incidents" to "authenticated";
grant TRIGGER on table public."integration_incidents" to "authenticated";
grant TRUNCATE on table public."integration_incidents" to "authenticated";
grant UPDATE on table public."integration_incidents" to "authenticated";
grant DELETE on table public."integration_incidents" to "service_role";
grant INSERT on table public."integration_incidents" to "service_role";
grant MAINTAIN on table public."integration_incidents" to "service_role";
grant REFERENCES on table public."integration_incidents" to "service_role";
grant SELECT on table public."integration_incidents" to "service_role";
grant TRIGGER on table public."integration_incidents" to "service_role";
grant TRUNCATE on table public."integration_incidents" to "service_role";
grant UPDATE on table public."integration_incidents" to "service_role";
CREATE INDEX integration_limits_scope_idx ON public.integration_limits USING btree (scope_type, scope_id, environment, is_enabled);
revoke all on table public."integration_limits" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_limits" to "postgres";
grant INSERT on table public."integration_limits" to "postgres";
grant MAINTAIN on table public."integration_limits" to "postgres";
grant REFERENCES on table public."integration_limits" to "postgres";
grant SELECT on table public."integration_limits" to "postgres";
grant TRIGGER on table public."integration_limits" to "postgres";
grant TRUNCATE on table public."integration_limits" to "postgres";
grant UPDATE on table public."integration_limits" to "postgres";
grant DELETE on table public."integration_limits" to "anon";
grant INSERT on table public."integration_limits" to "anon";
grant MAINTAIN on table public."integration_limits" to "anon";
grant REFERENCES on table public."integration_limits" to "anon";
grant SELECT on table public."integration_limits" to "anon";
grant TRIGGER on table public."integration_limits" to "anon";
grant TRUNCATE on table public."integration_limits" to "anon";
grant UPDATE on table public."integration_limits" to "anon";
grant DELETE on table public."integration_limits" to "authenticated";
grant INSERT on table public."integration_limits" to "authenticated";
grant MAINTAIN on table public."integration_limits" to "authenticated";
grant REFERENCES on table public."integration_limits" to "authenticated";
grant SELECT on table public."integration_limits" to "authenticated";
grant TRIGGER on table public."integration_limits" to "authenticated";
grant TRUNCATE on table public."integration_limits" to "authenticated";
grant UPDATE on table public."integration_limits" to "authenticated";
grant DELETE on table public."integration_limits" to "service_role";
grant INSERT on table public."integration_limits" to "service_role";
grant MAINTAIN on table public."integration_limits" to "service_role";
grant REFERENCES on table public."integration_limits" to "service_role";
grant SELECT on table public."integration_limits" to "service_role";
grant TRIGGER on table public."integration_limits" to "service_role";
grant TRUNCATE on table public."integration_limits" to "service_role";
grant UPDATE on table public."integration_limits" to "service_role";
alter table public."integration_project_assignments" add constraint "integration_project_assignments_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
alter table public."integration_project_assignments" add constraint "integration_project_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX integration_project_assignments_conn_idx ON public.integration_project_assignments USING btree (integration_connection_id);
CREATE INDEX integration_project_assignments_project_idx ON public.integration_project_assignments USING btree (project_id);
revoke all on table public."integration_project_assignments" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_project_assignments" to "postgres";
grant INSERT on table public."integration_project_assignments" to "postgres";
grant MAINTAIN on table public."integration_project_assignments" to "postgres";
grant REFERENCES on table public."integration_project_assignments" to "postgres";
grant SELECT on table public."integration_project_assignments" to "postgres";
grant TRIGGER on table public."integration_project_assignments" to "postgres";
grant TRUNCATE on table public."integration_project_assignments" to "postgres";
grant UPDATE on table public."integration_project_assignments" to "postgres";
grant DELETE on table public."integration_project_assignments" to "anon";
grant INSERT on table public."integration_project_assignments" to "anon";
grant MAINTAIN on table public."integration_project_assignments" to "anon";
grant REFERENCES on table public."integration_project_assignments" to "anon";
grant SELECT on table public."integration_project_assignments" to "anon";
grant TRIGGER on table public."integration_project_assignments" to "anon";
grant TRUNCATE on table public."integration_project_assignments" to "anon";
grant UPDATE on table public."integration_project_assignments" to "anon";
grant DELETE on table public."integration_project_assignments" to "authenticated";
grant INSERT on table public."integration_project_assignments" to "authenticated";
grant MAINTAIN on table public."integration_project_assignments" to "authenticated";
grant REFERENCES on table public."integration_project_assignments" to "authenticated";
grant SELECT on table public."integration_project_assignments" to "authenticated";
grant TRIGGER on table public."integration_project_assignments" to "authenticated";
grant TRUNCATE on table public."integration_project_assignments" to "authenticated";
grant UPDATE on table public."integration_project_assignments" to "authenticated";
grant DELETE on table public."integration_project_assignments" to "service_role";
grant INSERT on table public."integration_project_assignments" to "service_role";
grant MAINTAIN on table public."integration_project_assignments" to "service_role";
grant REFERENCES on table public."integration_project_assignments" to "service_role";
grant SELECT on table public."integration_project_assignments" to "service_role";
grant TRIGGER on table public."integration_project_assignments" to "service_role";
grant TRUNCATE on table public."integration_project_assignments" to "service_role";
grant UPDATE on table public."integration_project_assignments" to "service_role";
alter table public."integration_requests" add constraint "integration_requests_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
CREATE INDEX integration_requests_agent_idx ON public.integration_requests USING btree (agent_id, created_at DESC);
CREATE INDEX integration_requests_created_idx ON public.integration_requests USING btree (created_at DESC);
CREATE INDEX integration_requests_env_idx ON public.integration_requests USING btree (environment, created_at DESC);
CREATE INDEX integration_requests_idem_idx ON public.integration_requests USING btree (integration_connection_id, operation, idempotency_key);
CREATE INDEX integration_requests_project_idx ON public.integration_requests USING btree (project_id, created_at DESC);
CREATE INDEX integration_requests_provider_idx ON public.integration_requests USING btree (provider_id, created_at DESC);
revoke all on table public."integration_requests" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_requests" to "postgres";
grant INSERT on table public."integration_requests" to "postgres";
grant MAINTAIN on table public."integration_requests" to "postgres";
grant REFERENCES on table public."integration_requests" to "postgres";
grant SELECT on table public."integration_requests" to "postgres";
grant TRIGGER on table public."integration_requests" to "postgres";
grant TRUNCATE on table public."integration_requests" to "postgres";
grant UPDATE on table public."integration_requests" to "postgres";
grant DELETE on table public."integration_requests" to "anon";
grant INSERT on table public."integration_requests" to "anon";
grant MAINTAIN on table public."integration_requests" to "anon";
grant REFERENCES on table public."integration_requests" to "anon";
grant SELECT on table public."integration_requests" to "anon";
grant TRIGGER on table public."integration_requests" to "anon";
grant TRUNCATE on table public."integration_requests" to "anon";
grant UPDATE on table public."integration_requests" to "anon";
grant DELETE on table public."integration_requests" to "authenticated";
grant INSERT on table public."integration_requests" to "authenticated";
grant MAINTAIN on table public."integration_requests" to "authenticated";
grant REFERENCES on table public."integration_requests" to "authenticated";
grant SELECT on table public."integration_requests" to "authenticated";
grant TRIGGER on table public."integration_requests" to "authenticated";
grant TRUNCATE on table public."integration_requests" to "authenticated";
grant UPDATE on table public."integration_requests" to "authenticated";
grant DELETE on table public."integration_requests" to "service_role";
grant INSERT on table public."integration_requests" to "service_role";
grant MAINTAIN on table public."integration_requests" to "service_role";
grant REFERENCES on table public."integration_requests" to "service_role";
grant SELECT on table public."integration_requests" to "service_role";
grant TRIGGER on table public."integration_requests" to "service_role";
grant TRUNCATE on table public."integration_requests" to "service_role";
grant UPDATE on table public."integration_requests" to "service_role";
CREATE INDEX integration_template_audit_project_idx ON public.integration_template_audit USING btree (project_id, created_at DESC);
CREATE INDEX integration_template_audit_template_idx ON public.integration_template_audit USING btree (template_id, created_at DESC);
revoke all on table public."integration_template_audit" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_template_audit" to "postgres";
grant INSERT on table public."integration_template_audit" to "postgres";
grant MAINTAIN on table public."integration_template_audit" to "postgres";
grant REFERENCES on table public."integration_template_audit" to "postgres";
grant SELECT on table public."integration_template_audit" to "postgres";
grant TRIGGER on table public."integration_template_audit" to "postgres";
grant TRUNCATE on table public."integration_template_audit" to "postgres";
grant UPDATE on table public."integration_template_audit" to "postgres";
grant DELETE on table public."integration_template_audit" to "anon";
grant INSERT on table public."integration_template_audit" to "anon";
grant MAINTAIN on table public."integration_template_audit" to "anon";
grant REFERENCES on table public."integration_template_audit" to "anon";
grant SELECT on table public."integration_template_audit" to "anon";
grant TRIGGER on table public."integration_template_audit" to "anon";
grant TRUNCATE on table public."integration_template_audit" to "anon";
grant UPDATE on table public."integration_template_audit" to "anon";
grant DELETE on table public."integration_template_audit" to "authenticated";
grant INSERT on table public."integration_template_audit" to "authenticated";
grant MAINTAIN on table public."integration_template_audit" to "authenticated";
grant REFERENCES on table public."integration_template_audit" to "authenticated";
grant SELECT on table public."integration_template_audit" to "authenticated";
grant TRIGGER on table public."integration_template_audit" to "authenticated";
grant TRUNCATE on table public."integration_template_audit" to "authenticated";
grant UPDATE on table public."integration_template_audit" to "authenticated";
grant DELETE on table public."integration_template_audit" to "service_role";
grant INSERT on table public."integration_template_audit" to "service_role";
grant MAINTAIN on table public."integration_template_audit" to "service_role";
grant REFERENCES on table public."integration_template_audit" to "service_role";
grant SELECT on table public."integration_template_audit" to "service_role";
grant TRIGGER on table public."integration_template_audit" to "service_role";
grant TRUNCATE on table public."integration_template_audit" to "service_role";
grant UPDATE on table public."integration_template_audit" to "service_role";
alter table public."integration_template_items" add constraint "integration_template_items_template_id_fkey" FOREIGN KEY (template_id) REFERENCES integration_templates(id) ON DELETE CASCADE;
CREATE INDEX integration_template_items_template_idx ON public.integration_template_items USING btree (template_id);
revoke all on table public."integration_template_items" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_template_items" to "postgres";
grant INSERT on table public."integration_template_items" to "postgres";
grant MAINTAIN on table public."integration_template_items" to "postgres";
grant REFERENCES on table public."integration_template_items" to "postgres";
grant SELECT on table public."integration_template_items" to "postgres";
grant TRIGGER on table public."integration_template_items" to "postgres";
grant TRUNCATE on table public."integration_template_items" to "postgres";
grant UPDATE on table public."integration_template_items" to "postgres";
grant DELETE on table public."integration_template_items" to "anon";
grant INSERT on table public."integration_template_items" to "anon";
grant MAINTAIN on table public."integration_template_items" to "anon";
grant REFERENCES on table public."integration_template_items" to "anon";
grant SELECT on table public."integration_template_items" to "anon";
grant TRIGGER on table public."integration_template_items" to "anon";
grant TRUNCATE on table public."integration_template_items" to "anon";
grant UPDATE on table public."integration_template_items" to "anon";
grant DELETE on table public."integration_template_items" to "authenticated";
grant INSERT on table public."integration_template_items" to "authenticated";
grant MAINTAIN on table public."integration_template_items" to "authenticated";
grant REFERENCES on table public."integration_template_items" to "authenticated";
grant SELECT on table public."integration_template_items" to "authenticated";
grant TRIGGER on table public."integration_template_items" to "authenticated";
grant TRUNCATE on table public."integration_template_items" to "authenticated";
grant UPDATE on table public."integration_template_items" to "authenticated";
grant DELETE on table public."integration_template_items" to "service_role";
grant INSERT on table public."integration_template_items" to "service_role";
grant MAINTAIN on table public."integration_template_items" to "service_role";
grant REFERENCES on table public."integration_template_items" to "service_role";
grant SELECT on table public."integration_template_items" to "service_role";
grant TRIGGER on table public."integration_template_items" to "service_role";
grant TRUNCATE on table public."integration_template_items" to "service_role";
grant UPDATE on table public."integration_template_items" to "service_role";
CREATE INDEX integration_templates_owner_idx ON public.integration_templates USING btree (owner_type, owner_id);
CREATE INDEX integration_templates_status_idx ON public.integration_templates USING btree (status, category);
revoke all on table public."integration_templates" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_templates" to "postgres";
grant INSERT on table public."integration_templates" to "postgres";
grant MAINTAIN on table public."integration_templates" to "postgres";
grant REFERENCES on table public."integration_templates" to "postgres";
grant SELECT on table public."integration_templates" to "postgres";
grant TRIGGER on table public."integration_templates" to "postgres";
grant TRUNCATE on table public."integration_templates" to "postgres";
grant UPDATE on table public."integration_templates" to "postgres";
grant DELETE on table public."integration_templates" to "anon";
grant INSERT on table public."integration_templates" to "anon";
grant MAINTAIN on table public."integration_templates" to "anon";
grant REFERENCES on table public."integration_templates" to "anon";
grant SELECT on table public."integration_templates" to "anon";
grant TRIGGER on table public."integration_templates" to "anon";
grant TRUNCATE on table public."integration_templates" to "anon";
grant UPDATE on table public."integration_templates" to "anon";
grant DELETE on table public."integration_templates" to "authenticated";
grant INSERT on table public."integration_templates" to "authenticated";
grant MAINTAIN on table public."integration_templates" to "authenticated";
grant REFERENCES on table public."integration_templates" to "authenticated";
grant SELECT on table public."integration_templates" to "authenticated";
grant TRIGGER on table public."integration_templates" to "authenticated";
grant TRUNCATE on table public."integration_templates" to "authenticated";
grant UPDATE on table public."integration_templates" to "authenticated";
grant DELETE on table public."integration_templates" to "service_role";
grant INSERT on table public."integration_templates" to "service_role";
grant MAINTAIN on table public."integration_templates" to "service_role";
grant REFERENCES on table public."integration_templates" to "service_role";
grant SELECT on table public."integration_templates" to "service_role";
grant TRIGGER on table public."integration_templates" to "service_role";
grant TRUNCATE on table public."integration_templates" to "service_role";
grant UPDATE on table public."integration_templates" to "service_role";
alter table public."integration_threshold_events" add constraint "integration_threshold_events_budget_id_fkey" FOREIGN KEY (budget_id) REFERENCES integration_budgets(id) ON DELETE CASCADE;
revoke all on table public."integration_threshold_events" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_threshold_events" to "postgres";
grant INSERT on table public."integration_threshold_events" to "postgres";
grant MAINTAIN on table public."integration_threshold_events" to "postgres";
grant REFERENCES on table public."integration_threshold_events" to "postgres";
grant SELECT on table public."integration_threshold_events" to "postgres";
grant TRIGGER on table public."integration_threshold_events" to "postgres";
grant TRUNCATE on table public."integration_threshold_events" to "postgres";
grant UPDATE on table public."integration_threshold_events" to "postgres";
grant DELETE on table public."integration_threshold_events" to "anon";
grant INSERT on table public."integration_threshold_events" to "anon";
grant MAINTAIN on table public."integration_threshold_events" to "anon";
grant REFERENCES on table public."integration_threshold_events" to "anon";
grant SELECT on table public."integration_threshold_events" to "anon";
grant TRIGGER on table public."integration_threshold_events" to "anon";
grant TRUNCATE on table public."integration_threshold_events" to "anon";
grant UPDATE on table public."integration_threshold_events" to "anon";
grant DELETE on table public."integration_threshold_events" to "authenticated";
grant INSERT on table public."integration_threshold_events" to "authenticated";
grant MAINTAIN on table public."integration_threshold_events" to "authenticated";
grant REFERENCES on table public."integration_threshold_events" to "authenticated";
grant SELECT on table public."integration_threshold_events" to "authenticated";
grant TRIGGER on table public."integration_threshold_events" to "authenticated";
grant TRUNCATE on table public."integration_threshold_events" to "authenticated";
grant UPDATE on table public."integration_threshold_events" to "authenticated";
grant DELETE on table public."integration_threshold_events" to "service_role";
grant INSERT on table public."integration_threshold_events" to "service_role";
grant MAINTAIN on table public."integration_threshold_events" to "service_role";
grant REFERENCES on table public."integration_threshold_events" to "service_role";
grant SELECT on table public."integration_threshold_events" to "service_role";
grant TRIGGER on table public."integration_threshold_events" to "service_role";
grant TRUNCATE on table public."integration_threshold_events" to "service_role";
grant UPDATE on table public."integration_threshold_events" to "service_role";
alter table public."integration_usage_events" add constraint "integration_usage_events_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL;
CREATE INDEX integration_usage_events_agent_idx ON public.integration_usage_events USING btree (agent_id, created_at DESC);
CREATE INDEX integration_usage_events_conn_idx ON public.integration_usage_events USING btree (integration_connection_id, created_at DESC);
CREATE INDEX integration_usage_events_created_idx ON public.integration_usage_events USING btree (created_at DESC);
CREATE INDEX integration_usage_events_env_idx ON public.integration_usage_events USING btree (environment, created_at DESC);
CREATE INDEX integration_usage_events_project_idx ON public.integration_usage_events USING btree (project_id, created_at DESC);
CREATE INDEX integration_usage_events_provider_idx ON public.integration_usage_events USING btree (provider, created_at DESC);
revoke all on table public."integration_usage_events" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_usage_events" to "postgres";
grant INSERT on table public."integration_usage_events" to "postgres";
grant MAINTAIN on table public."integration_usage_events" to "postgres";
grant REFERENCES on table public."integration_usage_events" to "postgres";
grant SELECT on table public."integration_usage_events" to "postgres";
grant TRIGGER on table public."integration_usage_events" to "postgres";
grant TRUNCATE on table public."integration_usage_events" to "postgres";
grant UPDATE on table public."integration_usage_events" to "postgres";
grant DELETE on table public."integration_usage_events" to "anon";
grant INSERT on table public."integration_usage_events" to "anon";
grant MAINTAIN on table public."integration_usage_events" to "anon";
grant REFERENCES on table public."integration_usage_events" to "anon";
grant SELECT on table public."integration_usage_events" to "anon";
grant TRIGGER on table public."integration_usage_events" to "anon";
grant TRUNCATE on table public."integration_usage_events" to "anon";
grant UPDATE on table public."integration_usage_events" to "anon";
grant DELETE on table public."integration_usage_events" to "authenticated";
grant INSERT on table public."integration_usage_events" to "authenticated";
grant MAINTAIN on table public."integration_usage_events" to "authenticated";
grant REFERENCES on table public."integration_usage_events" to "authenticated";
grant SELECT on table public."integration_usage_events" to "authenticated";
grant TRIGGER on table public."integration_usage_events" to "authenticated";
grant TRUNCATE on table public."integration_usage_events" to "authenticated";
grant UPDATE on table public."integration_usage_events" to "authenticated";
grant DELETE on table public."integration_usage_events" to "service_role";
grant INSERT on table public."integration_usage_events" to "service_role";
grant MAINTAIN on table public."integration_usage_events" to "service_role";
grant REFERENCES on table public."integration_usage_events" to "service_role";
grant SELECT on table public."integration_usage_events" to "service_role";
grant TRIGGER on table public."integration_usage_events" to "service_role";
grant TRUNCATE on table public."integration_usage_events" to "service_role";
grant UPDATE on table public."integration_usage_events" to "service_role";
alter table public."integration_webhook_events" add constraint "integration_webhook_events_webhook_id_fkey" FOREIGN KEY (webhook_id) REFERENCES integration_webhooks(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX integration_webhook_events_dedup_idx ON public.integration_webhook_events USING btree (webhook_id, provider_event_id) WHERE (provider_event_id IS NOT NULL);
CREATE INDEX integration_webhook_events_provider_event_idx ON public.integration_webhook_events USING btree (webhook_id, provider_event_id);
CREATE INDEX integration_webhook_events_status_idx ON public.integration_webhook_events USING btree (status, received_at DESC);
CREATE INDEX integration_webhook_events_webhook_idx ON public.integration_webhook_events USING btree (webhook_id, received_at DESC);
revoke all on table public."integration_webhook_events" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_webhook_events" to "postgres";
grant INSERT on table public."integration_webhook_events" to "postgres";
grant MAINTAIN on table public."integration_webhook_events" to "postgres";
grant REFERENCES on table public."integration_webhook_events" to "postgres";
grant SELECT on table public."integration_webhook_events" to "postgres";
grant TRIGGER on table public."integration_webhook_events" to "postgres";
grant TRUNCATE on table public."integration_webhook_events" to "postgres";
grant UPDATE on table public."integration_webhook_events" to "postgres";
grant DELETE on table public."integration_webhook_events" to "anon";
grant INSERT on table public."integration_webhook_events" to "anon";
grant MAINTAIN on table public."integration_webhook_events" to "anon";
grant REFERENCES on table public."integration_webhook_events" to "anon";
grant SELECT on table public."integration_webhook_events" to "anon";
grant TRIGGER on table public."integration_webhook_events" to "anon";
grant TRUNCATE on table public."integration_webhook_events" to "anon";
grant UPDATE on table public."integration_webhook_events" to "anon";
grant DELETE on table public."integration_webhook_events" to "authenticated";
grant INSERT on table public."integration_webhook_events" to "authenticated";
grant MAINTAIN on table public."integration_webhook_events" to "authenticated";
grant REFERENCES on table public."integration_webhook_events" to "authenticated";
grant SELECT on table public."integration_webhook_events" to "authenticated";
grant TRIGGER on table public."integration_webhook_events" to "authenticated";
grant TRUNCATE on table public."integration_webhook_events" to "authenticated";
grant UPDATE on table public."integration_webhook_events" to "authenticated";
grant DELETE on table public."integration_webhook_events" to "service_role";
grant INSERT on table public."integration_webhook_events" to "service_role";
grant MAINTAIN on table public."integration_webhook_events" to "service_role";
grant REFERENCES on table public."integration_webhook_events" to "service_role";
grant SELECT on table public."integration_webhook_events" to "service_role";
grant TRIGGER on table public."integration_webhook_events" to "service_role";
grant TRUNCATE on table public."integration_webhook_events" to "service_role";
grant UPDATE on table public."integration_webhook_events" to "service_role";
alter table public."integration_webhooks" add constraint "integration_webhooks_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
CREATE INDEX integration_webhooks_conn_idx ON public.integration_webhooks USING btree (integration_connection_id);
CREATE INDEX integration_webhooks_provider_idx ON public.integration_webhooks USING btree (provider, status);
revoke all on table public."integration_webhooks" from public, anon, authenticated, service_role;
grant DELETE on table public."integration_webhooks" to "postgres";
grant INSERT on table public."integration_webhooks" to "postgres";
grant MAINTAIN on table public."integration_webhooks" to "postgres";
grant REFERENCES on table public."integration_webhooks" to "postgres";
grant SELECT on table public."integration_webhooks" to "postgres";
grant TRIGGER on table public."integration_webhooks" to "postgres";
grant TRUNCATE on table public."integration_webhooks" to "postgres";
grant UPDATE on table public."integration_webhooks" to "postgres";
grant DELETE on table public."integration_webhooks" to "anon";
grant INSERT on table public."integration_webhooks" to "anon";
grant MAINTAIN on table public."integration_webhooks" to "anon";
grant REFERENCES on table public."integration_webhooks" to "anon";
grant SELECT on table public."integration_webhooks" to "anon";
grant TRIGGER on table public."integration_webhooks" to "anon";
grant TRUNCATE on table public."integration_webhooks" to "anon";
grant UPDATE on table public."integration_webhooks" to "anon";
grant DELETE on table public."integration_webhooks" to "authenticated";
grant INSERT on table public."integration_webhooks" to "authenticated";
grant MAINTAIN on table public."integration_webhooks" to "authenticated";
grant REFERENCES on table public."integration_webhooks" to "authenticated";
grant SELECT on table public."integration_webhooks" to "authenticated";
grant TRIGGER on table public."integration_webhooks" to "authenticated";
grant TRUNCATE on table public."integration_webhooks" to "authenticated";
grant UPDATE on table public."integration_webhooks" to "authenticated";
grant DELETE on table public."integration_webhooks" to "service_role";
grant INSERT on table public."integration_webhooks" to "service_role";
grant MAINTAIN on table public."integration_webhooks" to "service_role";
grant REFERENCES on table public."integration_webhooks" to "service_role";
grant SELECT on table public."integration_webhooks" to "service_role";
grant TRIGGER on table public."integration_webhooks" to "service_role";
grant TRUNCATE on table public."integration_webhooks" to "service_role";
grant UPDATE on table public."integration_webhooks" to "service_role";
CREATE INDEX plan_integration_entitlements_plan_idx ON public.plan_integration_entitlements USING btree (plan_key, is_enabled);
revoke all on table public."plan_integration_entitlements" from public, anon, authenticated, service_role;
grant DELETE on table public."plan_integration_entitlements" to "postgres";
grant INSERT on table public."plan_integration_entitlements" to "postgres";
grant MAINTAIN on table public."plan_integration_entitlements" to "postgres";
grant REFERENCES on table public."plan_integration_entitlements" to "postgres";
grant SELECT on table public."plan_integration_entitlements" to "postgres";
grant TRIGGER on table public."plan_integration_entitlements" to "postgres";
grant TRUNCATE on table public."plan_integration_entitlements" to "postgres";
grant UPDATE on table public."plan_integration_entitlements" to "postgres";
grant DELETE on table public."plan_integration_entitlements" to "anon";
grant INSERT on table public."plan_integration_entitlements" to "anon";
grant MAINTAIN on table public."plan_integration_entitlements" to "anon";
grant REFERENCES on table public."plan_integration_entitlements" to "anon";
grant SELECT on table public."plan_integration_entitlements" to "anon";
grant TRIGGER on table public."plan_integration_entitlements" to "anon";
grant TRUNCATE on table public."plan_integration_entitlements" to "anon";
grant UPDATE on table public."plan_integration_entitlements" to "anon";
grant DELETE on table public."plan_integration_entitlements" to "authenticated";
grant INSERT on table public."plan_integration_entitlements" to "authenticated";
grant MAINTAIN on table public."plan_integration_entitlements" to "authenticated";
grant REFERENCES on table public."plan_integration_entitlements" to "authenticated";
grant SELECT on table public."plan_integration_entitlements" to "authenticated";
grant TRIGGER on table public."plan_integration_entitlements" to "authenticated";
grant TRUNCATE on table public."plan_integration_entitlements" to "authenticated";
grant UPDATE on table public."plan_integration_entitlements" to "authenticated";
grant DELETE on table public."plan_integration_entitlements" to "service_role";
grant INSERT on table public."plan_integration_entitlements" to "service_role";
grant MAINTAIN on table public."plan_integration_entitlements" to "service_role";
grant REFERENCES on table public."plan_integration_entitlements" to "service_role";
grant SELECT on table public."plan_integration_entitlements" to "service_role";
grant TRIGGER on table public."plan_integration_entitlements" to "service_role";
grant TRUNCATE on table public."plan_integration_entitlements" to "service_role";
grant UPDATE on table public."plan_integration_entitlements" to "service_role";
CREATE INDEX project_integration_audit_conn_idx ON public.project_integration_audit USING btree (integration_connection_id);
CREATE INDEX project_integration_audit_project_idx ON public.project_integration_audit USING btree (project_id, created_at DESC);
revoke all on table public."project_integration_audit" from public, anon, authenticated, service_role;
grant DELETE on table public."project_integration_audit" to "postgres";
grant INSERT on table public."project_integration_audit" to "postgres";
grant MAINTAIN on table public."project_integration_audit" to "postgres";
grant REFERENCES on table public."project_integration_audit" to "postgres";
grant SELECT on table public."project_integration_audit" to "postgres";
grant TRIGGER on table public."project_integration_audit" to "postgres";
grant TRUNCATE on table public."project_integration_audit" to "postgres";
grant UPDATE on table public."project_integration_audit" to "postgres";
grant DELETE on table public."project_integration_audit" to "anon";
grant INSERT on table public."project_integration_audit" to "anon";
grant MAINTAIN on table public."project_integration_audit" to "anon";
grant REFERENCES on table public."project_integration_audit" to "anon";
grant SELECT on table public."project_integration_audit" to "anon";
grant TRIGGER on table public."project_integration_audit" to "anon";
grant TRUNCATE on table public."project_integration_audit" to "anon";
grant UPDATE on table public."project_integration_audit" to "anon";
grant DELETE on table public."project_integration_audit" to "authenticated";
grant INSERT on table public."project_integration_audit" to "authenticated";
grant MAINTAIN on table public."project_integration_audit" to "authenticated";
grant REFERENCES on table public."project_integration_audit" to "authenticated";
grant SELECT on table public."project_integration_audit" to "authenticated";
grant TRIGGER on table public."project_integration_audit" to "authenticated";
grant TRUNCATE on table public."project_integration_audit" to "authenticated";
grant UPDATE on table public."project_integration_audit" to "authenticated";
grant DELETE on table public."project_integration_audit" to "service_role";
grant INSERT on table public."project_integration_audit" to "service_role";
grant MAINTAIN on table public."project_integration_audit" to "service_role";
grant REFERENCES on table public."project_integration_audit" to "service_role";
grant SELECT on table public."project_integration_audit" to "service_role";
grant TRIGGER on table public."project_integration_audit" to "service_role";
grant TRUNCATE on table public."project_integration_audit" to "service_role";
grant UPDATE on table public."project_integration_audit" to "service_role";
alter table public."project_integration_permissions" add constraint "project_integration_permissions_integration_connection_id_fkey" FOREIGN KEY (integration_connection_id) REFERENCES integration_connections(id) ON DELETE CASCADE;
alter table public."project_integration_permissions" add constraint "project_integration_permissions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX project_integration_permissions_conn_idx ON public.project_integration_permissions USING btree (integration_connection_id);
CREATE INDEX project_integration_permissions_project_idx ON public.project_integration_permissions USING btree (project_id);
revoke all on table public."project_integration_permissions" from public, anon, authenticated, service_role;
grant DELETE on table public."project_integration_permissions" to "postgres";
grant INSERT on table public."project_integration_permissions" to "postgres";
grant MAINTAIN on table public."project_integration_permissions" to "postgres";
grant REFERENCES on table public."project_integration_permissions" to "postgres";
grant SELECT on table public."project_integration_permissions" to "postgres";
grant TRIGGER on table public."project_integration_permissions" to "postgres";
grant TRUNCATE on table public."project_integration_permissions" to "postgres";
grant UPDATE on table public."project_integration_permissions" to "postgres";
grant DELETE on table public."project_integration_permissions" to "anon";
grant INSERT on table public."project_integration_permissions" to "anon";
grant MAINTAIN on table public."project_integration_permissions" to "anon";
grant REFERENCES on table public."project_integration_permissions" to "anon";
grant SELECT on table public."project_integration_permissions" to "anon";
grant TRIGGER on table public."project_integration_permissions" to "anon";
grant TRUNCATE on table public."project_integration_permissions" to "anon";
grant UPDATE on table public."project_integration_permissions" to "anon";
grant DELETE on table public."project_integration_permissions" to "authenticated";
grant INSERT on table public."project_integration_permissions" to "authenticated";
grant MAINTAIN on table public."project_integration_permissions" to "authenticated";
grant REFERENCES on table public."project_integration_permissions" to "authenticated";
grant SELECT on table public."project_integration_permissions" to "authenticated";
grant TRIGGER on table public."project_integration_permissions" to "authenticated";
grant TRUNCATE on table public."project_integration_permissions" to "authenticated";
grant UPDATE on table public."project_integration_permissions" to "authenticated";
grant DELETE on table public."project_integration_permissions" to "service_role";
grant INSERT on table public."project_integration_permissions" to "service_role";
grant MAINTAIN on table public."project_integration_permissions" to "service_role";
grant REFERENCES on table public."project_integration_permissions" to "service_role";
grant SELECT on table public."project_integration_permissions" to "service_role";
grant TRIGGER on table public."project_integration_permissions" to "service_role";
grant TRUNCATE on table public."project_integration_permissions" to "service_role";
grant UPDATE on table public."project_integration_permissions" to "service_role";
alter table public."project_integration_state" add constraint "project_integration_state_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
revoke all on table public."project_integration_state" from public, anon, authenticated, service_role;
grant DELETE on table public."project_integration_state" to "postgres";
grant INSERT on table public."project_integration_state" to "postgres";
grant MAINTAIN on table public."project_integration_state" to "postgres";
grant REFERENCES on table public."project_integration_state" to "postgres";
grant SELECT on table public."project_integration_state" to "postgres";
grant TRIGGER on table public."project_integration_state" to "postgres";
grant TRUNCATE on table public."project_integration_state" to "postgres";
grant UPDATE on table public."project_integration_state" to "postgres";
grant DELETE on table public."project_integration_state" to "anon";
grant INSERT on table public."project_integration_state" to "anon";
grant MAINTAIN on table public."project_integration_state" to "anon";
grant REFERENCES on table public."project_integration_state" to "anon";
grant SELECT on table public."project_integration_state" to "anon";
grant TRIGGER on table public."project_integration_state" to "anon";
grant TRUNCATE on table public."project_integration_state" to "anon";
grant UPDATE on table public."project_integration_state" to "anon";
grant DELETE on table public."project_integration_state" to "authenticated";
grant INSERT on table public."project_integration_state" to "authenticated";
grant MAINTAIN on table public."project_integration_state" to "authenticated";
grant REFERENCES on table public."project_integration_state" to "authenticated";
grant SELECT on table public."project_integration_state" to "authenticated";
grant TRIGGER on table public."project_integration_state" to "authenticated";
grant TRUNCATE on table public."project_integration_state" to "authenticated";
grant UPDATE on table public."project_integration_state" to "authenticated";
grant DELETE on table public."project_integration_state" to "service_role";
grant INSERT on table public."project_integration_state" to "service_role";
grant MAINTAIN on table public."project_integration_state" to "service_role";
grant REFERENCES on table public."project_integration_state" to "service_role";
grant SELECT on table public."project_integration_state" to "service_role";
grant TRIGGER on table public."project_integration_state" to "service_role";
grant TRUNCATE on table public."project_integration_state" to "service_role";
grant UPDATE on table public."project_integration_state" to "service_role";
alter table public."project_template_applications" add constraint "project_template_applications_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
alter table public."project_template_applications" add constraint "project_template_applications_template_id_fkey" FOREIGN KEY (template_id) REFERENCES integration_templates(id) ON DELETE CASCADE;
CREATE INDEX project_template_applications_project_idx ON public.project_template_applications USING btree (project_id);
CREATE INDEX project_template_applications_template_idx ON public.project_template_applications USING btree (template_id);
revoke all on table public."project_template_applications" from public, anon, authenticated, service_role;
grant DELETE on table public."project_template_applications" to "postgres";
grant INSERT on table public."project_template_applications" to "postgres";
grant MAINTAIN on table public."project_template_applications" to "postgres";
grant REFERENCES on table public."project_template_applications" to "postgres";
grant SELECT on table public."project_template_applications" to "postgres";
grant TRIGGER on table public."project_template_applications" to "postgres";
grant TRUNCATE on table public."project_template_applications" to "postgres";
grant UPDATE on table public."project_template_applications" to "postgres";
grant DELETE on table public."project_template_applications" to "anon";
grant INSERT on table public."project_template_applications" to "anon";
grant MAINTAIN on table public."project_template_applications" to "anon";
grant REFERENCES on table public."project_template_applications" to "anon";
grant SELECT on table public."project_template_applications" to "anon";
grant TRIGGER on table public."project_template_applications" to "anon";
grant TRUNCATE on table public."project_template_applications" to "anon";
grant UPDATE on table public."project_template_applications" to "anon";
grant DELETE on table public."project_template_applications" to "authenticated";
grant INSERT on table public."project_template_applications" to "authenticated";
grant MAINTAIN on table public."project_template_applications" to "authenticated";
grant REFERENCES on table public."project_template_applications" to "authenticated";
grant SELECT on table public."project_template_applications" to "authenticated";
grant TRIGGER on table public."project_template_applications" to "authenticated";
grant TRUNCATE on table public."project_template_applications" to "authenticated";
grant UPDATE on table public."project_template_applications" to "authenticated";
grant DELETE on table public."project_template_applications" to "service_role";
grant INSERT on table public."project_template_applications" to "service_role";
grant MAINTAIN on table public."project_template_applications" to "service_role";
grant REFERENCES on table public."project_template_applications" to "service_role";
grant SELECT on table public."project_template_applications" to "service_role";
grant TRIGGER on table public."project_template_applications" to "service_role";
grant TRUNCATE on table public."project_template_applications" to "service_role";
grant UPDATE on table public."project_template_applications" to "service_role";
CREATE INDEX provider_model_pricing_provider_idx ON public.provider_model_pricing USING btree (provider, is_active);
revoke all on table public."provider_model_pricing" from public, anon, authenticated, service_role;
grant DELETE on table public."provider_model_pricing" to "postgres";
grant INSERT on table public."provider_model_pricing" to "postgres";
grant MAINTAIN on table public."provider_model_pricing" to "postgres";
grant REFERENCES on table public."provider_model_pricing" to "postgres";
grant SELECT on table public."provider_model_pricing" to "postgres";
grant TRIGGER on table public."provider_model_pricing" to "postgres";
grant TRUNCATE on table public."provider_model_pricing" to "postgres";
grant UPDATE on table public."provider_model_pricing" to "postgres";
grant DELETE on table public."provider_model_pricing" to "anon";
grant INSERT on table public."provider_model_pricing" to "anon";
grant MAINTAIN on table public."provider_model_pricing" to "anon";
grant REFERENCES on table public."provider_model_pricing" to "anon";
grant SELECT on table public."provider_model_pricing" to "anon";
grant TRIGGER on table public."provider_model_pricing" to "anon";
grant TRUNCATE on table public."provider_model_pricing" to "anon";
grant UPDATE on table public."provider_model_pricing" to "anon";
grant DELETE on table public."provider_model_pricing" to "authenticated";
grant INSERT on table public."provider_model_pricing" to "authenticated";
grant MAINTAIN on table public."provider_model_pricing" to "authenticated";
grant REFERENCES on table public."provider_model_pricing" to "authenticated";
grant SELECT on table public."provider_model_pricing" to "authenticated";
grant TRIGGER on table public."provider_model_pricing" to "authenticated";
grant TRUNCATE on table public."provider_model_pricing" to "authenticated";
grant UPDATE on table public."provider_model_pricing" to "authenticated";
grant DELETE on table public."provider_model_pricing" to "service_role";
grant INSERT on table public."provider_model_pricing" to "service_role";
grant MAINTAIN on table public."provider_model_pricing" to "service_role";
grant REFERENCES on table public."provider_model_pricing" to "service_role";
grant SELECT on table public."provider_model_pricing" to "service_role";
grant TRIGGER on table public."provider_model_pricing" to "service_role";
grant TRUNCATE on table public."provider_model_pricing" to "service_role";
grant UPDATE on table public."provider_model_pricing" to "service_role";
CREATE INDEX routing_models_provider_idx ON public.routing_models USING btree (provider_id, is_enabled);
revoke all on table public."routing_models" from public, anon, authenticated, service_role;
grant DELETE on table public."routing_models" to "postgres";
grant INSERT on table public."routing_models" to "postgres";
grant MAINTAIN on table public."routing_models" to "postgres";
grant REFERENCES on table public."routing_models" to "postgres";
grant SELECT on table public."routing_models" to "postgres";
grant TRIGGER on table public."routing_models" to "postgres";
grant TRUNCATE on table public."routing_models" to "postgres";
grant UPDATE on table public."routing_models" to "postgres";
grant DELETE on table public."routing_models" to "anon";
grant INSERT on table public."routing_models" to "anon";
grant MAINTAIN on table public."routing_models" to "anon";
grant REFERENCES on table public."routing_models" to "anon";
grant SELECT on table public."routing_models" to "anon";
grant TRIGGER on table public."routing_models" to "anon";
grant TRUNCATE on table public."routing_models" to "anon";
grant UPDATE on table public."routing_models" to "anon";
grant DELETE on table public."routing_models" to "authenticated";
grant INSERT on table public."routing_models" to "authenticated";
grant MAINTAIN on table public."routing_models" to "authenticated";
grant REFERENCES on table public."routing_models" to "authenticated";
grant SELECT on table public."routing_models" to "authenticated";
grant TRIGGER on table public."routing_models" to "authenticated";
grant TRUNCATE on table public."routing_models" to "authenticated";
grant UPDATE on table public."routing_models" to "authenticated";
grant DELETE on table public."routing_models" to "service_role";
grant INSERT on table public."routing_models" to "service_role";
grant MAINTAIN on table public."routing_models" to "service_role";
grant REFERENCES on table public."routing_models" to "service_role";
grant SELECT on table public."routing_models" to "service_role";
grant TRIGGER on table public."routing_models" to "service_role";
grant TRUNCATE on table public."routing_models" to "service_role";
grant UPDATE on table public."routing_models" to "service_role";
CREATE INDEX workspace_entitlement_overrides_ws_idx ON public.workspace_entitlement_overrides USING btree (workspace_id, feature_key, status);
revoke all on table public."workspace_entitlement_overrides" from public, anon, authenticated, service_role;
grant DELETE on table public."workspace_entitlement_overrides" to "postgres";
grant INSERT on table public."workspace_entitlement_overrides" to "postgres";
grant MAINTAIN on table public."workspace_entitlement_overrides" to "postgres";
grant REFERENCES on table public."workspace_entitlement_overrides" to "postgres";
grant SELECT on table public."workspace_entitlement_overrides" to "postgres";
grant TRIGGER on table public."workspace_entitlement_overrides" to "postgres";
grant TRUNCATE on table public."workspace_entitlement_overrides" to "postgres";
grant UPDATE on table public."workspace_entitlement_overrides" to "postgres";
grant DELETE on table public."workspace_entitlement_overrides" to "anon";
grant INSERT on table public."workspace_entitlement_overrides" to "anon";
grant MAINTAIN on table public."workspace_entitlement_overrides" to "anon";
grant REFERENCES on table public."workspace_entitlement_overrides" to "anon";
grant SELECT on table public."workspace_entitlement_overrides" to "anon";
grant TRIGGER on table public."workspace_entitlement_overrides" to "anon";
grant TRUNCATE on table public."workspace_entitlement_overrides" to "anon";
grant UPDATE on table public."workspace_entitlement_overrides" to "anon";
grant DELETE on table public."workspace_entitlement_overrides" to "authenticated";
grant INSERT on table public."workspace_entitlement_overrides" to "authenticated";
grant MAINTAIN on table public."workspace_entitlement_overrides" to "authenticated";
grant REFERENCES on table public."workspace_entitlement_overrides" to "authenticated";
grant SELECT on table public."workspace_entitlement_overrides" to "authenticated";
grant TRIGGER on table public."workspace_entitlement_overrides" to "authenticated";
grant TRUNCATE on table public."workspace_entitlement_overrides" to "authenticated";
grant UPDATE on table public."workspace_entitlement_overrides" to "authenticated";
grant DELETE on table public."workspace_entitlement_overrides" to "service_role";
grant INSERT on table public."workspace_entitlement_overrides" to "service_role";
grant MAINTAIN on table public."workspace_entitlement_overrides" to "service_role";
grant REFERENCES on table public."workspace_entitlement_overrides" to "service_role";
grant SELECT on table public."workspace_entitlement_overrides" to "service_role";
grant TRIGGER on table public."workspace_entitlement_overrides" to "service_role";
grant TRUNCATE on table public."workspace_entitlement_overrides" to "service_role";
grant UPDATE on table public."workspace_entitlement_overrides" to "service_role";
alter table public."workspace_members" add constraint "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX workspace_members_user_idx ON public.workspace_members USING btree (user_id);
CREATE INDEX workspace_members_workspace_idx ON public.workspace_members USING btree (workspace_id);
revoke all on table public."workspace_members" from public, anon, authenticated, service_role;
grant DELETE on table public."workspace_members" to "postgres";
grant INSERT on table public."workspace_members" to "postgres";
grant MAINTAIN on table public."workspace_members" to "postgres";
grant REFERENCES on table public."workspace_members" to "postgres";
grant SELECT on table public."workspace_members" to "postgres";
grant TRIGGER on table public."workspace_members" to "postgres";
grant TRUNCATE on table public."workspace_members" to "postgres";
grant UPDATE on table public."workspace_members" to "postgres";
grant DELETE on table public."workspace_members" to "anon";
grant INSERT on table public."workspace_members" to "anon";
grant MAINTAIN on table public."workspace_members" to "anon";
grant REFERENCES on table public."workspace_members" to "anon";
grant SELECT on table public."workspace_members" to "anon";
grant TRIGGER on table public."workspace_members" to "anon";
grant TRUNCATE on table public."workspace_members" to "anon";
grant UPDATE on table public."workspace_members" to "anon";
grant DELETE on table public."workspace_members" to "authenticated";
grant INSERT on table public."workspace_members" to "authenticated";
grant MAINTAIN on table public."workspace_members" to "authenticated";
grant REFERENCES on table public."workspace_members" to "authenticated";
grant SELECT on table public."workspace_members" to "authenticated";
grant TRIGGER on table public."workspace_members" to "authenticated";
grant TRUNCATE on table public."workspace_members" to "authenticated";
grant UPDATE on table public."workspace_members" to "authenticated";
grant DELETE on table public."workspace_members" to "service_role";
grant INSERT on table public."workspace_members" to "service_role";
grant MAINTAIN on table public."workspace_members" to "service_role";
grant REFERENCES on table public."workspace_members" to "service_role";
grant SELECT on table public."workspace_members" to "service_role";
grant TRIGGER on table public."workspace_members" to "service_role";
grant TRUNCATE on table public."workspace_members" to "service_role";
grant UPDATE on table public."workspace_members" to "service_role";
CREATE INDEX workspace_usage_audit_ws_idx ON public.workspace_usage_audit USING btree (workspace_id, created_at DESC);
revoke all on table public."workspace_usage_audit" from public, anon, authenticated, service_role;
grant DELETE on table public."workspace_usage_audit" to "postgres";
grant INSERT on table public."workspace_usage_audit" to "postgres";
grant MAINTAIN on table public."workspace_usage_audit" to "postgres";
grant REFERENCES on table public."workspace_usage_audit" to "postgres";
grant SELECT on table public."workspace_usage_audit" to "postgres";
grant TRIGGER on table public."workspace_usage_audit" to "postgres";
grant TRUNCATE on table public."workspace_usage_audit" to "postgres";
grant UPDATE on table public."workspace_usage_audit" to "postgres";
grant DELETE on table public."workspace_usage_audit" to "anon";
grant INSERT on table public."workspace_usage_audit" to "anon";
grant MAINTAIN on table public."workspace_usage_audit" to "anon";
grant REFERENCES on table public."workspace_usage_audit" to "anon";
grant SELECT on table public."workspace_usage_audit" to "anon";
grant TRIGGER on table public."workspace_usage_audit" to "anon";
grant TRUNCATE on table public."workspace_usage_audit" to "anon";
grant UPDATE on table public."workspace_usage_audit" to "anon";
grant DELETE on table public."workspace_usage_audit" to "authenticated";
grant INSERT on table public."workspace_usage_audit" to "authenticated";
grant MAINTAIN on table public."workspace_usage_audit" to "authenticated";
grant REFERENCES on table public."workspace_usage_audit" to "authenticated";
grant SELECT on table public."workspace_usage_audit" to "authenticated";
grant TRIGGER on table public."workspace_usage_audit" to "authenticated";
grant TRUNCATE on table public."workspace_usage_audit" to "authenticated";
grant UPDATE on table public."workspace_usage_audit" to "authenticated";
grant DELETE on table public."workspace_usage_audit" to "service_role";
grant INSERT on table public."workspace_usage_audit" to "service_role";
grant MAINTAIN on table public."workspace_usage_audit" to "service_role";
grant REFERENCES on table public."workspace_usage_audit" to "service_role";
grant SELECT on table public."workspace_usage_audit" to "service_role";
grant TRIGGER on table public."workspace_usage_audit" to "service_role";
grant TRUNCATE on table public."workspace_usage_audit" to "service_role";
grant UPDATE on table public."workspace_usage_audit" to "service_role";
CREATE INDEX workspace_usage_events_workspace_created_idx ON public.workspace_usage_events USING btree (workspace_id, created_at DESC);
CREATE INDEX workspace_usage_events_workspace_feature_idx ON public.workspace_usage_events USING btree (workspace_id, feature_key, created_at DESC);
revoke all on table public."workspace_usage_events" from public, anon, authenticated, service_role;
grant DELETE on table public."workspace_usage_events" to "postgres";
grant INSERT on table public."workspace_usage_events" to "postgres";
grant MAINTAIN on table public."workspace_usage_events" to "postgres";
grant REFERENCES on table public."workspace_usage_events" to "postgres";
grant SELECT on table public."workspace_usage_events" to "postgres";
grant TRIGGER on table public."workspace_usage_events" to "postgres";
grant TRUNCATE on table public."workspace_usage_events" to "postgres";
grant UPDATE on table public."workspace_usage_events" to "postgres";
grant DELETE on table public."workspace_usage_events" to "anon";
grant INSERT on table public."workspace_usage_events" to "anon";
grant MAINTAIN on table public."workspace_usage_events" to "anon";
grant REFERENCES on table public."workspace_usage_events" to "anon";
grant SELECT on table public."workspace_usage_events" to "anon";
grant TRIGGER on table public."workspace_usage_events" to "anon";
grant TRUNCATE on table public."workspace_usage_events" to "anon";
grant UPDATE on table public."workspace_usage_events" to "anon";
grant DELETE on table public."workspace_usage_events" to "authenticated";
grant INSERT on table public."workspace_usage_events" to "authenticated";
grant MAINTAIN on table public."workspace_usage_events" to "authenticated";
grant REFERENCES on table public."workspace_usage_events" to "authenticated";
grant SELECT on table public."workspace_usage_events" to "authenticated";
grant TRIGGER on table public."workspace_usage_events" to "authenticated";
grant TRUNCATE on table public."workspace_usage_events" to "authenticated";
grant UPDATE on table public."workspace_usage_events" to "authenticated";
grant DELETE on table public."workspace_usage_events" to "service_role";
grant INSERT on table public."workspace_usage_events" to "service_role";
grant MAINTAIN on table public."workspace_usage_events" to "service_role";
grant REFERENCES on table public."workspace_usage_events" to "service_role";
grant SELECT on table public."workspace_usage_events" to "service_role";
grant TRIGGER on table public."workspace_usage_events" to "service_role";
grant TRUNCATE on table public."workspace_usage_events" to "service_role";
grant UPDATE on table public."workspace_usage_events" to "service_role";
commit;
