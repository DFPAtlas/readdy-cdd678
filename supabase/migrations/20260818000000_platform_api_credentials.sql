-- ============================================================================
-- FORGE — PLATFORM API CREDENTIAL VAULT (Prompt 1)
-- ============================================================================
-- Changes Forge from customer-managed AI provider keys (BYOK) to centrally
-- managed platform API credentials controlled by the Forge owner.
--
-- Customers no longer supply OpenAI / Anthropic / Google / other keys. Forge
-- uses platform credentials stored here and read only through protected
-- server-side Edge Functions using the service-role client.
--
-- SECURITY CONTRACT
--   * `encrypted_secret` is AES-256-GCM ciphertext (versioned payload) using the
--     server-only `FORGE_VAULT_KEY` Edge Function secret.
--   * `encrypted_secret` is NEVER exposed through a browser query or API
--     response. Only safe metadata and a masked `key_suffix` are returned.
--   * RLS is enabled but NO client-readable policy is created. The table is
--     intentionally inaccessible to `authenticated` / `anon` roles; every
--     access path goes through service-role Edge Functions that re-check
--     `secrets.manage` / `super_admin` authority.
--
-- This migration is FORWARD-ONLY and IDEMPOTENT (IF NOT EXISTS / DO block).
-- It does NOT edit the baseline migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE — platform_api_credentials
-- ---------------------------------------------------------------------------
create table if not exists public.platform_api_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  credential_type text not null default 'api_key',
  encrypted_secret text not null,
  key_suffix text not null,
  environment text not null default 'production',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_tested_at timestamptz,
  last_test_status text,
  last_test_message text,
  last_used_at timestamptz,
  rotated_at timestamptz,
  constraint platform_api_credentials_provider_env_type_key
    unique (provider_key, environment, credential_type),
  constraint platform_api_credentials_environment_check
    check (environment in ('test', 'production')),
  constraint platform_api_credentials_status_check
    check (status in ('active', 'disabled', 'invalid'))
);

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
create index if not exists idx_platform_api_credentials_provider
  on public.platform_api_credentials (provider_key, environment);
create index if not exists idx_platform_api_credentials_status
  on public.platform_api_credentials (status);

-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    Enabled, but intentionally NO client-readable policy. Access is only via
--    service-role Edge Functions. Do NOT add a SELECT policy here — doing so
--    would expose `encrypted_secret` (or its metadata) to the browser.
-- ---------------------------------------------------------------------------
alter table public.platform_api_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- 4. `secrets.manage` PERMISSION NOTE
--    `secrets.manage` is a permission string understood by the existing
--    `has_platform_permission` SQL helper (which already matches arbitrary
--    stored permission strings via `coalesce(pa.permissions, '[]') ? p_permission`)
--    and by the forge-admin / forge-credentials Edge Functions.
--
--    * `super_admin` always holds it (wildcard `*`).
--    * No other role is auto-granted `secrets.manage`. It must be added
--      explicitly to an administrator's `permissions` jsonb array.
--
--    No default grant is issued here, so ordinary administrators never receive
--    credential-management authority automatically.
-- ============================================================================