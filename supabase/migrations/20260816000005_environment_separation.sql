-- Forge — Development / Staging / Production integration separation (Prompt 5)
-- Adds a database-level environment constraint so a connection can never hold
-- an unexpected environment value, and gives each agent an explicit list of
-- environments it is allowed to use. Production access is never inherited:
-- an agent must have 'production' in allowed_environments to touch any
-- production connection, enforced at runtime by the edge function.

-- ─────────────────────────────────────────────────────────────
-- 1. Environment constraint on integration_connections
-- ─────────────────────────────────────────────────────────────
-- Add a CHECK constraint so environment is always one of the recognised
-- values. Existing rows already use development/staging/production which are
-- all valid, so the constraint can be applied directly.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'integration_connections_environment_check'
      and conrelid = 'public.integration_connections'::regclass
  ) then
    alter table public.integration_connections
      add constraint integration_connections_environment_check
      check (environment in ('development', 'staging', 'production', 'sandbox'));
  end if;
end $$;

create index if not exists integration_connections_environment_idx
  on public.integration_connections (environment);

-- ─────────────────────────────────────────────────────────────
-- 2. Agent allowed environments
-- ─────────────────────────────────────────────────────────────
-- Default is development + staging only: production (and sandbox) access is
-- never automatic. Administrators opt specific agents in per environment.
alter table public.forge_agents
  add column if not exists allowed_environments text[] not null default '{development,staging}';

-- Update the seeded agents to their intended environment allowances.
-- UI and Research agents intentionally have NO production access.
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'master-forge';
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'code';
update public.forge_agents set allowed_environments = '{development,staging}' where id = 'ui';
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'debug';
update public.forge_agents set allowed_environments = '{development,staging}' where id = 'research';
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'deployment';
update public.forge_agents set allowed_environments = '{development,staging,production,sandbox}' where id = 'billing';
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'support';
update public.forge_agents set allowed_environments = '{development,staging,production}' where id = 'security';