-- =====================================================================
-- AAC — 011 · Zones
--
-- RUN 010_zones.sql FIRST, and let it finish. This file uses the
-- 'zonal_coordinator' enum value that 010 adds, and Postgres refuses to use a
-- new enum value in the transaction that created it.
--
-- The hierarchy in use is campus → zone → region → national, but only three of
-- those existed. The board already contains a "South-West Zonal Coordinator"
-- and a "North Central Coordinator" with nowhere to sit, and a campus
-- coordinator being promoted had to jump straight to regional.
--
-- Zones are DATA, not an enum. Nigeria's six geopolitical zones are seeded
-- because they are the ones in use today, but nothing in the code knows their
-- names: add "Ashanti" for Ghana, or split a zone, and everything follows.
-- =====================================================================

create table if not exists zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country    text not null,
  region_id  uuid references regions(id) on delete set null,
  -- Free text on purpose: "the six states of the South-West" is more useful to
  -- a new coordinator than a list of codes.
  covers     text,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, country)
);

drop trigger if exists set_updated_at on zones;
create trigger set_updated_at before update on zones
  for each row execute function set_updated_at();

-- A zone sits between a region and a campus, so both ends point at it.
alter table profiles    add column if not exists zone_id uuid references zones(id) on delete set null;
alter table chapters    add column if not exists zone_id uuid references zones(id) on delete set null;
alter table invitations add column if not exists zone_id uuid references zones(id) on delete set null;

create index if not exists profiles_zone on profiles (zone_id) where zone_id is not null;
create index if not exists chapters_zone on chapters (zone_id) where zone_id is not null;

-- ── Rank ─────────────────────────────────────────────────────────────
-- 55: above a campus, below a region. Every other number is unchanged.
create or replace function public.role_rank(uid uuid default auth.uid())
returns int language sql stable security definer set search_path = public as $$
  select case (select role::text from profiles where id = uid and status = 'active')
    when 'super_admin'          then 100
    when 'board_member'         then 90
    when 'admin'                then 80
    when 'department_director'  then 70
    when 'regional_coordinator' then 60
    when 'zonal_coordinator'    then 55
    when 'campus_coordinator'   then 50
    when 'content_lead'         then 40
    when 'contributor'          then 35
    when 'advocate'             then 30
    else 0
  end;
$$;

create or replace function public.my_zone()
returns uuid language sql stable security definer set search_path = public as $$
  select zone_id from profiles where id = auth.uid();
$$;

revoke all on function public.my_zone() from public;
grant execute on function public.my_zone() to authenticated;

-- ── Role changes understand the new tier ─────────────────────────────
-- `p_role` is text here, not app_role: a function signature naming an enum
-- value added in the same session is the other half of the same Postgres
-- restriction. It is cast once, inside.
create or replace function public.set_user_role(
  p_user       uuid,
  p_role       text,
  p_chapter    uuid default null,
  p_region     uuid default null,
  p_department uuid default null,
  p_zone       uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  my_rank     int := role_rank();
  target_rank int;
  new_rank    int;
  keep_chapter    uuid := null;
  keep_region     uuid := null;
  keep_department uuid := null;
  keep_zone       uuid := null;
begin
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role. Ask another admin.';
  end if;
  if my_rank < 80 then
    raise exception 'Only an admin can change roles.';
  end if;

  select case role::text
    when 'super_admin' then 100 when 'board_member' then 90
    when 'admin' then 80 when 'department_director' then 70
    when 'regional_coordinator' then 60 when 'zonal_coordinator' then 55
    when 'campus_coordinator' then 50 when 'content_lead' then 40
    when 'contributor' then 35 when 'advocate' then 30 else 10 end
    into target_rank
    from profiles where id = p_user;

  if target_rank is null then
    raise exception 'That person does not exist.';
  end if;

  new_rank := case p_role
    when 'super_admin' then 100 when 'board_member' then 90
    when 'admin' then 80 when 'department_director' then 70
    when 'regional_coordinator' then 60 when 'zonal_coordinator' then 55
    when 'campus_coordinator' then 50 when 'content_lead' then 40
    when 'contributor' then 35 when 'advocate' then 30 else 10 end;

  if target_rank >= my_rank then
    raise exception 'You cannot change someone at your own level or above.';
  end if;
  if new_rank >= my_rank then
    raise exception 'You cannot give someone a role at or above your own.';
  end if;

  -- Only the scope the new role uses survives a promotion, so moving someone
  -- up never leaves them pinned to the chapter they came from.
  if p_role = 'campus_coordinator' then
    keep_chapter := p_chapter;
  elsif p_role = 'zonal_coordinator' then
    keep_zone := p_zone;
  elsif p_role = 'regional_coordinator' then
    keep_region := p_region;
  elsif p_role = 'department_director' then
    keep_department := p_department;
  end if;

  update profiles
     set role          = p_role::app_role,
         chapter_id    = keep_chapter,
         zone_id       = keep_zone,
         region_id     = keep_region,
         department_id = keep_department,
         updated_at    = now()
   where id = p_user;

  insert into audit_log (actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), 'role_changed', 'profiles', p_user,
          jsonb_build_object('role', p_role, 'chapter', keep_chapter, 'zone', keep_zone,
                             'region', keep_region, 'department', keep_department));
exception
  when unique_violation then
    raise exception 'That chapter or zone already has a coordinator. Move or suspend them first.';
end $$;

-- Retire the older shapes so nothing calls a stale signature.
drop function if exists public.set_user_role(uuid, app_role, uuid, uuid, uuid);
drop function if exists public.set_user_role(uuid, app_role, uuid, uuid, uuid, uuid);

revoke all on function public.set_user_role(uuid, text, uuid, uuid, uuid, uuid) from public;
grant execute on function public.set_user_role(uuid, text, uuid, uuid, uuid, uuid) to authenticated;

-- One zonal coordinator per zone, same reasoning as chapters.
create unique index if not exists one_zonal_coordinator_per_zone
  on profiles (zone_id)
  where role = 'zonal_coordinator' and zone_id is not null and status = 'active';

-- ── RLS ──────────────────────────────────────────────────────────────
alter table zones enable row level security;

drop policy if exists pub_zones on zones;
create policy pub_zones on zones for select using (true);

drop policy if exists zones_write on zones;
create policy zones_write on zones for all to authenticated
  using (role_rank() >= 60) with check (role_rank() >= 60);

-- ── Seed: Nigeria's six geopolitical zones ───────────────────────────
insert into zones (name, country, covers, position) values
  ('North Central', 'Nigeria', 'Benue, Kogi, Kwara, Nasarawa, Niger, Plateau and the FCT', 1),
  ('North East',    'Nigeria', 'Adamawa, Bauchi, Borno, Gombe, Taraba, Yobe', 2),
  ('North West',    'Nigeria', 'Jigawa, Kaduna, Kano, Katsina, Kebbi, Sokoto, Zamfara', 3),
  ('South East',    'Nigeria', 'Abia, Anambra, Ebonyi, Enugu, Imo', 4),
  ('South South',   'Nigeria', 'Akwa Ibom, Bayelsa, Cross River, Delta, Edo, Rivers', 5),
  ('South West',    'Nigeria', 'Ekiti, Lagos, Ogun, Ondo, Osun, Oyo', 6)
on conflict (name, country) do nothing;
