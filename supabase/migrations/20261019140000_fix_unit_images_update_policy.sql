-- Missed in the original M2 RLS pass — training_unit_images had select/insert/delete
-- policies but no update policy, so the M5 soft-delete (status='deleted') silently
-- affected 0 rows instead of erroring, which is how this got caught.
create policy "unit_images_update" on public.training_unit_images
  for update using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  ) with check (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );
