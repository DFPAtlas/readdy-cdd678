-- Forge — Agent to integration access control (Prompt 4)
-- Adds a reusable Forge agent directory and a per-connection permission
-- table so administrators control exactly which agents/services may use each
-- integration. Default policy is DENY: a connection grants no agent access
-- until an administrator explicitly assigns it.
--
-- No secrets live in these tables; they reference integration_connections
-- (which itself holds only a Vault secret reference) and an agent directory.

-- ─────────────────────────────────────────────────────────────
-- Forge agent directory (reusable source of truth for agents)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.forge_agents (
  id text primary key,
  name text not null,
  agent_type text not null default 'builder',
  description text,
  status text not null default 'active',
  sensitivity_level text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Per-connection agent permissions (default: no access)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.integration_agent_permissions (
  id uuid primary key default gen_random_uuid(),
  integration_connection_id uuid not null references public.integration_connections(id) on delete cascade,
  agent_id text not null references public.forge_agents(id) on delete cascade,
  access_level text not null default 'none',
  is_enabled boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_agent_permissions_unique unique (integration_connection_id, agent_id)
);

create index if not exists integration_agent_permissions_conn_idx
  on public.integration_agent_permissions (integration_connection_id);
create index if not exists integration_agent_permissions_agent_idx
  on public.integration_agent_permissions (agent_id);

alter table public.forge_agents enable row level security;
alter table public.integration_agent_permissions enable row level security;

-- No RLS policies on purpose: both tables are denied to anon/authenticated
-- and accessed only by the forge-integrations Edge Function using the service
-- role, which enforces platform-admin authorization before reading/writing.

-- ─────────────────────────────────────────────────────────────
-- Seed the Forge agent directory
-- ─────────────────────────────────────────────────────────────
insert into public.forge_agents (id, name, agent_type, description, status, sensitivity_level) values
  ('master-forge', 'Master Forge Agent', 'orchestrator', 'Coordinates specialist agents, plans work and delegates tasks.', 'active', 'standard'),
  ('code', 'Code Agent', 'builder', 'Writes, edits and reviews code across projects and integrations.', 'active', 'standard'),
  ('ui', 'UI Agent', 'builder', 'Generates and refines UI components, layouts and styling.', 'active', 'standard'),
  ('debug', 'Debug Agent', 'builder', 'Diagnoses build errors, runtime failures and integration issues.', 'active', 'standard'),
  ('research', 'Research Agent', 'builder', 'Performs web research, retrieval and summarisation.', 'active', 'standard'),
  ('deployment', 'Deployment Agent', 'ops', 'Publishes, rolls back and manages deployments across environments.', 'active', 'high'),
  ('billing', 'Billing Agent', 'ops', 'Manages subscriptions, invoices and payment operations.', 'active', 'high'),
  ('support', 'Support Agent', 'support', 'Assists with customer support queries and account issues.', 'active', 'standard'),
  ('security', 'Security Agent', 'ops', 'Monitors and remediates security issues and access anomalies.', 'active', 'high')
on conflict (id) do nothing;