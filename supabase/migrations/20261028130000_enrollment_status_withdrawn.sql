-- Add a 'withdrawn' (ถอนตัว) enrollment status (2026-10-28). A withdrawn learner stays in the
-- unit's records but no longer occupies a seat in the class. This MUST be its own migration: a new
-- enum value cannot be USED in the same transaction that adds it, and the function changes in
-- 20261028140000 reference 'withdrawn'.
alter type public.enrollment_status add value if not exists 'withdrawn';
