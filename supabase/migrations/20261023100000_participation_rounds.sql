-- Fiscal-year participation ("รอบยืนยันการเข้าร่วมรายปีงบประมาณ").
--
-- Business need: units re-register every fiscal year. A unit is "active in FY X" ONLY if it
-- confirmed participation in the round Web Master opened for FY X. Withdrawing a unit is never a
-- delete — a non-confirmed unit simply isn't counted that year; all its historical data stays so
-- prior-year active counts remain accurate. See CLAUDE.md "Training Unit" + docs/planning.
--
-- fiscal_year is stored as the Thai BE year int (e.g. 2569 = 1 Oct 2025 – 30 Sep 2026); the DB
-- only stores the int, the app owns the Oct–Sep boundary + display.

create type participation_status as enum ('invited', 'confirmed', 'declined');
create type round_status as enum ('open', 'closed');

-- One row per fiscal year. Web Master opens it (which fans out invited rows to every unit) and
-- later closes it. Writes go only through the SECURITY DEFINER functions below, never a direct
-- client UPDATE — so there is deliberately no write RLS policy here (default-deny is correct).
create table public.participation_rounds (
  round_id uuid primary key default gen_random_uuid(),
  fiscal_year int not null unique,
  status round_status not null default 'open',
  notice_message text,
  deadline date,
  opened_by uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz
);

-- One row per (round × unit). "active in FY" = status = 'confirmed'. fiscal_year is denormalized
-- from the round (round.fiscal_year is immutable + unique) so the dashboard can count by year
-- without a join.
create table public.unit_participation (
  participation_id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.participation_rounds(round_id) on delete cascade,
  unit_id uuid not null references public.training_units(unit_id) on delete cascade,
  fiscal_year int not null,
  status participation_status not null default 'invited',
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (round_id, unit_id)
);

create index unit_participation_fy_status_idx on public.unit_participation (fiscal_year, status);
create index unit_participation_unit_idx on public.unit_participation (unit_id);

alter table public.participation_rounds enable row level security;
alter table public.unit_participation enable row level security;

-- Rounds are not sensitive (org-level): any authenticated user may read (a coordinator needs to
-- see the open round + its notice/deadline). All writes go through the functions below.
create policy "participation_rounds_select" on public.participation_rounds
  for select using (true);

-- Participation rows: staff see all; a coordinator sees only their own unit's rows. No executive
-- policy (default-deny) — the dashboard reads aggregates through get_participation_summary() only,
-- same pattern as learners. All writes go through the functions below (SECURITY DEFINER).
create policy "unit_participation_select" on public.unit_participation
  for select using (
    public.current_user_role() in ('web_master', 'central_staff')
    or (public.current_user_role() = 'unit_coordinator' and unit_id = public.current_user_unit_scope())
  );

-- open_participation_round(): Web Master opens the round for a fiscal year and fans out an
-- 'invited' row to every existing training unit. Raises if a round for that year already exists.
create or replace function public.open_participation_round(
  p_fiscal_year int,
  p_notice text default null,
  p_deadline date default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_round_id uuid;
begin
  v_role := public.current_user_role();
  if v_role is distinct from 'web_master' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.participation_rounds (fiscal_year, notice_message, deadline, opened_by)
  values (p_fiscal_year, p_notice, p_deadline, auth.uid())
  returning round_id into v_round_id;

  insert into public.unit_participation (round_id, unit_id, fiscal_year)
  select v_round_id, u.unit_id, p_fiscal_year
  from public.training_units u;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id, changed_fields)
  values (auth.uid(), 'open_participation_round', 'participation_round', v_round_id::text,
          array[p_fiscal_year::text]);

  return v_round_id;
end;
$$;

grant execute on function public.open_participation_round to authenticated;

-- sync_participation_round(): invite any units that don't yet have a row in an open round (e.g.
-- units created after the round opened). Idempotent; returns the number of new invites added.
create or replace function public.sync_participation_round(p_round_id uuid)
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_fy int;
  v_added int;
begin
  v_role := public.current_user_role();
  if v_role is distinct from 'web_master' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select fiscal_year into v_fy from public.participation_rounds where round_id = p_round_id;
  if v_fy is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;

  insert into public.unit_participation (round_id, unit_id, fiscal_year)
  select p_round_id, u.unit_id, v_fy
  from public.training_units u
  where not exists (
    select 1 from public.unit_participation up
    where up.round_id = p_round_id and up.unit_id = u.unit_id
  );
  get diagnostics v_added = row_count;

  return v_added;
end;
$$;

grant execute on function public.sync_participation_round to authenticated;

-- respond_participation(): the calling Unit Coordinator confirms or declines participation for
-- their OWN unit in an open round. The round must be open; status must be confirmed/declined.
create or replace function public.respond_participation(
  p_round_id uuid,
  p_status participation_status,
  p_note text default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_round public.participation_rounds;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null or v_profile.role <> 'unit_coordinator' or v_profile.unit_scope is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_status not in ('confirmed', 'declined') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  select * into v_round from public.participation_rounds where round_id = p_round_id;
  if v_round.round_id is null then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if v_round.status <> 'open' then
    raise exception 'round is closed' using errcode = '42501';
  end if;

  update public.unit_participation
     set status = p_status,
         responded_by = v_profile.id,
         responded_at = now(),
         note = p_note
   where round_id = p_round_id and unit_id = v_profile.unit_scope;

  if not found then
    raise exception 'no invite for this unit in this round' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id, changed_fields)
  values (v_profile.id, 'respond_participation', 'unit_participation',
          v_profile.unit_scope::text, array[p_status::text]);
end;
$$;

grant execute on function public.respond_participation to authenticated;

-- close_participation_round() / reopen: Web Master only.
create or replace function public.set_participation_round_status(
  p_round_id uuid,
  p_status round_status
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  v_role := public.current_user_role();
  if v_role is distinct from 'web_master' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.participation_rounds
     set status = p_status,
         closed_by = case when p_status = 'closed' then auth.uid() else null end,
         closed_at = case when p_status = 'closed' then now() else null end
   where round_id = p_round_id;

  insert into public.audit_log (actor_user_id, action, entity_type, record_id, changed_fields)
  values (auth.uid(),
          case when p_status = 'closed' then 'close_participation_round' else 'reopen_participation_round' end,
          'participation_round', p_round_id::text, array[p_status::text]);
end;
$$;

grant execute on function public.set_participation_round_status to authenticated;

-- get_participation_summary(): aggregate counts for a fiscal year. Returns only org-level counts
-- (no PII), so it is safe to grant broadly — the dashboard's "active units in FY X" reads this.
-- SECURITY DEFINER so Executive (which has no direct select policy) can still get the number.
create or replace function public.get_participation_summary(p_fiscal_year int)
returns table (total bigint, confirmed bigint, declined bigint, invited bigint)
language sql stable security definer
set search_path = public
as $$
  select
    count(*) as total,
    count(*) filter (where status = 'confirmed') as confirmed,
    count(*) filter (where status = 'declined') as declined,
    count(*) filter (where status = 'invited') as invited
  from public.unit_participation
  where fiscal_year = p_fiscal_year;
$$;

grant execute on function public.get_participation_summary to authenticated;
