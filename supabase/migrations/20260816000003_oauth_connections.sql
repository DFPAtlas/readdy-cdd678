-- Forge — OAuth connection support (Prompt 3)
-- Reuses integration_connections + Supabase Vault from Prompt 2. Adds a
-- short-lived, single-use state table for server-side OAuth state validation,
-- and account-metadata columns on integration_connections. No raw OAuth
-- tokens are stored in any of these columns; tokens live only in Vault.

-- ─────────────────────────────────────────────────────────────
-- OAuth flow state (single-use, expiring, service-role only)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.oauth_flow_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  user_id uuid not null,
  provider text not null,
  connection_name text,
  connection_id uuid,
  environment text not null default 'production',
  return_to text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists oauth_flow_states_state_idx on public.oauth_flow_states (state);
create index if not exists oauth_flow_states_expires_idx on public.oauth_flow_states (expires_at);

alter table public.oauth_flow_states enable row level security;

-- No RLS policies are added on purpose: like integration_connections, this
-- table is denied to anon/authenticated and accessed only by the Edge
-- Function using the service role.

-- ─────────────────────────────────────────────────────────────
-- OAuth account metadata on integration_connections
-- ─────────────────────────────────────────────────────────────
alter table public.integration_connections
  add column if not exists account_name text,
  add column if not exists account_email text,
  add column if not exists account_avatar_url text,
  add column if not exists provider_account_id text,
  add column if not exists scopes text[],
  add column if not exists oauth_expires_at timestamptz,
  add column if not exists connected_at timestamptz;

create index if not exists integration_connections_provider_account_idx
  on public.integration_connections (provider_id, provider_account_id);