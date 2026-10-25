-- Add fiscal-year participation ("active unit") counts to get_dashboard_overview() so the main
-- dashboard + public Home overview tiles can show how many units confirmed participation in the
-- most recent participation round, instead of that number only living on /admin/participation.
--
-- "Active in FY X" = a unit with a 'confirmed' row in the round opened for FY X (see
-- 20261023100000_participation_rounds.sql). The overview picks the MOST RECENT round (max
-- fiscal_year that has a round) and reports its confirmed/total counts; null when no round exists
-- yet. Participation is unit-level org data (no PII), so it is returned for every role / the
-- anonymous public view without suppression — same as total_units. It is still filter-aware
-- (v_filter) so a single-unit view shows that one unit's own confirmed/total (0/1 or 1/1).
--
-- Everything else is identical to 20261021110000_unit_province_name.sql.
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

  select count(*) into v_total_units
  from public.training_units u
  where v_filter is null or u.unit_id = v_filter;

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

  -- Most recent participation round (by fiscal year). Null-safe: no rounds yet -> all null/0.
  select pr.fiscal_year, (pr.status = 'open')
  into v_part_fy, v_part_open
  from public.participation_rounds pr
  order by pr.fiscal_year desc
  limit 1;

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

  select coalesce(jsonb_agg(jsonb_build_object(
           'unit_id', u.unit_id, 'name', u.name, 'region', u.region::text,
           'type', u.type::text, 'province', p.province_name,
           'lat', p.latitude, 'lng', p.longitude
         )), '[]'::jsonb)
  into v_pins
  from public.training_units u
  join public.training_unit_profiles p on p.unit_id = u.unit_id
  where p.latitude is not null and p.longitude is not null
    and (v_filter is null or u.unit_id = v_filter);

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_latest_units
  from (
    select jsonb_build_object(
             'unit_id', u.unit_id, 'name', u.name, 'region', u.region::text,
             'type', u.type::text, 'status', u.status::text
           ) as x
    from public.training_units u
    where v_filter is null or u.unit_id = v_filter
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

grant execute on function public.get_dashboard_overview to anon, authenticated;
