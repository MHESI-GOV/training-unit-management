-- Coordinator-perspective onboarding/profile fields.
--
-- The unit coordinator's first login builds the unit's identity; these columns hold the richer
-- unit profile they fill in (most of it optional, completable later from the unit-profile menu).
-- Address is kept as free text (not the empty provinces/districts/subdistricts FK tables) — the
-- same decision already made for province_name (20261021110000), pre-filled best-effort from the
-- map pin's reverse-geocode but always editable by hand.
alter table public.training_unit_profiles
  add column if not exists house_no text,               -- เลขที่
  add column if not exists road text,                   -- ถนน
  add column if not exists district_name text,          -- อำเภอ/เขต (free text, parallels province_name)
  add column if not exists subdistrict_name text,       -- ตำบล/แขวง
  add column if not exists coordinator_first_name text,  -- ผู้ประสานงาน: ชื่อ
  add column if not exists coordinator_last_name text,   -- ผู้ประสานงาน: สกุล
  -- Self-declared "is this unit a DSD food-trade skill-standard testing center?" (เป็น/ไม่เป็น),
  -- collected at onboarding. This is the coarse unit attribute; the per-standard, 3-state
  -- testing_center_statuses table remains the detailed formal record (/unit/testing-center).
  add column if not exists is_food_testing_center boolean;

-- coordinator_name (the pre-existing single column, read by /admin/units) is kept as the combined
-- "first last" display string; the app writes it from the split parts so that page keeps working.

comment on column public.training_unit_profiles.is_food_testing_center is
  'Self-declared DSD food-trade testing-center status (เป็น/ไม่เป็น) from onboarding; detailed per-standard tracking lives in testing_center_statuses.';
