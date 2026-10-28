-- Learner status on the dashboard now follows the class timeline, collapsed to 3 states (per user
-- 2026-10-28): อยู่ระหว่างเรียน (in_progress) / เรียนเสร็จแล้ว (finished) / ถอนตัว (withdrawn), replacing
-- the old 5 enrollment-status buckets. Derived per learner from their in-scope enrollments:
--   withdrawn  — all of the learner's (in-window) enrollments are 'withdrawn'
--   in_progress — has a non-withdrawn enrollment whose class has NOT ended (end_date >= today)
--   finished    — has a non-withdrawn enrollment but all such classes have ended (end_date < today)
-- Withdrawn learners are now INCLUDED in total_learners and the pyramid so the donut reconciles with
-- the "จำนวนผู้เรียน" headline (the class-level SEAT count still excludes them — that's a separate
-- metric). Pass/fail of the course is a separate RESULT (certificates), not a status.

create or replace function public.get_dashboard_overview(
  p_unit_id uuid default null,
  p_fiscal_year int default null,
  p_region text default null,
  p_unit_type text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.user_role; v_exec boolean; v_t constant int := 5;
  v_units uuid[];
  v_by_year boolean; v_fy int; v_win_start date; v_win_end date;
  v_total_units bigint; v_total_learners bigint;
  v_units_by_region jsonb; v_units_by_type jsonb; v_learners_by_region jsonb;
  v_cert_anamai_contact bigint; v_cert_professional_q bigint; v_cert_dsd_l1 bigint;
  v_status_in_progress bigint; v_status_finished bigint; v_status_withdrawn bigint;
  v_pins jsonb; v_latest_units jsonb;
  v_part_fy int; v_part_open boolean; v_active_units bigint; v_part_total bigint;
begin
  if auth.uid() is not null then select role into v_role from public.profiles where id = auth.uid(); end if;
  v_exec := (v_role is null or v_role = 'executive');
  v_units := public._dashboard_scope_units(p_unit_id, p_region, p_unit_type, p_fiscal_year);
  v_by_year := p_fiscal_year is not null; v_fy := p_fiscal_year;
  if v_by_year then
    v_win_start := make_date(v_fy - 543 - 1, 10, 1);
    v_win_end := make_date(v_fy - 543, 10, 1);
  end if;

  select count(*) into v_total_units from public.training_units u where u.unit_id = any(v_units);

  select coalesce(jsonb_object_agg(r.region, coalesce(c.cnt, 0)), '{}'::jsonb) into v_units_by_region
  from (select unnest(enum_range(null::public.region_type))::text as region) r
  left join (
    select u.region::text as region, count(*) as cnt from public.training_units u
    where u.unit_id = any(v_units) group by u.region
  ) c on c.region = r.region;

  select coalesce(jsonb_object_agg(t.type, coalesce(c.cnt, 0)), '{}'::jsonb) into v_units_by_type
  from (select unnest(enum_range(null::public.unit_type))::text as type) t
  left join (
    select u.type::text as type, count(*) as cnt from public.training_units u
    where u.unit_id = any(v_units) group by u.type
  ) c on c.type = t.type;

  -- Learners (withdrawn INCLUDED so the status donut reconciles with this headline)
  if v_by_year then
    select count(distinct l.learner_id) into v_total_learners
    from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    join public.classes cl on cl.class_id = e.class_id
    where l.unit_id = any(v_units) and cl.start_date >= v_win_start and cl.start_date < v_win_end;
  else
    select count(*) into v_total_learners from public.learners l where l.unit_id = any(v_units);
  end if;
  if v_exec and v_total_learners > 0 and v_total_learners < v_t then v_total_learners := null; end if;

  if v_by_year then
    select coalesce(jsonb_object_agg(r.region,
             case when v_exec and coalesce(c.cnt,0) > 0 and coalesce(c.cnt,0) < v_t then null else coalesce(c.cnt,0) end), '{}'::jsonb)
    into v_learners_by_region
    from (select unnest(enum_range(null::public.region_type))::text as region) r
    left join (
      select u.region::text as region, count(distinct l.learner_id) as cnt
      from public.training_units u
      join public.learners l on l.unit_id = u.unit_id
      join public.enrollments e on e.learner_id = l.learner_id
      join public.classes cl on cl.class_id = e.class_id
      where u.unit_id = any(v_units) and cl.start_date >= v_win_start and cl.start_date < v_win_end
      group by u.region
    ) c on c.region = r.region;
  else
    select coalesce(jsonb_object_agg(r.region,
             case when v_exec and coalesce(c.cnt,0) > 0 and coalesce(c.cnt,0) < v_t then null else coalesce(c.cnt,0) end), '{}'::jsonb)
    into v_learners_by_region
    from (select unnest(enum_range(null::public.region_type))::text as region) r
    left join (
      select u.region::text as region, count(l.learner_id) as cnt
      from public.training_units u
      left join public.learners l on l.unit_id = u.unit_id
      where u.unit_id = any(v_units) group by u.region
    ) c on c.region = r.region;
  end if;

  select count(distinct ar.learner_id) into v_cert_anamai_contact
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'anamai_food_contact' and ar.result = 'passed' and l.unit_id = any(v_units)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));
  select count(distinct ar.learner_id) into v_cert_professional_q
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'professional_qualification' and ar.result = 'passed' and l.unit_id = any(v_units)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));
  select count(distinct ar.learner_id) into v_cert_dsd_l1
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'dsd_l1' and ar.result = 'passed' and l.unit_id = any(v_units)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));

  -- Study status (3 states derived from class timeline + withdrawn; one per learner)
  select
    count(*) filter (where has_ongoing),
    count(*) filter (where not has_ongoing and has_active),
    count(*) filter (where not has_active)
  into v_status_in_progress, v_status_finished, v_status_withdrawn
  from (
    select l.learner_id,
      bool_or(e.status <> 'withdrawn' and cl.end_date >= current_date) as has_ongoing,
      bool_or(e.status <> 'withdrawn') as has_active
    from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    join public.classes cl on cl.class_id = e.class_id
    where l.unit_id = any(v_units)
      and (not v_by_year or (cl.start_date >= v_win_start and cl.start_date < v_win_end))
    group by l.learner_id
  ) s;

  if v_exec then
    if v_cert_anamai_contact > 0 and v_cert_anamai_contact < v_t then v_cert_anamai_contact := null; end if;
    if v_cert_professional_q > 0 and v_cert_professional_q < v_t then v_cert_professional_q := null; end if;
    if v_cert_dsd_l1 > 0 and v_cert_dsd_l1 < v_t then v_cert_dsd_l1 := null; end if;
    if v_status_in_progress > 0 and v_status_in_progress < v_t then v_status_in_progress := null; end if;
    if v_status_finished > 0 and v_status_finished < v_t then v_status_finished := null; end if;
    if v_status_withdrawn > 0 and v_status_withdrawn < v_t then v_status_withdrawn := null; end if;
  end if;

  if v_by_year then
    select pr.fiscal_year, (pr.status = 'open') into v_part_fy, v_part_open
    from public.participation_rounds pr where pr.fiscal_year = v_fy;
  else
    select pr.fiscal_year, (pr.status = 'open') into v_part_fy, v_part_open
    from public.participation_rounds pr order by pr.fiscal_year desc limit 1;
  end if;
  if v_part_fy is not null then
    select count(*) filter (where up.status = 'confirmed'), count(*) into v_active_units, v_part_total
    from public.unit_participation up where up.fiscal_year = v_part_fy and up.unit_id = any(v_units);
  else v_active_units := 0; v_part_total := 0; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'unit_id', u.unit_id, 'name', u.name, 'region', u.region::text, 'type', u.type::text,
           'province', p.province_name, 'lat', p.latitude, 'lng', p.longitude)), '[]'::jsonb)
  into v_pins
  from public.training_units u
  join public.training_unit_profiles p on p.unit_id = u.unit_id
  where p.latitude is not null and p.longitude is not null and u.unit_id = any(v_units);

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_latest_units
  from (
    select jsonb_build_object('unit_id', u.unit_id, 'name', u.name, 'region', u.region::text,
             'type', u.type::text, 'status', u.status::text) as x
    from public.training_units u where u.unit_id = any(v_units)
    order by u.created_at desc limit 6
  ) s;

  return jsonb_build_object(
    'total_units', v_total_units, 'units_by_region', v_units_by_region, 'units_by_type', v_units_by_type,
    'total_learners', v_total_learners, 'learners_by_region', v_learners_by_region,
    'cert_anamai_contact', v_cert_anamai_contact, 'cert_professional_q', v_cert_professional_q, 'cert_dsd_l1', v_cert_dsd_l1,
    'status_in_progress', v_status_in_progress, 'status_finished', v_status_finished, 'status_withdrawn', v_status_withdrawn,
    'participation_fiscal_year', v_part_fy, 'participation_round_open', v_part_open,
    'active_units', v_active_units, 'participation_total', v_part_total,
    'pins', v_pins, 'latest_units', v_latest_units
  );
