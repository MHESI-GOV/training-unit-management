-- import_errors had select but no insert policy, so commitImport()'s error-logging
-- insert (M8 import flow) would fail RLS silently (error unawaited, caller never checks it).
create policy "import_errors_insert" on public.import_errors
  for insert with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or exists (
      select 1 from public.import_jobs j
      where j.job_id = import_errors.job_id and j.uploaded_by = auth.uid()
    )
  );
