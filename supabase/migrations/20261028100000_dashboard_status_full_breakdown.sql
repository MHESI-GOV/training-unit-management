-- Make the "สถานะการเรียน" donut reconcile with the "จำนวนผู้เรียน" headline.
--
-- Before: get_dashboard_overview returned only status_completed + status_in_progress (attending),
-- each as an independent count(distinct learner). Their sum (the donut centre) was therefore
-- smaller than total_learners whenever a learner's enrollment status was 'applied' or 'failed'
-- (e.g. 172 + 44 = 216 vs. a 220 headline) — two different "ผู้เรียน" totals on one screen.
--
-- After: every learner in the SAME set that total_learners counts is bucketed exactly once by a
-- single priority status over their enrollments (completed > attending > applied > failed), plus a
-- "not enrolled in any round" bucket for the all-years view (always 0 in the by-year view, where
-- total_learners already requires an in-window enrollment). The five buckets partition the learner
-- set, so status_completed + in_progress + applied + failed + not_enrolled == total_learners.
--
-- Priority rationale: a learner with several enrollments shows their most-advanced/active state —
-- a pass (completed) outranks an in-progress class, which outranks a pending application, which
-- outranks a past failure (an active re-attempt should not read as "failed").
--
-- Executive suppression (ST-4) applies to the new buckets exactly like the existing ones. When any
-- bucket is suppressed the donut no longer reconciles — intended: suppression wins over tidiness.
-- Everything else in the function is copied unchanged from 20261025110000_dashboard_overview_by_year.

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
  v_status_applied bigint;
  v_status_failed bigint;
  v_status_not_enrolled bigint;
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

  -- ── Study status (one priority bucket per learner, partitioning the total_learners set) ───
  -- by-year: exactly the learners counted by v_total_learners (in-window enrollment) → every one
  -- has pr >= 1, so "not enrolled" is always 0. all-years: left join keeps learners with no
  -- enrollment at all (pr null) in the "not enrolled" bucket. Either way the five buckets sum to
  -- v_total_learners.
  if v_by_year then
    select
      count(*) filter (where pr = 4),
      count(*) filter (where pr = 3),
      count(*) filter (where pr = 2),
      count(*) filter (where pr = 1)
    into v_status_completed, v_status_in_progress, v_status_applied, v_status_failed
    from (
      select l.learner_id,
             max(case e.status
                   when 'completed' then 4
                   when 'attending' then 3
                   when 'applied'   then 2
                   when 'failed'    then 1
                 end) as pr
      from public.learners l
      join public.enrollments e on e.learner_id = l.learner_id
      join public.classes cl on cl.class_id = e.class_id
      where (v_filter is null or l.unit_id = v_filter)
        and cl.start_date >= v_win_start and cl.start_date < v_win_end
      group by l.learner_id
    ) s;
    v_status_not_enrolled := 0;
  else
    select
      count(*) filter (where pr = 4),
      count(*) filter (where pr = 3),
      count(*) filter (where pr = 2),
      count(*) filter (where pr = 1),
      count(*) filter (where pr is null)
    into v_status_completed, v_status_in_progress, v_status_applied, v_status_failed, v_status_not_enrolled
    from (
      select l.learner_id,
             max(case e.status
                   when 'completed' then 4
                   when 'attending' then 3
                   when 'applied'   then 2
                   when 'failed'    then 1
                 end) as pr
      from public.learners l
      left join public.enrollments e on e.learner_id = l.learner_id
      where (v_filter is null or l.unit_id = v_filter)
      group by l.learner_id
    ) s;
  end if;

  if v_exec then
    if v_cert_anamai_contact > 0 and v_cert_anamai_contact < v_t then v_cert_anamai_contact := null; end if;
    if v_cert_professional_q > 0 and v_cert_professional_q < v_t then v_cert_professional_q := null; end if;
    if v_cert_dsd_l1 > 0 and v_cert_dsd_l1 < v_t then v_cert_dsd_l1 := null; end if;
    if v_status_completed > 0 and v_status_completed < v_t then v_status_completed := null; end if;
    if v_status_in_progress > 0 and v_status_in_progress < v_t then v_status_in_progress := null; end if;
    if v_status_applied > 0 and v_status_applied < v_t then v_status_applied := null; end if;
    if v_status_failed > 0 and v_status_failed < v_t then v_status_failed := null; end if;
    if v_status_not_enrolled > 0 and v_status_not_enrolled < v_t then v_status_not_enrolled := null; end if;
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
    'status_applied', v_status_applied,
    'status_failed', v_status_failed,
    'status_not_enrolled', v_status_not_enrolled,
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
