-- submit_training_unit(): the one-shot "กรอกข้อมูลหน่วยฝึกอบรม" transaction.
-- Creates the TrainingUnit AND sets the caller's own unit_scope atomically — there is
-- deliberately no separate approval step (round 9). Re-running this after unit_scope is
-- already set raises 'forbidden', satisfying ST-12.
create or replace function public.submit_training_unit(
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

  if v_profile.id is null or v_profile.role <> 'unit_coordinator' or v_profile.unit_scope is not null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.training_units (created_by, external_ref, name, type, region)
  values (v_profile.id, p_external_ref, p_name, p_type, p_region)
  returning unit_id into v_unit_id;

  update public.profiles set unit_scope = v_unit_id where id = v_profile.id;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id)
  values (v_profile.id, 'create_training_unit', 'training_unit', v_unit_id::text);

  return v_unit_id;
end;
$$;

grant execute on function public.submit_training_unit to authenticated;

-- check_learner_eligibility(): the one deliberate, narrow cross-unit exception to RLS
-- (docs/planning/09-security-privacy-plan.md §4). Takes a hash, not a raw national ID,
-- and returns only a 3-way status — never PII or which unit holds the matching record.
create or replace function public.check_learner_eligibility(
  p_national_id_hash text,
  p_course_id uuid
) returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_learner_id uuid;
  v_result text;
begin
  select learner_id into v_learner_id
  from public.learners
  where national_id_hash = p_national_id_hash;

  if v_learner_id is null then
    v_result := 'eligible';
  elsif exists (
    select 1
    from public.enrollments e
    join public.classes c on c.class_id = e.class_id
    join public.certification_records cr on cr.enrollment_id = e.enrollment_id
    where e.learner_id = v_learner_id
      and c.course_id = p_course_id
      and cr.certified_at is not null
  ) then
    v_result := 'blocked_already_completed';
  elsif exists (
    select 1 from public.enrollments e
    where e.learner_id = v_learner_id and e.status = 'ไม่สำเร็จ'
  ) then
    v_result := 'blocked_disqualified';
  else
    v_result := 'eligible';
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id, changed_fields)
  values (auth.uid(), 'eligibility_check', 'learner', p_national_id_hash, array[v_result]);

  return v_result;
end;
$$;

grant execute on function public.check_learner_eligibility to authenticated;

-- Enforces the eligibility check at the DB layer too (not just application logic),
-- so a direct API call outside the normal enrollment flow can't bypass it.
create or replace function public.enforce_enrollment_eligibility()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_hash text;
  v_status text;
begin
  select course_id into v_course_id from public.classes where class_id = new.class_id;
  select national_id_hash into v_hash from public.learners where learner_id = new.learner_id;

  v_status := public.check_learner_eligibility(v_hash, v_course_id);

  if v_status <> 'eligible' then
    raise exception 'learner not eligible: %', v_status using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_enrollment_eligibility
  before insert on public.enrollments
  for each row execute function public.enforce_enrollment_eligibility();

-- FR-6.3: hard cap of 6 photos per training unit, enforced server-side (not just UI validation)
create or replace function public.enforce_max_unit_images()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.training_unit_images where unit_id = new.unit_id) >= 6 then
    raise exception 'max 6 images per training unit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_max_unit_images
  before insert on public.training_unit_images
  for each row execute function public.enforce_max_unit_images();
