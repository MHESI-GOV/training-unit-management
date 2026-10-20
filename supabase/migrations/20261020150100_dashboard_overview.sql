-- get_dashboard_overview(): the single data source for the expanded dashboard (units/learners
-- by region, the 3 certification headcounts, institution-type donut, learning status, and map
-- pins). SECURITY DEFINER for the same reason as get_dashboard_kpis: Executive has NO RLS access
-- to learners/enrollments/assessment_results at all (zero PII by design), so aggregates must come
-- from a definer function that returns only pre-aggregated counts, never rows.
--
-- Role scoping is enforced here, not trusted to the caller:
--   unit_coordinator -> hard-locked to own unit_scope (p_unit_id ignored)
--   executive        -> always project-wide (p_unit_id ignored) + small-group suppression
--   web_master / central_staff -> may filter by any p_unit_id, or all units when null
--
-- Suppression (ST-4, docs/planning/09-security-privacy-plan.md §6): for Executive only, any
-- PEOPLE count that is >0 and < threshold(5) is returned as null (UI shows "ข้อมูลน้อยเกินไป").
-- Unit counts (by region / by type / total) are organizational, never about one person, so they
-- are never suppressed -- consistent with units_with_data/total_units in get_dashboard_kpis.
create or replace function public.get_dashboard_overview(p_unit_id uuid default null)
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
begin
  select role, unit_scope into v_role, v_own_unit from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_role = 'unit_coordinator' then
    v_filter := v_own_unit;
  elsif v_role = 'executive' then
    v_filter := null;
  else
    v_filter := p_unit_id;
  end if;
  v_exec := (v_role = 'executive');

  -- ----- unit counts (never suppressed) -----
  select count(*) into v_total_units
  from public.training_units u
  where v_filter is null or u.unit_id = v_filter;

  -- every region present even at 0, via the enum's full value list
  select coalesce(jsonb_object_agg(r.region, coalesce(c.cnt, 0)), '{}'::jsonb)
  into v_units_by_region
  from (select unnest(enum_range(null::public.region_type))::text as region) r
  left join (
    select u.region::text as region, count(*) as cnt
    from public.training_units u
    where v_filter is null or u.unit_id = v_filter
    group by u.region
  ) c on c.region = r.region;

  select coalesce(jsonb_object_agg(t.type, coalesce(c.cnt, 0)), '{}'::jsonb)
  into v_units_by_type
  from (select unnest(enum_range(null::public.unit_type))::text as type) t
  left join (
    select u.type::text as type, count(*) as cnt
    from public.training_units u
    where v_filter is null or u.unit_id = v_filter
    group by u.type
  ) c on c.type = t.type;

  -- ----- learner counts (suppressed for executive) -----
  select count(*) into v_total_learners
  from public.learners l
  where v_filter is null or l.unit_id = v_filter;
  if v_exec and v_total_learners > 0 and v_total_learners < v_t then v_total_learners := null; end if;

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

  -- ----- certification headcounts (distinct people who passed) -----
  select count(distinct ar.learner_id) into v_cert_anamai_contact
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'anamai_food_contact' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter);

  select count(distinct ar.learner_id) into v_cert_professional_q
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'professional_qualification' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter);

  select count(distinct ar.learner_id) into v_cert_dsd_l1
  from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
  where ar.standard_type = 'dsd_l1' and ar.result = 'passed'
    and (v_filter is null or l.unit_id = v_filter);

  -- ----- learning status (distinct people) -----
  select count(distinct l.learner_id) into v_status_completed
  from public.learners l join public.enrollments e on e.learner_id = l.learner_id
  where e.status = 'completed' and (v_filter is null or l.unit_id = v_filter);

  select count(distinct l.learner_id) into v_status_in_progress
  from public.learners l join public.enrollments e on e.learner_id = l.learner_id
  where e.status = 'attending' and (v_filter is null or l.unit_id = v_filter);

  if v_exec then
    if v_cert_anamai_contact > 0 and v_cert_anamai_contact < v_t then v_cert_anamai_contact := null; end if;
    if v_cert_professional_q > 0 and v_cert_professional_q < v_t then v_cert_professional_q := null; end if;
    if v_cert_dsd_l1 > 0 and v_cert_dsd_l1 < v_t then v_cert_dsd_l1 := null; end if;
    if v_status_completed > 0 and v_status_completed < v_t then v_status_completed := null; end if;
    if v_status_in_progress > 0 and v_status_in_progress < v_t then v_status_in_progress := null; end if;
  end if;

  -- ----- map pins (units that have coordinates; locations are not PII) -----
  select coalesce(jsonb_agg(jsonb_build_object(
           'unit_id', u.unit_id,
           'name', u.name,
           'region', u.region::text,
           'type', u.type::text,
           'lat', p.latitude,
           'lng', p.longitude
         )), '[]'::jsonb)
  into v_pins
  from public.training_units u
  join public.training_unit_profiles p on p.unit_id = u.unit_id
  where p.latitude is not null and p.longitude is not null
    and (v_filter is null or u.unit_id = v_filter);

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
    'pins', v_pins
  );
end;
$$;

grant execute on function public.get_dashboard_overview to authenticated;
