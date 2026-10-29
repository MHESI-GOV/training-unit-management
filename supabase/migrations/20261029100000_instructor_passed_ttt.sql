-- Add "ผ่านการอบรม Train the Trainer (ผ่าน/ไม่ผ่าน)" flag to instructors (2026-10-29).
--
-- Distinct from the existing instructors.tester_status (none/level_1/level_2 = DSD food-trade
-- skill-standard *tester* certification). This is a separate, coarse pass/fail flag for whether
-- the instructor has completed the project's Train-the-Trainer program. Boolean, default false
-- (= ยังไม่ผ่าน) so existing rows get a sensible value without a backfill.
alter table public.instructors
  add column if not exists passed_ttt boolean not null default false;

comment on column public.instructors.passed_ttt is
  'ผ่านการอบรม Train the Trainer หรือไม่ (true=ผ่าน, false=ยังไม่ผ่าน) — แยกจาก tester_status (สถานะผู้ทดสอบมาตรฐานฝีมือ)';
