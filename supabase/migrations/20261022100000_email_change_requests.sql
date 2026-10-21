-- Account self-service + WM-mediated email change (2026-10-22).
-- A Unit Coordinator (or any user) can REQUEST a change to their own login email, but the
-- change is only applied by Web Master approving it (via the service-role admin client, which
-- bypasses RLS). This deliberately uses a human (WM) as the verification step instead of
-- Supabase's built-in email-confirmation link flow, so the feature does not depend on
-- Supabase's own (heavily rate-limited) auth email sender being configured.
create table public.email_change_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  current_email text not null,
  requested_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);

-- At most one pending request per user at a time (partial unique index).
create unique index email_change_requests_one_pending
  on public.email_change_requests (user_id)
  where status = 'pending';

alter table public.email_change_requests enable row level security;

-- A user sees their own requests; Web Master sees all (to action them).
create policy "ecr_select_own_or_wm" on public.email_change_requests
  for select using (user_id = auth.uid() or public.current_user_role() = 'web_master');

-- A user may only create a pending request for themselves.
create policy "ecr_insert_own" on public.email_change_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

-- A user may cancel (delete) their own still-pending request. Web Master's approve/reject
-- runs through the service-role client and so is not gated by an RLS update policy here.
create policy "ecr_delete_own_pending" on public.email_change_requests
  for delete using (user_id = auth.uid() and status = 'pending');
