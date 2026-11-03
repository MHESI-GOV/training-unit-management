-- Unit photo gallery (2026-11-03): photos get an explicit order (first = cover on the unit list and
-- the map), and the map card can slide through all of a unit's photos.
--
-- Every existing row has display_order 0, which left the cover up to whatever order Postgres returned
-- them in. Backfill from upload order, so the first photo uploaded is the cover until someone reorders.
update public.training_unit_images i
set display_order = ranked.position
from (
  select image_id, row_number() over (partition by unit_id order by created_at) - 1 as position
  from public.training_unit_images
  where status = 'active'
) ranked
where i.image_id = ranked.image_id;

-- Adds image_ids (ordered); has_image stays so a deployed client that predates this keeps working.
-- Still no storage paths: the bytes are served by /api/unit-photo/[unitId]?image=<image_id>.
create or replace function public.get_unit_map_cards()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(
      u.unit_id,
      jsonb_build_object(
        'coordinator_name', p.coordinator_name,
        'phone', p.phone,
        'has_image', exists (
          select 1 from public.training_unit_images i
          where i.unit_id = u.unit_id and coalesce(i.status, 'active') <> 'deleted'
        ),
        'image_ids', coalesce((
          select jsonb_agg(i.image_id order by i.display_order, i.created_at)
          from public.training_unit_images i
          where i.unit_id = u.unit_id and coalesce(i.status, 'active') <> 'deleted'
        ), '[]'::jsonb)
      )
    ),
    '{}'::jsonb
  )
  from public.training_units u
  left join public.training_unit_profiles p on p.unit_id = u.unit_id;
$$;

grant execute on function public.get_unit_map_cards() to anon, authenticated;
