-- claude-3-5-haiku-20241022 and claude-3-7-sonnet-20250219 were retired by
-- Anthropic on 2026-02-19; requests to them fail. Point the registry at the
-- current models and allow Haiku on the Free plan.
-- Applied to production on 2026-10-31.
update public.ai_models m
set model_key = 'claude-haiku-5-5',
    display_name = 'Claude Haiku 5.5',
    allowed_plans = '["free","starter","pro","agency"]'::jsonb
from public.ai_providers p
where p.id = m.provider_id and p.provider_key = 'anthropic'
  and m.model_key = 'claude-3-5-haiku-20241022';

update public.ai_models m
set model_key = 'claude-sonnet-5-5',
    display_name = 'Claude Sonnet 5.5'
from public.ai_providers p
where p.id = m.provider_id and p.provider_key = 'anthropic'
  and m.model_key = 'claude-3-7-sonnet-20250219';
