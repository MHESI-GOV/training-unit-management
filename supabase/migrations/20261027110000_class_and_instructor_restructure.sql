-- Restructure for the class-centric + per-unit-instructor-library model (2026-10-27):
--   * instructors become a per-unit "library" (add unit_id, scope RLS by unit)
--   * classes gain descriptive fields (auto batch_code, name, schedule time, lead instructor,
--     mode, location, status, note)
-- Thai display text stays in the app layer; stored codes are ascii (per the enum-byte-limit gotcha).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Instructors → per-unit library
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.instructors
  add column if not exists unit_id uuid references public.training_units(unit_id);

-- Backfill unit_id from whatever class the instructor is currently attached to.
update public.instructors i
set unit_id = sub.unit_id
from (
  select ci.instructor_id, min(c.unit_id::text)::uuid as unit_id
  from public.class_instructors ci
  join public.classes c on c.class_id = ci.class_id
  group by ci.instructor_id
) sub
where sub.instructor_id = i.instructor_id
  and i.unit_id is null;

-- Dedup key is now per unit (the same person can exist in two different units' libraries).
alter table public.instructors drop constraint if exists instructors_phone_email_key;
create unique index if not exists instructors_unit_phone_email_key
  on public.instructors (unit_id, phone, email);

-- RLS: coordinators see/write only their own unit's instructors; staff see all.
drop policy if exists "instructors_select" on public.instructors;
drop policy if exists "instructors_write" on public.instructors;
create policy "instructors_select" on public.instructors for select using (
  public.current_user_role() in ('web_master', 'central_staff')
  or unit_id = public.current_user_unit_scope()
);
create policy "instructors_write" on public.instructors for all using (
  public.current_user_role() in ('web_master', 'central_staff')
  or unit_id = public.current_user_unit_scope()
) with check (
  public.current_user_role() in ('web_master', 'central_staff')
  or unit_id = public.current_user_unit_scope()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Classes → descriptive fields
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.classes
  add column if not exists batch_code text,
  add column if not exists name text,
  add column if not exists schedule_time text,
  add column if not exists lead_instructor_id uuid references public.instructors(instructor_id),
  add column if not exists mode text,          -- ascii: onsite | online | hybrid
  add column if not exists location text,
  add column if not exists status text not null default 'planned', -- planned|open|ongoing|completed|cancelled
  add column if not exists note text;

-- Backfill a sequential batch_code per unit for existing rows (R001, R002, …).
with numbered as (
  select class_id,
         'R' || lpad(row_number() over (partition by unit_id order by created_at, class_id)::text, 3, '0') as code
  from public.classes
  where batch_code is null
)
update public.classes c
set batch_code = numbered.code
from numbered
where numbered.class_id = c.class_id;

create unique index if not exists classes_unit_batch_code_key
  on public.classes (unit_id, batch_code);

comment on column public.classes.batch_code is 'รหัสรุ่น (ระบบสร้างอัตโนมัติต่อหน่วย เช่น R001) — unique ภายในหน่วย';
comment on column public.classes.status is 'สถานะรุ่น ascii: planned|open|ongoing|completed|cancelled';
comment on column public.classes.mode is 'รูปแบบการเรียน ascii: onsite|online|hybrid';
