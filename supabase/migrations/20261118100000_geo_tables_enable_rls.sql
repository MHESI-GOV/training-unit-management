-- Supabase security advisor (rls_disabled_in_public): provinces / districts / subdistricts were
-- created in init_schema without RLS, so anyone holding the public anon key could read, insert,
-- update or delete rows through the REST API.
--
-- These tables are empty and unused by the app (addresses are free text since
-- 20261021110000_unit_province_name / 20261021120000_unit_profile_fields). Enabling RLS with no
-- policies denies anon/authenticated entirely; the service role still bypasses RLS, and FK checks
-- are unaffected. If the app ever reads them, add a SELECT-only policy then.

alter table public.provinces enable row level security;
alter table public.districts enable row level security;
alter table public.subdistricts enable row level security;
