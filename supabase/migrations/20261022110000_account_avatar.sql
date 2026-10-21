-- Account profile picture (2026-10-22). Each user can upload/replace their own avatar.
alter table public.profiles add column if not exists avatar_path text;

-- Private bucket for avatars; files are served via short-lived signed URLs, same as unit-photos.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Owner-scoped storage RLS: a user can only read/write objects under a folder named after their
-- own uid ( path shape: "<uid>/<uuid>.<ext>" ). profiles.avatar_path itself is still updated by
-- the server action via the service-role client, since profiles_update is Web-Master-only.
create policy "avatars_select_own" on storage.objects
  for select using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
