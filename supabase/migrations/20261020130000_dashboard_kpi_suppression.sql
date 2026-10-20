-- ST-4 (docs/planning/09-security-privacy-plan.md §6): Executive must never be able to infer
-- a specific learner's identity/outcome by narrowing a KPI down to a very small group. Applies
-- cell suppression (threshold 5, standard disclosure-control convention) to every people-count
-- KPI, executive role only -- enforced here at the DB function itself (same SECURITY DEFINER
-- boundary M9 already relies on), not in the Next.js page, so calling the RPC directly can't
-- bypass it either. NULL is the "suppressed" sentinel; the app renders it as a privacy notice
-- rather than attempting to show/compute a percentage from it.
--
-- units_with_data/total_units are organizational counts, not about an identifiable person, so
-- they're deliberately left unsuppressed.
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
  v_threshold constant bigint := 5;
  v_applicants bigint;
  v_attended bigint;
  v_completed bigint;
  v_anamai_tested bigint;
  v_anamai_passed bigint;
  v_dsd_tested bigint;
  v_dsd_passed bigint;
  v_dsd_centers bigint;
  v_pq_centers bigint;
  v_units_with_data bigint;
  v_total_units bigint;
begin
  select role, unit_scope into v_role, v_own_unit from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_role = 'unit_coordinator' then
    v_filter_unit := v_own_unit;
  elsif v_role = 'executive' then
    v_filter_unit := null;
  else
    v_filter_unit := p_unit_id;
  end if;

  select count(distinct l.learner_id) into v_applicants from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    where v_filter_unit is null or l.unit_id = v_filter_unit;

  select count(distinct l.learner_id) into v_attended from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    where e.status <> 'applied' and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(distinct l.learner_id) into v_completed from public.learners l
    join public.enrollments e on e.learner_id = l.learner_id
    join public.certification_records cr on cr.enrollment_id = e.enrollment_id
    where cr.certified_at is not null and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(*) into v_anamai_tested from public.assessment_results ar
    join public.learners l on l.learner_id = ar.learner_id
    where ar.standard_type in ('anamai_food_handler','anamai_food_contact') and ar.result <> 'pending'
      and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(*) into v_anamai_passed from public.assessment_results ar
    join public.learners l on l.learner_id = ar.learner_id
    where ar.standard_type in ('anamai_food_handler','anamai_food_contact') and ar.result = 'passed'
      and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(*) into v_dsd_tested from public.assessment_results ar
    join public.learners l on l.learner_id = ar.learner_id
    where ar.standard_type = 'dsd_l1' and ar.result <> 'pending'
      and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(*) into v_dsd_passed from public.assessment_results ar
    join public.learners l on l.learner_id = ar.learner_id
    where ar.standard_type = 'dsd_l1' and ar.result = 'passed'
      and (v_filter_unit is null or l.unit_id = v_filter_unit);

  select count(*) into v_dsd_centers from public.testing_center_statuses t
    where t.standard_type = 'dsd_l1' and t.status = 'registered'
      and (v_filter_unit is null or t.unit_id = v_filter_unit);

  select count(*) into v_pq_centers from public.testing_center_statuses t
    where t.standard_type = 'professional_qualification' and t.status = 'registered'
      and (v_filter_unit is null or t.unit_id = v_filter_unit);

  select count(distinct l.unit_id) into v_units_with_data from public.learners l
    where v_filter_unit is null or l.unit_id = v_filter_unit;

  select count(*) into v_total_units from public.training_units u
    where v_filter_unit is null or u.unit_id = v_filter_unit;

  if v_role = 'executive' then
    if v_applicants > 0 and v_applicants < v_threshold then v_applicants := null; end if;
    if v_attended > 0 and v_attended < v_threshold then v_attended := null; end if;
    if v_completed > 0 and v_completed < v_threshold then v_completed := null; end if;
    if v_dsd_centers > 0 and v_dsd_centers < v_threshold then v_dsd_centers := null; end if;
    if v_pq_centers > 0 and v_pq_centers < v_threshold then v_pq_centers := null; end if;

    -- Rate pills: suppress both the numerator and denominator together if the tested group,
    -- the passed group, or the complementary (failed) group is small enough that a specific
    -- person's result could be inferred. Each clause needs its own ">0" guard -- a zero-size
    -- complement (e.g. everyone passed, nobody failed) isn't a small identifiable group, it's
    -- an empty one, so "< threshold" alone would wrongly catch it too.
    if v_anamai_tested > 0 and (
      (v_anamai_tested > 0 and v_anamai_tested < v_threshold)
      or (v_anamai_passed > 0 and v_anamai_passed < v_threshold)
      or ((v_anamai_tested - v_anamai_passed) > 0 and (v_anamai_tested - v_anamai_passed) < v_threshold)
    ) then
      v_anamai_tested := null;
      v_anamai_passed := null;
    end if;

    if v_dsd_tested > 0 and (
      (v_dsd_tested > 0 and v_dsd_tested < v_threshold)
      or (v_dsd_passed > 0 and v_dsd_passed < v_threshold)
      or ((v_dsd_tested - v_dsd_passed) > 0 and (v_dsd_tested - v_dsd_passed) < v_threshold)
    ) then
      v_dsd_tested := null;
      v_dsd_passed := null;
    end if;
  end if;

  return query select
    v_applicants, v_attended, v_completed,
    v_anamai_tested, v_anamai_passed,
    v_dsd_tested, v_dsd_passed,
    v_dsd_centers, v_pq_centers,
    v_units_with_data, v_total_units;
end;
$$;

grant execute on function public.get_dashboard_kpis to authenticated;
