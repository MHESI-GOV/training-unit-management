-- Extend submit_training_unit() to capture the unit's map location (lat/lng) at creation, from
-- the search + pin-drop picker on /unit-setup (stage 2). Two new nullable params with defaults so
-- the original 4-arg call still resolves. When coords are given, a training_unit_profiles row is
-- created/updated in the same transaction (on conflict, so later /unit/profile edits still work).
--
-- Drop the original 4-arg function first: adding params with defaults would otherwise create a
-- SECOND overload (same name), making an unqualified GRANT ambiguous. There is only ever one
-- submit_training_unit, now the 6-arg form.
drop function if exists public.submit_training_unit(text, unit_type, region_type, text);

create or replace function public.submit_training_unit(
  p_name text,
  p_type unit_type,
  p_region region_type,
  p_external_ref text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_unit_id uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();

  if v_profile.id is null or v_profile.role <> 'unit_coordinator' or v_profile.unit_scope is not null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.training_units (created_by, external_ref, name, type, region)
  values (v_profile.id, p_external_ref, p_name, p_type, p_region)
  returning unit_id into v_unit_id;

  update public.profiles set unit_scope = v_unit_id where id = v_profile.id;

  if p_latitude is not null and p_longitude is not null then
    insert into public.training_unit_profiles (unit_id, latitude, longitude)
    values (v_unit_id, p_latitude, p_longitude)
    on conflict (unit_id) do update set latitude = excluded.latitude, longitude = excluded.longitude;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id)
  values (v_profile.id, 'create_training_unit', 'training_unit', v_unit_id::text);

  return v_unit_id;
end;
$$;

grant execute on function public.submit_training_unit(text, unit_type, region_type, text, double precision, double precision) to authenticated;
