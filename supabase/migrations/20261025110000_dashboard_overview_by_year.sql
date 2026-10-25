-- Fiscal-year scoping for the dashboard overview, driven by a year dropdown on the Dashboard +
-- public Home. When p_fiscal_year is NULL the overview is "all years" (unchanged behavior). When
-- a BE fiscal year is given, every metric is scoped to that year by its OWN real activity date
-- (the "activity-driven" model the user chose), not by one shared key:
--   * units        -> units that CONFIRMED participation in that year's round
--   * learners     -> learners with an enrollment into a class whose start_date falls in the
--                     fiscal-year window (1 Oct – 30 Sep, BE-numbered by the year it ends in)
--   * study status -> same (completed/attending enrollments on in-window classes)
--   * certificates -> passed assessments whose tested_at falls in the window
--   * participation badge -> that specific year's round (vs. the most-recent round when all-years)
--
-- The fiscal-year Oct–Sep boundary + BE conversion is owned by src/lib/fiscal-year.ts in the app;
-- the same arithmetic is reproduced here only to turn a BE year int into the Gregorian date window
-- for date filtering. end_greg = fy - 543; window = [make_date(end_greg-1,10,1), make_date(end_greg,10,1)).

-- Distinct fiscal years that have ANY data, newest first — feeds the dropdown. Union of years with
-- a participation round, years with class activity (start_date), and years with assessment results
-- (tested_at). Org-level, no PII -> granted to anon + authenticated like the overview itself.
create or replace function public.get_dashboard_fiscal_years()
returns int[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(fy order by fy desc), '{}'::int[])
  from (
    select distinct fy from (
      select fiscal_year as fy from public.participation_rounds
      union
      select (extract(year from start_date)::int + 543
              + case when extract(month from start_date) >= 10 then 1 else 0 end)
      from public.classes
      union
      select (extract(year from tested_at)::int + 543
              + case when extract(month from tested_at) >= 10 then 1 else 0 end)
      from public.assessment_results where tested_at is not null
    ) u
    where fy is not null
  ) t;
$$;

grant execute on function public.get_dashboard_fiscal_years to anon, authenticated;

-- The previous single-arg (uuid) version must be dropped explicitly: adding a parameter makes a
-- NEW overload rather than replacing it, which would leave an ambiguous get_dashboard_overview.
drop function if exists public.get_dashboard_overview(uuid);

