-- Round 12 (2026-10-30): let Web Master / Central Staff create a training unit DIRECTLY, without
-- becoming its coordinator. The project is now live with ~72 units that already operated in the
-- real world; staff must be able to create them and fill all their data, then assign a Unit
-- Coordinator account to each unit LATER (that assignment stays in the app/admin layer, not here).
--
-- This is deliberately SEPARATE from submit_training_unit() (the coordinator self-onboarding path,
-- which sets the caller's unit_scope). create_training_unit_as_staff() must NOT touch unit_scope:
-- the caller keeps their web_master/central_staff role and parity over every unit.
--
-- training_units has no INSERT RLS policy by design (creation is centralized in SECURITY DEFINER
-- functions), so this new function is the staff creation path. unit_seq is assigned by the existing
-- set_unit_seq() trigger; audit is written here to match submit_training_unit().
create or replace function public.create_training_unit_as_staff(
  p_name text,
  p_type unit_type,
  p_region region_type,
  p_external_ref text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_unit_id uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();

  if v_profile.id is null or v_profile.role not in ('web_master', 'central_staff') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.training_units (created_by, external_ref, name, type, region)
  values (v_profile.id, p_external_ref, p_name, p_type, p_region)
  returning unit_id into v_unit_id;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id)
  values (v_profile.id, 'create_training_unit', 'training_unit', v_unit_id::text);

  return v_unit_id;
end;
$$;

grant execute on function public.create_training_unit_as_staff(text, unit_type, region_type, text) to authenticated;
