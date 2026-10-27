-- Add birth_date to learners so the app can compute and display อายุ (age).
-- Nullable: existing rows have no birth date; the UI shows "—" for them and
-- derives age client/server-side (full years as of today), never storing age itself.

alter table public.learners
  add column if not exists birth_date date;

comment on column public.learners.birth_date is
  'วันเกิดของผู้เรียน (ใช้คำนวณอายุ ณ วันที่แสดงผล) — nullable สำหรับข้อมูลเดิมที่ยังไม่ได้กรอก';
