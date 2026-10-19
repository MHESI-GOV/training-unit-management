-- M5: brings training_unit_images up to the fuller field list in
-- docs/planning/10-image-storage-options.md §2 (the earlier M2 migration only had the
-- minimal version from 05-data-architecture.md), plus the Supabase Storage bucket + RLS.

create type image_visibility as enum ('public', 'internal');
create type image_status as enum ('active', 'deleted');

alter table public.training_unit_images
  rename column storage_path to storage_key;
alter table public.training_unit_images
  add column original_filename text,
  add column mime_type text,
  add column file_size int,
  add column width int,
  add column height int,
  add column description text,
  add column display_order int not null default 0,
  add column visibility image_visibility not null default 'internal',
  add column status image_status not null default 'active';

-- Cap counts only live images — a soft-deleted photo shouldn't block a replacement upload
create or replace function public.enforce_max_unit_images()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.training_unit_images
    where unit_id = new.unit_id and status = 'active'
  ) >= 6 then
    raise exception 'max 6 images per training unit' using errcode = '23514';
  end if;
  return new;
end;
$$;

insert into storage.buckets (id, name, public)
values ('unit-photos', 'unit-photos', false)
on conflict (id) do nothing;

-- Storage path convention: <unit_id>/<filename> — (storage.foldername(name))[1] is the unit_id,
-- so this mirrors the unit_coordinator scoping used on every other unit-scoped table.
create policy "unit_photos_select" on storage.objects
  for select using (
    bucket_id = 'unit-photos' and (
      public.current_user_role() in ('web_master', 'central_staff')
      or (
        public.current_user_role() = 'unit_coordinator'
        and (storage.foldername(name))[1] = public.current_user_unit_scope()::text
      )
    )
  );

create policy "unit_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'unit-photos' and (
      public.current_user_role() in ('web_master', 'central_staff')
      or (
        public.current_user_role() = 'unit_coordinator'
        and (storage.foldername(name))[1] = public.current_user_unit_scope()::text
      )
    )
  );

create policy "unit_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'unit-photos' and (
      public.current_user_role() in ('web_master', 'central_staff')
      or (
        public.current_user_role() = 'unit_coordinator'
        and (storage.foldername(name))[1] = public.current_user_unit_scope()::text
      )
    )
  );
