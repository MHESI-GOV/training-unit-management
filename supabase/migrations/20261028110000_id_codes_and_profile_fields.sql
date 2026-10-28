-- New fields + the stable serial numbers that back the human-readable ID-code system (2026-10-28).
--
-- Scope of this migration:
--   1) Two shared enums: gender_type, instructor_tester_status.
--   2) Instructor profile: split name -> first_name/last_name (keep `name` as a generated column so
--      every existing instructors(name) query keeps working), + gender, affiliation, tester_status.
--   3) Learner profile: + gender, occupation.
--   4) Stable serial numbers used to DERIVE the display codes in the app layer
--      (src/lib/id-codes.ts): training_units.unit_seq (global), courses.course_seq (global),
--      instructors.instructor_seq (per unit), learners.learner_seq (per unit). Classes already have
--      batch_code (per-unit R001). Codes themselves are NOT stored — they are composed at read time
--      from these serials + the unit's current region/province, so editing a unit's province updates
--      every child code consistently and no composite string can ever go stale.
--
-- The serials are filled by BEFORE INSERT triggers so they are assigned no matter which path inserts
-- (single form, CSV import, or the submit_training_unit RPC) — no action code needs to know about them.
-- Enum labels stay ascii (Postgres 63-byte label cap); Thai display text lives in the app layer.

-- ── 1) Enums ───────────────────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type gender_type as enum ('male', 'female', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'instructor_tester_status') then
    create type instructor_tester_status as enum ('none', 'level_1', 'level_2');
  end if;
end $$;

-- ── 2) Instructors: name split + new profile fields ──────────────────────────────────────────────
alter table public.instructors
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists gender gender_type,
  add column if not exists affiliation text,
  add column if not exists tester_status instructor_tester_status not null default 'none',
  add column if not exists instructor_seq int,
  add column if not exists created_at timestamptz not null default now();

-- Backfill first/last from the old single `name` (split on the first space; no space -> all first).
update public.instructors
set first_name = case when position(' ' in name) > 0 then split_part(name, ' ', 1) else name end,
    last_name  = case when position(' ' in name) > 0 then btrim(substring(name from position(' ' in name) + 1)) else '' end
where first_name is null;

alter table public.instructors alter column first_name set not null;
alter table public.instructors alter column last_name set default '';
update public.instructors set last_name = '' where last_name is null;
alter table public.instructors alter column last_name set not null;

-- Replace the plain `name` column with a generated one so existing reads keep working unchanged.
alter table public.instructors drop column name;
alter table public.instructors
  add column name text generated always as (btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) stored;

-- ── 3) Learners: gender + occupation ─────────────────────────────────────────────────────────────
alter table public.learners
  add column if not exists gender gender_type,
  add column if not exists occupation text,
  add column if not exists learner_seq int;

-- ── 4) Serials + unique constraints + backfill ───────────────────────────────────────────────────
alter table public.training_units add column if not exists unit_seq int;
alter table public.courses add column if not exists course_seq int;

-- training_units.unit_seq: global, ordered by creation.
with n as (
  select unit_id, row_number() over (order by created_at, unit_id) as rn
  from public.training_units
)
update public.training_units u set unit_seq = n.rn from n
where n.unit_id = u.unit_id and u.unit_seq is null;

-- courses.course_seq: global, ordered by creation.
with n as (
  select course_id, row_number() over (order by created_at, course_id) as rn
  from public.courses
)
update public.courses c set course_seq = n.rn from n
where n.course_id = c.course_id and c.course_seq is null;

-- instructors.instructor_seq: per unit, ordered by creation then id.
with n as (
  select instructor_id,
         row_number() over (partition by unit_id order by created_at, instructor_id) as rn
  from public.instructors
)
update public.instructors i set instructor_seq = n.rn from n
where n.instructor_id = i.instructor_id and i.instructor_seq is null;

-- learners.learner_seq: per unit, ordered by creation.
with n as (
  select learner_id,
         row_number() over (partition by unit_id order by created_at, learner_id) as rn
  from public.learners
)
update public.learners l set learner_seq = n.rn from n
where n.learner_id = l.learner_id and l.learner_seq is null;

create unique index if not exists training_units_seq_key on public.training_units (unit_seq);
create unique index if not exists courses_seq_key on public.courses (course_seq);
create unique index if not exists instructors_unit_seq_key on public.instructors (unit_id, instructor_seq);
create unique index if not exists learners_unit_seq_key on public.learners (unit_id, learner_seq);

-- ── Triggers that assign a serial on insert when one was not supplied ─────────────────────────────
create or replace function public.set_unit_seq() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.unit_seq is null then
    select coalesce(max(unit_seq), 0) + 1 into new.unit_seq from public.training_units;
  end if;
  return new;
end $$;

create or replace function public.set_course_seq() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.course_seq is null then
    select coalesce(max(course_seq), 0) + 1 into new.course_seq from public.courses;
  end if;
  return new;
end $$;

create or replace function public.set_instructor_seq() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.instructor_seq is null then
    select coalesce(max(instructor_seq), 0) + 1 into new.instructor_seq
    from public.instructors where unit_id is not distinct from new.unit_id;
  end if;
  return new;
end $$;

create or replace function public.set_learner_seq() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.learner_seq is null then
    select coalesce(max(learner_seq), 0) + 1 into new.learner_seq
    from public.learners where unit_id is not distinct from new.unit_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_set_unit_seq on public.training_units;
create trigger trg_set_unit_seq before insert on public.training_units
  for each row execute function public.set_unit_seq();

drop trigger if exists trg_set_course_seq on public.courses;
create trigger trg_set_course_seq before insert on public.courses
  for each row execute function public.set_course_seq();

drop trigger if exists trg_set_instructor_seq on public.instructors;
create trigger trg_set_instructor_seq before insert on public.instructors
  for each row execute function public.set_instructor_seq();

drop trigger if exists trg_set_learner_seq on public.learners;
create trigger trg_set_learner_seq before insert on public.learners
  for each row execute function public.set_learner_seq();

comment on column public.training_units.unit_seq is 'Stable global serial; display code (REGION-PROVINCE-serial) composed in src/lib/id-codes.ts';
comment on column public.instructors.instructor_seq is 'Stable per-unit serial; teacher code = <unit_code>-T<seq>';
comment on column public.learners.learner_seq is 'Stable per-unit serial; student code = <unit_code>-S<seq>';
comment on column public.courses.course_seq is 'Stable global serial; program code = PG-<seq>';
