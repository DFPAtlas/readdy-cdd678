-- Read-only verification: expected anon/authenticated=false, service_role=true.
-- No Vault rows or secret values are read. Missing functions fail explicitly.
with wrappers(signature) as (values
  ('public.forge_integration_store_secret(text,text,text)'),
  ('public.forge_integration_read_secret(text)'),
  ('public.forge_integration_read_named_secret(text)'),
  ('public.forge_integration_update_secret(text,text,text,text)'),
  ('public.forge_integration_delete_secret(text)')
)
select signature,
  has_function_privilege('anon', signature::regprocedure, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', signature::regprocedure, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', signature::regprocedure, 'EXECUTE') as service_execute
from wrappers order by signature;
