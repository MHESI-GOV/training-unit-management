-- Helper functions read via SECURITY DEFINER so RLS policies can call them without
-- recursing into profiles' own RLS. Owned by the migration role (postgres), which
-- has BYPASSRLS in Supabase — this is the standard Supabase RBAC pattern.

create or replace function public.current_user_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_unit_scope()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select unit_scope from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_role to authenticated;
grant execute on function public.current_user_unit_scope to authenticated;
