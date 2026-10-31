-- Let a signed-in user create (and therefore upsert) only their own profile row.
-- Without this, INSERT ... ON CONFLICT DO UPDATE on profiles fails RLS even when
-- the row exists, which breaks the sandbox's project resolution and live AI.
-- Applied to production on 2026-10-31.
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());