create or replace function public.get_dashboard_overview(
  p_unit_id uuid default null,
  p_fiscal_year int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_own_unit uuid;
  v_filter uuid;
  v_exec boolean;
  v_t constant int := 5;
  v_by_year boolean;
  v_fy int;
  v_win_start date;
  v_win_end date;  -- exclusive
  v_total_units bigint;
  v_total_learners bigint;
  v_units_by_region jsonb;
  v_units_by_type jsonb;
  v_learners_by_region jsonb;
  v_cert_anamai_contact bigint;
  v_cert_professional_q bigint;
  v_cert_dsd_l1 bigint;
  v_status_completed bigint;
  v_status_in_progress bigint;
  v_pins jsonb;
  v_latest_units jsonb;
  v_part_fy int;
  v_part_open boolean;
  v_active_units bigint;
  v_part_total bigint;
begin
  if auth.uid() is not null then
    select role, unit_scope into v_role, v_own_unit from public.profiles where id = auth.uid();
  end if;

  if v_role = 'unit_coordinator' then
    v_filter := v_own_unit;
  elsif v_role is null or v_role = 'executive' then
    v_filter := null;
  else
    v_filter := p_unit_id;
  end if;
  v_exec := (v_role is null or v_role = 'executive');

  v_by_year := p_fiscal_year is not null;
  v_fy := p_fiscal_year;
  if v_by_year then
    v_win_start := make_date(v_fy - 543 - 1, 10, 1);
    v_win_end := make_date(v_fy - 543, 10, 1);
  end if;

  -- ── Units (scoped to units confirmed in FY v_fy when by_year) ──────────────────────────────
  select count(*) into v_total_units
  from public.training_units u
  where (v_filter is null or u.unit_id = v_filter)
    and (not v_by_year or exists (
      select 1 from public.unit_participation up
      where up.unit_id = u.unit_id and up.fiscal_year = v_fy and up.status = 'confirmed'));

  select coalesce(jsonb_object_agg(r.region, coalesce(c.cnt, 0)), '{}'::jsonb)
  into v_units_by_region
  from (select unnest(enum_range(null::public.region_type))::text as region) r
  left join (
    select u.region::text as region, count(*) as cnt
    from public.training_units u
    where (v_filter is null or u.unit_id = v_filter)
      and (not v_by_year or exists (
        select 1 from public.unit_participation up
        where up.unit_id = u.unit_id and up.fiscal_year = v_fy and up.status = 'confirmed'))
    group by u.region
  ) c on c.region = r.region;

  select coalesce(jsonb_object_agg(t.type, coalesce(c.cnt, 0)), '{}'::jsonb)
  into v_units_by_type
  from (select unnest(enum_range(null::public.unit_type))::text as type) t
  left join (
    select u.type::text as type, count(*) as cnt
    from public.training_units u
    where (v_filter is null or u.unit_id = v_filter)
      and (not v_by_year or exists (
        select 1 from public.unit_participation up
        where up.unit_id = u.unit_id and up.fiscal_year = v_fy and up.status = 'confirmed'))
    group by u.type
  ) c on c.type = t.type;

  -- ── Learners (all-years: every learner in scope; by-year: learners active in an in-window class)
  if v_by_year then
    select count(distinct l.learner_id) into v_total_learners
    from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    join public.classes cl on cl.class_id = e.class_id
    where (v_filter is null or l.unit_id = v_filter)
      and cl.start_date >= v_win_start and cl.start_date < v_win_end;
  else
    select count(*) into v_total_learners
    from public.learners l
    where v_filter is null or l.unit_id = v_filter;
  end if;
  if v_exec and v_total_learners > 0 and v_total_learners < v_t then v_total_learners := null; end if;

  if v_by_year then
    select coalesce(jsonb_object_agg(
             r.region,
             case when v_exec and coalesce(c.cnt, 0) > 0 and coalesce(c.cnt, 0) < v_t
                  then null else coalesce(c.cnt, 0) end
           ), '{}'::jsonb)
    into v_learners_by_region
    from (select unnest(enum_range(null::public.region_type))::text as region) r
    left join (
      select u.region::text as region, count(distinct l.learner_id) as cnt
      from public.training_units u
      join public.learners l on l.unit_id = u.unit_id
      join public.enrollments e on e.learner_id = l.learner_id
      join public.classes cl on cl.class_id = e.class_id
      where (v_filter is null or u.unit_id = v_filter)
        and cl.start_date >= v_win_start and cl.start_date < v_win_end
      group by u.region
    ) c on c.region = r.region;
  else
    select coalesce(jsonb_object_agg(
             r.region,
             case when v_exec and coalesce(c.cnt, 0) > 0 and coalesce(c.cnt, 0) < v_t
                  then null else coalesce(c.cnt, 0) end
           ), '{}'::jsonb)
    into v_learners_by_region
    from (select unnest(enum_range(null::public.region_type))::text as region) r
    left join (
      select u.region::text as region, count(l.learner_id) as cnt
      from public.training_units u
      left join public.learners l on l.unit_id = u.unit_id
      where v_filter is null or u.unit_id = v_filter
      group by u.region
    ) c on c.region = r.region;
  end if;

  -- ── Certificates (by-year: tested_at in window) ───────────────────────────────────────────
  select count(distinct ar.learner_id) into v_cert_anamai_contact
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'anamai_food_contact' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));

  select count(distinct ar.learner_id) into v_cert_professional_q
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'professional_qualification' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));

  select count(distinct ar.learner_id) into v_cert_dsd_l1
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'dsd_l1' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter)
    and (not v_by_year or (ar.tested_at >= v_win_start and ar.tested_at < v_win_end));

  -- ── Study status (by-year: class start_date in window) ────────────────────────────────────
  select count(distinct l.learner_id) into v_status_completed
  from public.learners l join public.enrollments e on e.learner_id = l.learner_id
  join public.classes cl on cl.class_id = e.class_id
  where e.status = 'completed' and (v_filter is null or l.unit_id = v_filter)
    and (not v_by_year or (cl.start_date >= v_win_start and cl.start_date < v_win_end));

  select count(distinct l.learner_id) into v_status_in_progress
  from public.learners l join public.enrollments e on e.learner_id = l.learner_id
  join public.classes cl on cl.class_id = e.class_id
  where e.status = 'attending' and (v_filter is null or l.unit_id = v_filter)
    and (not v_by_year or (cl.start_date >= v_win_start and cl.start_date < v_win_end));

  if v_exec then
    if v_cert_anamai_contact > 0 and v_cert_anamai_contact < v_t then v_cert_anamai_contact := null; end if;
    if v_cert_professional_q > 0 and v_cert_professional_q < v_t then v_cert_professional_q := null; end if;
    if v_cert_dsd_l1 > 0 and v_cert_dsd_l1 < v_t then v_cert_dsd_l1 := null; end if;
    if v_status_completed > 0 and v_status_completed < v_t then v_status_completed := null; end if;
    if v_status_in_progress > 0 and v_status_in_progress < v_t then v_status_in_progress := null; end if;
  end if;

  -- ── Participation badge ───────────────────────────────────────────────────────────────────
  -- by-year: that year's round (null if none opened); all-years: the most recent round.
  if v_by_year then
    select pr.fiscal_year, (pr.status = 'open')
    into v_part_fy, v_part_open
    from public.participation_rounds pr
    where pr.fiscal_year = v_fy;
  else
    select pr.fiscal_year, (pr.status = 'open')
    into v_part_fy, v_part_open
    from public.participation_rounds pr
    order by pr.fiscal_year desc
    limit 1;
  end if;

  if v_part_fy is not null then
    select
      count(*) filter (where up.status = 'confirmed'),
      count(*)
    into v_active_units, v_part_total
    from public.unit_participation up
    where up.fiscal_year = v_part_fy
      and (v_filter is null or up.unit_id = v_filter);
  else
    v_active_units := 0;
    v_part_total := 0;
  end if;

  -- ── Map pins + latest units (unit-scoped same as the unit counts) ─────────────────────────
  select coalesce(jsonb_agg(jsonb_build_object(
           'unit_id', u.unit_id, 'name', u.name, 'region', u.region::text,
           'type', u.type::text, 'province', p.province_name,
           'lat', p.latitude, 'lng', p.longitude
         )), '[]'::jsonb)
  into v_pins
  from public.training_units u
  join public.training_unit_profiles p on p.unit_id = u.unit_id
  where p.latitude is not null and p.longitude is not null
    and (v_filter is null or u.unit_id = v_filter)
    and (not v_by_year or exists (
      select 1 from public.unit_participation up
      where up.unit_id = u.unit_id and up.fiscal_year = v_fy and up.status = 'confirmed'));

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_latest_units
  from (
    select jsonb_build_object(
             'unit_id', u.unit_id, 'name', u.name, 'region', u.region::text,
             'type', u.type::text, 'status', u.status::text
           ) as x
    from public.training_units u
    where (v_filter is null or u.unit_id = v_filter)
      and (not v_by_year or exists (
        select 1 from public.unit_participation up
        where up.unit_id = u.unit_id and up.fiscal_year = v_fy and up.status = 'confirmed'))
    order by u.created_at desc
    limit 6
  ) s;

  return jsonb_build_object(
    'total_units', v_total_units,
    'units_by_region', v_units_by_region,
    'units_by_type', v_units_by_type,
    'total_learners', v_total_learners,
    'learners_by_region', v_learners_by_region,
    'cert_anamai_contact', v_cert_anamai_contact,
    'cert_professional_q', v_cert_professional_q,
    'cert_dsd_l1', v_cert_dsd_l1,
    'status_completed', v_status_completed,
    'status_in_progress', v_status_in_progress,
    'participation_fiscal_year', v_part_fy,
    'participation_round_open', v_part_open,
    'active_units', v_active_units,
    'participation_total', v_part_total,
    'pins', v_pins,
    'latest_units', v_latest_units
  );
end;
$$;

grant execute on function public.get_dashboard_overview(uuid, int) to anon, authenticated;
