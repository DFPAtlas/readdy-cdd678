-- Forge — auto-create a profiles row on signup
--
-- Supabase Auth (auth.users) is the single source of identity and email.
-- This trigger creates the matching public.profiles row the moment a user
-- is created, so a brand-new user can immediately read and update their
-- display name without first creating a project.
--
-- Idempotent: safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, initials)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    upper(substring(coalesce(new.email, 'u') from 1 for 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();