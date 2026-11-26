-- Restore the intended service-role-only contract for integration Vault RPCs.
-- Live catalogue review found direct anon/authenticated EXECUTE grants on all
-- five wrappers. The older migration revoked PUBLIC only, which does not
-- remove grants made directly to individual roles.
-- No secret rows, IDs, values, encryption or API signatures are changed.
begin;

-- This wrapper exists live but was missing from source. Keep its existing
-- signature/search_path and backend behaviour while recording it in source.
create or replace function public.forge_integration_read_named_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = p_name
  order by created_at desc
  limit 1;
  return v_secret;
end;
$function$;

revoke all on function public.forge_integration_store_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.forge_integration_read_secret(text) from public, anon, authenticated;
revoke all on function public.forge_integration_read_named_secret(text) from public, anon, authenticated;
revoke all on function public.forge_integration_update_secret(text, text, text, text) from public, anon, authenticated;
revoke all on function public.forge_integration_delete_secret(text) from public, anon, authenticated;

grant execute on function public.forge_integration_store_secret(text, text, text) to service_role;
grant execute on function public.forge_integration_read_secret(text) to service_role;
grant execute on function public.forge_integration_read_named_secret(text) to service_role;
grant execute on function public.forge_integration_update_secret(text, text, text, text) to service_role;
grant execute on function public.forge_integration_delete_secret(text) to service_role;

commit;
