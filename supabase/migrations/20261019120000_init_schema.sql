-- M2: core schema per docs/planning/05-data-architecture.md
-- Roles/auth identity lives in auth.users (Supabase Auth); public.profiles holds
-- app-level role/unit_scope. profiles.unit_scope -> training_units FK is added
-- after training_units exists (circular dependency), see bottom of this file.

create extension if not exists pgcrypto;

create type user_role as enum ('web_master', 'central_staff', 'unit_coordinator', 'executive');
create type unit_type as enum ('มหาวิทยาลัย', 'สถาบันอาชีวะ', 'อื่นๆ');
create type region_type as enum ('ภาคเหนือ', 'ภาคตะวันออก', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคใต้');
create type unit_status as enum ('active', 'inactive');
create type enrollment_status as enum ('สมัคร', 'เข้าร่วม', 'สำเร็จ', 'ไม่สำเร็จ');
create type assessment_standard as enum ('DSD-L1', 'กรมอนามัย-ผู้ประกอบอาหาร', 'กรมอนามัย-ผู้สัมผัสอาหาร', 'คุณวุฒิวิชาชีพ', 'อื่นๆ');
create type assessment_result_enum as enum ('ได้', 'ไม่ได้', 'รอผล');
create type testing_center_status_enum as enum ('ยังไม่ขึ้นทะเบียน', 'อยู่ระหว่างขอ', 'ได้รับแล้ว');
create type import_job_status as enum ('pending', 'processing', 'completed', 'failed');
create type learner_source as enum ('unit_self_entry', 'unit_import_file');

create table public.provinces (
  province_id text primary key,
  name text not null
);

create table public.districts (
  district_id text primary key,
  province_id text not null references public.provinces(province_id),
  name text not null
);

create table public.subdistricts (
  subdistrict_id text primary key,
  district_id text not null references public.districts(district_id),
  name text not null,
  postal_code text
);

-- unit_scope FK to training_units added below once that table exists
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  unit_scope uuid,
  display_name text,
  must_change_password boolean not null default true,
  mfa_enabled boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.training_units (
  unit_id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  external_ref text,
  name text not null unique,
  type unit_type not null,
  region region_type not null,
  status unit_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_unit_scope_fkey foreign key (unit_scope) references public.training_units(unit_id);

-- 1 training_unit = 1 user that created it; 1 unit_coordinator account = at most 1 unit
-- (round 10 cardinality note — NULLs allowed through freely, see docs/planning §09)
create unique index profiles_unit_coordinator_unit_scope_uniq
  on public.profiles(unit_scope)
  where role = 'unit_coordinator' and unit_scope is not null;

create table public.training_unit_profiles (
  unit_id uuid primary key references public.training_units(unit_id) on delete cascade,
  province_id text references public.provinces(province_id),
  district_id text references public.districts(district_id),
  subdistrict_id text references public.subdistricts(subdistrict_id),
  address text,
  phone text,
  email text,
  coordinator_name text,
  description text
);

create table public.training_unit_images (
  image_id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.training_units(unit_id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.courses (
  course_id uuid primary key default gen_random_uuid(),
  name text not null,
  total_hours int not null check (total_hours > 0),
  theory_hours int,
  practical_hours int,
  description text,
  source_doc_ref text,
  created_at timestamptz not null default now()
);

create table public.classes (
  class_id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(course_id),
  unit_id uuid not null references public.training_units(unit_id),
  start_date date not null,
  end_date date not null,
  seat_count int not null check (seat_count > 0),
  external_ref text,
  created_at timestamptz not null default now(),
  check (start_date <= end_date)
);

create table public.instructors (
  instructor_id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  unique (phone, email)
);

create table public.class_instructors (
  class_id uuid references public.classes(class_id) on delete cascade,
  instructor_id uuid references public.instructors(instructor_id) on delete cascade,
  role_in_class text,
  primary key (class_id, instructor_id)
);

-- national_id is encrypted at rest (app layer encrypts before insert); national_id_hash
-- is a deterministic SHA-256 used as the unique/lookup key so exact-match queries and the
-- Eligibility Check function never need to decrypt. See docs/planning/05-data-architecture.md §2.
create table public.learners (
  learner_id uuid primary key default gen_random_uuid(),
  external_ref text,
  first_name text not null,
  last_name text not null,
  national_id_encrypted bytea not null,
  national_id_hash text not null unique,
  phone text,
  email text,
  province_id text references public.provinces(province_id),
  district_id text references public.districts(district_id),
  subdistrict_id text references public.subdistricts(subdistrict_id),
  address text,
  source learner_source not null,
  created_by uuid not null references public.profiles(id),
  unit_id uuid not null references public.training_units(unit_id),
  created_at timestamptz not null default now()
);

create table public.enrollments (
  enrollment_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(learner_id),
  class_id uuid not null references public.classes(class_id),
  status enrollment_status not null default 'สมัคร',
  applied_at timestamptz not null default now(),
  unique (learner_id, class_id)
);

create table public.certification_records (
  certification_id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(enrollment_id),
  certified_at timestamptz,
  certificate_ref text
);

create table public.assessment_results (
  result_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(learner_id),
  standard_type assessment_standard not null,
  result assessment_result_enum not null,
  tested_at timestamptz,
  evidence_ref text,
  confirmed_by uuid references public.profiles(id)
);

create table public.testing_center_statuses (
  unit_id uuid not null references public.training_units(unit_id),
  standard_type assessment_standard not null,
  status testing_center_status_enum not null,
  evidence_ref text,
  updated_at timestamptz not null default now(),
  primary key (unit_id, standard_type)
);

create table public.import_jobs (
  job_id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references public.profiles(id),
  file_name text not null,
  total_rows int,
  passed_rows int,
  failed_rows int,
  status import_job_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.import_errors (
  error_id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(job_id) on delete cascade,
  row_number int not null,
  column_name text,
  reason text not null
);

-- No PII before/after values on purpose — only "what changed" (docs/planning §09 enforcement #9)
create table public.audit_log (
  log_id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  record_id text,
  changed_fields text[],
  occurred_at timestamptz not null default now()
);
