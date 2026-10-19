-- M9: get_dashboard_kpis() — the one and only way Executive (and everyone else) gets KPI
-- numbers. SECURITY DEFINER + pre-aggregated-only return columns is how Executive's "no PII,
-- no drill-down" rule (docs/planning/08-dashboard-plan.md §4) gets enforced at the DB layer
-- instead of trusted to app-layer serializer filtering alone — Executive can never query
-- learners/enrollments/assessment_results directly (no RLS policy grants them access), only
-- call this function and get counts back.
create or replace function public.get_dashboard_kpis(p_unit_id uuid default null)
returns table (
  applicants bigint,
  attended bigint,
  completed bigint,
  anamai_tested bigint,
  anamai_passed bigint,
  dsd_tested bigint,
  dsd_passed bigint,
  dsd_centers bigint,
  pq_centers bigint,
  units_with_data bigint,
  total_units bigint
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_own_unit uuid;
  v_filter_unit uuid;
begin
  select role, unit_scope into v_role, v_own_unit from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Unit Coordinator is hard-locked to their own unit regardless of what's passed in;
  -- Executive gets project-wide only (no unit-level drill-down per the dashboard plan);
  -- Web Master/Central Staff can filter by any unit, or pass null for project-wide.
  if v_role = 'unit_coordinator' then
    v_filter_unit := v_own_unit;
  elsif v_role = 'executive' then
    v_filter_unit := null;
  else
    v_filter_unit := p_unit_id;
  end if;

  return query
  select
    (select count(distinct l.learner_id) from public.learners l
       join public.enrollments e on e.learner_id = l.learner_id
       where v_filter_unit is null or l.unit_id = v_filter_unit),
    (select count(distinct l.learner_id) from public.learners l
       join public.enrollments e on e.learner_id = l.learner_id
       where e.status <> 'applied' and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(distinct l.learner_id) from public.learners l
       join public.enrollments e on e.learner_id = l.learner_id
       join public.certification_records cr on cr.enrollment_id = e.enrollment_id
       where cr.certified_at is not null and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(*) from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
       where ar.standard_type in ('anamai_food_handler','anamai_food_contact') and ar.result <> 'pending'
         and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(*) from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
       where ar.standard_type in ('anamai_food_handler','anamai_food_contact') and ar.result = 'passed'
         and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(*) from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
       where ar.standard_type = 'dsd_l1' and ar.result <> 'pending'
         and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(*) from public.assessment_results ar join public.learners l on l.learner_id = ar.learner_id
       where ar.standard_type = 'dsd_l1' and ar.result = 'passed'
         and (v_filter_unit is null or l.unit_id = v_filter_unit)),
    (select count(*) from public.testing_center_statuses t
       where t.standard_type = 'dsd_l1' and t.status = 'registered'
         and (v_filter_unit is null or t.unit_id = v_filter_unit)),
    (select count(*) from public.testing_center_statuses t
       where t.standard_type = 'professional_qualification' and t.status = 'registered'
         and (v_filter_unit is null or t.unit_id = v_filter_unit)),
    (select count(distinct l.unit_id) from public.learners l
       where v_filter_unit is null or l.unit_id = v_filter_unit),
    (select count(*) from public.training_units u
       where v_filter_unit is null or u.unit_id = v_filter_unit);
end;
$$;

grant execute on function public.get_dashboard_kpis to authenticated;
