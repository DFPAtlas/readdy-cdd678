-- Forge — Platform integration connections (metadata only, no raw secrets)
-- Secrets are stored in Supabase Vault; this table holds only a reference.

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  connection_name text not null,
  provider_category text not null default 'ai',
  auth_type text not null default 'api_key',
  environment text not null default 'production',
  base_url text,
  secret_reference text,
  secret_suffix text,
  status text not null default 'disconnected',
  last_tested_at timestamptz,
  last_test_status text,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_connections_provider_idx on public.integration_connections (provider_id);
create index if not exists integration_connections_status_idx on public.integration_connections (status);

alter table public.integration_connections enable row level security;

-- No RLS policies are added on purpose: anon / authenticated roles are denied
-- access to this table entirely. The forge-integrations Edge Function uses the
-- service role (which bypasses RLS) and enforces platform-admin authorization
-- before reading or writing any rows.

-- ─────────────────────────────────────────────────────────────
-- Vault wrapper functions (SECURITY DEFINER, service_role only)
-- These let the Edge Function store/read/update/delete Vault
-- secrets through the public RPC surface without exposing the
-- Vault schema to PostgREST or to anon/authenticated roles.
-- ─────────────────────────────────────────────────────────────

create or replace function public.forge_integration_store_secret(
  p_secret text,
  p_name text,
  p_description text
) returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_id uuid;
begin
  v_id := vault.create_secret(p_secret, p_name, p_description, null);
  return v_id::text;
end;
$$;

create or replace function public.forge_integration_read_secret(p_secret_id text)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_secret_id::uuid;
  return v_secret;
end;
$$;

create or replace function public.forge_integration_update_secret(
  p_secret_id text,
  p_secret text,
  p_name text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform vault.update_secret(p_secret_id::uuid, p_secret, p_name, p_description, null);
end;
$$;

create or replace function public.forge_integration_delete_secret(p_secret_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  delete from vault.secrets where id = p_secret_id::uuid;
end;
$$;

-- Lock every wrapper to the service role only. Never exposed to anon/auth.
revoke all on function public.forge_integration_store_secret(text, text, text) from public;
revoke all on function public.forge_integration_read_secret(text) from public;
revoke all on function public.forge_integration_update_secret(text, text, text, text) from public;
revoke all on function public.forge_integration_delete_secret(text) from public;

grant execute on function public.forge_integration_store_secret(text, text, text) to service_role;
grant execute on function public.forge_integration_read_secret(text) to service_role;
grant execute on function public.forge_integration_update_secret(text, text, text, text) to service_role;
grant execute on function public.forge_integration_delete_secret(text) to service_role;