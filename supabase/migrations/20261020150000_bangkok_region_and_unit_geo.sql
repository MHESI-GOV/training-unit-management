-- Dashboard expansion (2026-10-20):
--  1) Add 'bangkok' (กรุงเทพมหานคร) as a 6th region. Until now Bangkok units fell under
--     'central'; the dashboard needs it broken out, and new units can now be classified as
--     Bangkok directly at creation. ADD VALUE is safe inside a migration transaction as long as
--     the new label is not *used* in the same transaction -- it is only referenced at runtime.
--  2) Add latitude/longitude to training_unit_profiles so each unit can be pinned on a map.
--     Captured via a search + map pin-drop at unit creation (see /unit-setup). NULL until set.
alter type region_type add value if not exists 'bangkok';

alter table public.training_unit_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
