-- =====================================================================
-- AAC — 006 · Invitations that apply themselves
--
-- The people being invited are 15 regional and 40+ campus coordinators —
-- pharmacists and students, not engineers. Any flow involving "click this
-- token link before it expires" loses a share of them to spam folders and
-- expired links, and generates support work for the one person who knows
-- how the system works.
--
-- So there is no acceptance step. An admin records an invitation against an
-- email address; when that person signs in with that address for the first
-- time, the trigger below reads the invitation and gives them the role and
-- scope they were invited with. The email they receive is informational —
-- losing it costs nothing, because signing in is the acceptance.
-- =====================================================================

-- Department directors need a department, which the original table lacked.
alter table invitations add column if not exists department_id uuid
  references departments(id) on delete set null;

alter table invitations add column if not exists full_name text;
alter table invitations add column if not exists revoked_at timestamptz;

-- Case-insensitive lookup: people type Ada@ and ada@ interchangeably.
create index if not exists invitations_email_lower
  on invitations (lower(email));

-- =====================================================================
-- New-user handler.
--
-- Replaces the version in 001, which always created an 'advocate'. Now it
-- looks for a live invitation first. Everything is inside one trigger so a
-- person's very first page load already has the right permissions — no
-- window where a newly invited director sees an empty dashboard.
--
-- SECURITY DEFINER because it writes to profiles during auth signup, before
-- the new user has any rights of their own.
-- =====================================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv invitations%rowtype;
begin
  select * into inv
    from invitations
   where lower(email) = lower(new.email)
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   order by created_at desc
   limit 1;

  insert into public.profiles (
    id, email, full_name, role, chapter_id, region_id, department_id, status
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      inv.full_name,
      new.email
    ),
    coalesce(inv.role, 'advocate'),
    inv.chapter_id,
    inv.region_id,
    inv.department_id,
    'active'
  )
  on conflict (id) do nothing;

  if inv.id is not null then
    update invitations set accepted_at = now() where id = inv.id;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Role changes, with the two guards that matter.
--
-- Doing this in the database rather than only in a server action means the
-- rules hold even if someone calls the API directly:
--
--   1. No privilege escalation. You may only grant a role strictly BELOW
--      your own rank, and only modify someone already below you. An admin
--      cannot mint a super_admin, or edit one.
--   2. No self-lockout. You cannot change your own role or suspend
--      yourself — the classic way an organisation loses its only admin.
-- =====================================================================
create or replace function public.set_user_role(
  p_user       uuid,
  p_role       app_role,
  p_chapter    uuid default null,
  p_region     uuid default null,
  p_department uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  my_rank     int := role_rank();
  target_rank int;
  new_rank    int;
begin
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role. Ask another admin.';
  end if;

  if my_rank < 80 then
    raise exception 'Only an admin can change roles.';
  end if;

  select case role
    when 'super_admin' then 100 when 'board_member' then 90
    when 'admin' then 80 when 'department_director' then 70
    when 'regional_coordinator' then 60 when 'campus_coordinator' then 50
    when 'content_lead' then 40 when 'contributor' then 35
    when 'advocate' then 30 else 10 end
    into target_rank
    from profiles where id = p_user;

  if target_rank is null then
    raise exception 'That person does not exist.';
  end if;

  new_rank := case p_role
    when 'super_admin' then 100 when 'board_member' then 90
    when 'admin' then 80 when 'department_director' then 70
    when 'regional_coordinator' then 60 when 'campus_coordinator' then 50
    when 'content_lead' then 40 when 'contributor' then 35
    when 'advocate' then 30 else 10 end;

  if target_rank >= my_rank then
    raise exception 'You cannot change someone at your own level or above.';
  end if;

  if new_rank >= my_rank then
    raise exception 'You cannot give someone a role at or above your own.';
  end if;

  update profiles
     set role          = p_role,
         chapter_id    = p_chapter,
         region_id     = p_region,
         department_id = p_department,
         updated_at    = now()
   where id = p_user;

  insert into audit_log (actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), 'role_changed', 'profiles', p_user,
          jsonb_build_object('role', p_role));
end $$;

revoke all on function public.set_user_role(uuid, app_role, uuid, uuid, uuid) from public;
grant execute on function public.set_user_role(uuid, app_role, uuid, uuid, uuid) to authenticated;

-- Suspend / reactivate, with the same guards.
create or replace function public.set_user_status(
  p_user uuid,
  p_status profile_status
) returns void
language plpgsql security definer set search_path = public as $$
declare
  my_rank int := role_rank();
  target_rank int;
begin
  if p_user = auth.uid() then
    raise exception 'You cannot suspend your own account.';
  end if;
  if my_rank < 80 then
    raise exception 'Only an admin can change someone''s access.';
  end if;

  select case role
    when 'super_admin' then 100 when 'board_member' then 90
    when 'admin' then 80 when 'department_director' then 70
    when 'regional_coordinator' then 60 when 'campus_coordinator' then 50
    when 'content_lead' then 40 when 'contributor' then 35
    when 'advocate' then 30 else 10 end
    into target_rank
    from profiles where id = p_user;

  if target_rank is null then
    raise exception 'That person does not exist.';
  end if;
  if target_rank >= my_rank then
    raise exception 'You cannot change someone at your own level or above.';
  end if;

  update profiles set status = p_status, updated_at = now() where id = p_user;

  insert into audit_log (actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), 'status_changed', 'profiles', p_user,
          jsonb_build_object('status', p_status));
end $$;

revoke all on function public.set_user_status(uuid, profile_status) from public;
grant execute on function public.set_user_status(uuid, profile_status) to authenticated;

-- Invitations are admin-only in both directions.
drop policy if exists invitations_admin on invitations;
create policy invitations_admin on invitations for all to authenticated
  using (role_rank() >= 80) with check (role_rank() >= 80);
