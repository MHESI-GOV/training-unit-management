-- docs/planning/10-image-storage-options.md §3: a recurring job finds storage objects in
-- unit-photos with no record in training_unit_images, then notifies Web Master before any
-- real deletion -- never auto-delete. This table is the notification surface Web Master reads;
-- writes only ever happen through the service-role cron/manual-check routes (bypassing RLS),
-- never through a normal authenticated client.
create table public.storage_orphan_reports (
  report_id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  orphan_keys text[] not null default '{}',
  orphan_count int not null default 0
);

alter table public.storage_orphan_reports enable row level security;

create policy "storage_orphan_reports_select" on public.storage_orphan_reports
  for select using (public.current_user_role() = 'web_master');
