-- RLS per docs/planning/09-security-privacy-plan.md §2-3.
-- Pattern: Web Master + Central Staff = unrestricted on data (not on the 3 Web-Master-only
-- carve-outs: User Management, Audit Log, Generate User — enforced at the API layer, not here).
-- Unit Coordinator = restricted to own unit_scope. Executive = read-only, non-PII tables only.
-- No direct INSERT policy on training_units: creation only happens through
-- submit_training_unit() (see 20261019120300_functions.sql), which runs SECURITY DEFINER.

alter table public.profiles enable row level security;
alter table public.training_units enable row level security;
alter table public.training_unit_profiles enable row level security;
alter table public.training_unit_images enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.instructors enable row level security;
alter table public.class_instructors enable row level security;
alter table public.learners enable row level security;
alter table public.enrollments enable row level security;
alter table public.certification_records enable row level security;
alter table public.assessment_results enable row level security;
alter table public.testing_center_statuses enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_errors enable row level security;
alter table public.audit_log enable row level security;

-- profiles: everyone sees their own row; only Web Master sees/manages the rest
-- (User Management is a Web-Master-only carve-out per §2) — column-level changes
-- to role/unit_scope happen only through generate_user()/submit_training_unit(),
-- never a generic client-side UPDATE.
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'web_master');

create policy "profiles_update_webmaster" on public.profiles
  for update using (public.current_user_role() = 'web_master');

-- training_units
create policy "training_units_select" on public.training_units
  for select using (
    public.current_user_role() in ('web_master', 'central_staff', 'executive')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "training_units_update" on public.training_units
  for update using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- training_unit_profiles
create policy "unit_profiles_select" on public.training_unit_profiles
  for select using (
    public.current_user_role() in ('web_master', 'central_staff', 'executive')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "unit_profiles_upsert" on public.training_unit_profiles
  for insert with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "unit_profiles_update" on public.training_unit_profiles
  for update using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- training_unit_images (6/unit cap enforced by trigger, not RLS)
create policy "unit_images_select" on public.training_unit_images
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "unit_images_insert" on public.training_unit_images
  for insert with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "unit_images_delete" on public.training_unit_images
  for delete using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- courses: shared catalog, no unit scoping
create policy "courses_select" on public.courses for select using (true);
create policy "courses_write" on public.courses for all using (
  public.current_user_role() in ('web_master', 'central_staff', 'unit_coordinator')
) with check (
  public.current_user_role() in ('web_master', 'central_staff', 'unit_coordinator')
);

-- classes
create policy "classes_select" on public.classes
  for select using (
    public.current_user_role() in ('web_master', 'central_staff', 'executive')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "classes_insert" on public.classes
  for insert with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "classes_update" on public.classes
  for update using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- instructors / class_instructors: scoped indirectly through the class they're attached to
create policy "instructors_select" on public.instructors for select using (
  public.current_user_role() in ('web_master', 'central_staff', 'unit_coordinator')
);
create policy "instructors_write" on public.instructors for all using (
  public.current_user_role() in ('web_master', 'central_staff', 'unit_coordinator')
) with check (
  public.current_user_role() in ('web_master', 'central_staff', 'unit_coordinator')
);

create policy "class_instructors_select" on public.class_instructors
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.classes c
      where c.class_id = class_instructors.class_id
        and c.unit_id = public.current_user_unit_scope()
    )
  );

create policy "class_instructors_write" on public.class_instructors
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.classes c
      where c.class_id = class_instructors.class_id
        and c.unit_id = public.current_user_unit_scope()
    )
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.classes c
      where c.class_id = class_instructors.class_id
        and c.unit_id = public.current_user_unit_scope()
    )
  );

-- learners: highest-PII table. Executive gets no policy at all (default-deny = correct here).
create policy "learners_select" on public.learners
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "learners_insert" on public.learners
  for insert with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "learners_update" on public.learners
  for update using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- enrollments (scoped via the learner's unit_id — a learner only ever belongs to the unit
-- that created them, per §FR data model, so this join is equivalent to a direct unit_id check)
create policy "enrollments_select" on public.enrollments
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = enrollments.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "enrollments_write" on public.enrollments
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = enrollments.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = enrollments.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "certification_records_select" on public.certification_records
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.enrollments e
      join public.learners l on l.learner_id = e.learner_id
      where e.enrollment_id = certification_records.enrollment_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "certification_records_write" on public.certification_records
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.enrollments e
      join public.learners l on l.learner_id = e.learner_id
      where e.enrollment_id = certification_records.enrollment_id
        and l.unit_id = public.current_user_unit_scope()
    )
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.enrollments e
      join public.learners l on l.learner_id = e.learner_id
      where e.enrollment_id = certification_records.enrollment_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "assessment_results_select" on public.assessment_results
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = assessment_results.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "assessment_results_write" on public.assessment_results
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = assessment_results.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.learners l
      where l.learner_id = assessment_results.learner_id
        and l.unit_id = public.current_user_unit_scope()
    )
  );

create policy "testing_center_statuses_select" on public.testing_center_statuses
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

create policy "testing_center_statuses_write" on public.testing_center_statuses
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- import_jobs / import_errors: self-approve model — Unit Coordinator sees/acts on their own jobs
create policy "import_jobs_select" on public.import_jobs
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or uploaded_by = auth.uid()
  );

create policy "import_jobs_write" on public.import_jobs
  for all using (
    public.current_user_role() in ('web_master', 'central_staff')
    or uploaded_by = auth.uid()
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or uploaded_by = auth.uid()
  );

create policy "import_errors_select" on public.import_errors
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.import_jobs j
      where j.job_id = import_errors.job_id and j.uploaded_by = auth.uid()
    )
  );

-- audit_log: Web Master only reads (not even Central Staff sees their own actions, §3 enforcement #6)
create policy "audit_log_select" on public.audit_log
  for select using (public.current_user_role() = 'web_master');

create policy "audit_log_insert" on public.audit_log
  for insert with check (actor_user_id = auth.uid() or actor_user_id is null);
