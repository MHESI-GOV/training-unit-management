-- Hotel-style map cards (2026-10-29): the dashboard map pin hover-card needs the unit's coordinator
-- name, contact phone, and whether it has a photo — alongside the pin data that already comes from
-- get_dashboard_overview. These are static per-unit attributes (independent of year/region filter),
-- so the map fetches them ONCE as a lookup keyed by unit_id and joins client-side, rather than
-- bloating every pin in the overview RPC.
--
-- SECURITY DEFINER so the PUBLIC home map (anon) can read them too. Returns ONLY unit-level contact
-- info + a has_image flag — no learner data, no storage paths. The photo bytes themselves are served
-- separately by /api/unit-photo/[unitId].
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
        )
      )
    ),
    '{}'::jsonb
  )
  from public.training_units u
  left join public.training_unit_profiles p on p.unit_id = u.unit_id;
$$;

grant execute on function public.get_unit_map_cards() to anon, authenticated;