end $$;
grant execute on function public.get_dashboard_overview(uuid, int, text, text) to anon, authenticated;

-- Pyramid: include withdrawn (demographic of all enrolled learners), consistent with total_learners.
create or replace function public.get_learner_pyramid(
  p_unit_id uuid default null, p_fiscal_year int default null,
  p_region text default null, p_unit_type text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_units uuid[]; v_role public.user_role; v_exec boolean; v_t constant int := 5;
  v_by boolean; v_fy int; v_ws date; v_we date; result jsonb;
begin
  v_units := public._dashboard_scope_units(p_unit_id, p_region, p_unit_type, p_fiscal_year);
  if auth.uid() is not null then select role into v_role from public.profiles where id = auth.uid(); end if;
  v_exec := (v_role is null or v_role = 'executive');
  v_by := p_fiscal_year is not null; v_fy := p_fiscal_year;
  if v_by then v_ws := make_date(v_fy - 543 - 1, 10, 1); v_we := make_date(v_fy - 543, 10, 1); end if;

  with scoped as (
    select distinct l.learner_id, l.gender, extract(year from age(l.birth_date))::int as age_years
    from public.learners l
    where l.unit_id = any(v_units) and l.birth_date is not null
      and (not v_by or exists (
        select 1 from public.enrollments e join public.classes cl on cl.class_id = e.class_id
        where e.learner_id = l.learner_id and cl.start_date >= v_ws and cl.start_date < v_we))
  ),
  banded as (
    select case
      when age_years <= 19 then '≤19' when age_years <= 29 then '20–29'
      when age_years <= 39 then '30–39' when age_years <= 49 then '40–49'
      when age_years <= 59 then '50–59' else '60+' end as band,
      gender, count(*) as c
    from scoped group by 1, 2
  ),
  bands as (select unnest(array['≤19','20–29','30–39','40–49','50–59','60+']) as band),
  pivoted as (
    select b.band,
      coalesce(sum(c) filter (where gender = 'male'), 0) as male,
      coalesce(sum(c) filter (where gender = 'female'), 0) as female,
      coalesce(sum(c) filter (where gender = 'other' or gender is null), 0) as other
    from bands b left join banded bd on bd.band = b.band group by b.band
  )
  select jsonb_agg(jsonb_build_object(
    'band', band,
    'male',   case when v_exec and male   > 0 and male   < v_t then 0 else male end,
    'female', case when v_exec and female > 0 and female < v_t then 0 else female end,
    'other',  case when v_exec and other  > 0 and other  < v_t then 0 else other end
  ) order by array_position(array['≤19','20–29','30–39','40–49','50–59','60+'], band))
  into result from pivoted;

  return coalesce(result, '[]'::jsonb);
end $$;
grant execute on function public.get_learner_pyramid(uuid, int, text, text) to anon, authenticated;
