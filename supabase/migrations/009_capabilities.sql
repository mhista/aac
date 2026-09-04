-- =====================================================================
-- AAC — 009 · Capability alignment
--
-- THE BUG THIS FIXES
--
-- 002 gave every "editorial" table one policy: `can_write()`, which is
-- rank >= 35. team_members is in that list. A campus coordinator is rank 50.
-- So a student running one university chapter could edit — or delete — the
-- national board, the department directors and the published impact figures.
-- Not merely in the interface: in the database, through the API, directly.
--
-- The cause is that a single rank threshold cannot describe this organisation.
-- `content_lead` (40) exists to write and publish and must reach the blog and
-- the programme pages. `campus_coordinator` (50) outranks them numerically and
-- must not touch governance. No "rank >= n" gets both right.
--
-- So the tables split into three groups with three different tests, and the
-- application's capability matrix (lib/auth/capabilities.ts) mirrors this file
-- line for line.
-- =====================================================================

-- ── Predicates ───────────────────────────────────────────────────────

-- Governance and the organisation's public face: the board list, directors,
-- partners, testimonials, the published impact figures. Department directors
-- and admins. Explicitly NOT coordinators, whose remit is a region or campus.
create or replace function public.can_edit_governance()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'viewer')
         in ('super_admin', 'admin', 'department_director')
     and coalesce((select status from profiles where id = auth.uid()), 'invited') = 'active';
$$;

-- National content: programmes, page structure, categories, navigation, FAQs.
-- Directors and admins, plus content leads — that is the whole point of a
-- content lead, even though their rank is low.
create or replace function public.can_edit_site_content()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'viewer')
         in ('super_admin', 'admin', 'department_director', 'content_lead')
     and coalesce((select status from profiles where id = auth.uid()), 'invited') = 'active';
$$;

revoke all on function public.can_edit_governance() from public;
revoke all on function public.can_edit_site_content() from public;
grant execute on function public.can_edit_governance() to authenticated;
grant execute on function public.can_edit_site_content() to authenticated;

-- ── Governance tables ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'team_members', 'partners', 'testimonials', 'impact_metrics'
  ] loop
    -- The over-broad policy from 002.
    execute format('drop policy if exists manage_%1$s on %1$s;', t);

    execute format('drop policy if exists gov_read_%1$s on %1$s;', t);
    execute format($f$
      create policy gov_read_%1$s on %1$s for select to authenticated using (true);
    $f$, t);

    execute format('drop policy if exists gov_write_%1$s on %1$s;', t);
    execute format($f$
      create policy gov_write_%1$s on %1$s for insert to authenticated
      with check (can_edit_governance());
    $f$, t);

    execute format('drop policy if exists gov_update_%1$s on %1$s;', t);
    execute format($f$
      create policy gov_update_%1$s on %1$s for update to authenticated
      using (can_edit_governance()) with check (can_edit_governance());
    $f$, t);

    -- Removing a board member or a published figure is an admin act.
    execute format('drop policy if exists gov_delete_%1$s on %1$s;', t);
    execute format($f$
      create policy gov_delete_%1$s on %1$s for delete to authenticated
      using (role_rank() >= 80);
    $f$, t);
  end loop;
end $$;

-- ── National content tables ──────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['faqs', 'categories', 'navigation', 'redirects', 'publications'] loop
    execute format('drop policy if exists manage_%1$s on %1$s;', t);

    execute format('drop policy if exists content_read_%1$s on %1$s;', t);
    execute format($f$
      create policy content_read_%1$s on %1$s for select to authenticated using (true);
    $f$, t);

    execute format('drop policy if exists content_write_%1$s on %1$s;', t);
    execute format($f$
      create policy content_write_%1$s on %1$s for all to authenticated
      using (can_edit_site_content()) with check (can_edit_site_content());
    $f$, t);
  end loop;
end $$;

-- ── Media stays open to contributors ─────────────────────────────────
-- Anyone who can write anything needs to upload a picture for it. Deleting
-- from the shared library remains admin-only, because a file removed here can
-- leave a hole on somebody else's published page.
do $$
declare t text;
begin
  foreach t in array array['media_assets', 'media_usage'] loop
    execute format('drop policy if exists manage_%1$s on %1$s;', t);

    execute format('drop policy if exists media_rw_%1$s on %1$s;', t);
    execute format($f$
      create policy media_rw_%1$s on %1$s for select to authenticated using (true);
    $f$, t);

    execute format('drop policy if exists media_insert_%1$s on %1$s;', t);
    execute format($f$
      create policy media_insert_%1$s on %1$s for insert to authenticated with check (can_write());
    $f$, t);

    execute format('drop policy if exists media_update_%1$s on %1$s;', t);
    execute format($f$
      create policy media_update_%1$s on %1$s for update to authenticated
      using (can_write()) with check (can_write());
    $f$, t);

    execute format('drop policy if exists media_delete_%1$s on %1$s;', t);
    execute format($f$
      create policy media_delete_%1$s on %1$s for delete to authenticated using (role_rank() >= 80);
    $f$, t);
  end loop;
end $$;

-- ── Programmes and pages follow site content, not the post rules ─────
-- 008 gave them the author-owns-their-draft treatment that suits the blog.
-- A programme page is not somebody's draft; it is the organisation speaking.
do $$
declare t text;
begin
  foreach t in array array['programmes', 'pages', 'page_sections'] loop
    execute format('drop policy if exists read_%1$s on %1$s;', t);
    execute format('drop policy if exists insert_%1$s on %1$s;', t);
    execute format('drop policy if exists update_%1$s on %1$s;', t);
    execute format('drop policy if exists delete_%1$s on %1$s;', t);
    execute format('drop policy if exists write_%1$s on %1$s;', t);

    execute format($f$
      create policy read_%1$s on %1$s for select to authenticated using (true);
    $f$, t);
    execute format($f$
      create policy write_%1$s on %1$s for all to authenticated
      using (can_edit_site_content()) with check (can_edit_site_content());
    $f$, t);
  end loop;
end $$;

-- ── One campus coordinator per chapter ───────────────────────────────
-- A chapter with two people who each think the other is handling it is worse
-- than one with none. Enforced as a partial unique index so the constraint
-- only binds the role it is about.
create unique index if not exists one_campus_coordinator_per_chapter
  on profiles (chapter_id)
  where role = 'campus_coordinator' and chapter_id is not null and status = 'active';

-- ── Role changes clear the scope that no longer applies ──────────────
-- Promoting a campus coordinator to regional left chapter_id set, so they
-- stayed pinned to one university while supposedly covering a region — and
-- held the unique index above against whoever replaced them.
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
  keep_chapter    uuid := null;
  keep_region     uuid := null;
  keep_department uuid := null;
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

  -- Only the scope the new role actually uses survives. Everything else is
  -- cleared, so a promotion never leaves a stale attachment behind.
  if p_role = 'campus_coordinator' then
    keep_chapter := p_chapter;
  elsif p_role = 'regional_coordinator' then
    keep_region := p_region;
  elsif p_role = 'department_director' then
    keep_department := p_department;
  end if;

  update profiles
     set role          = p_role,
         chapter_id    = keep_chapter,
         region_id     = keep_region,
         department_id = keep_department,
         updated_at    = now()
   where id = p_user;

  insert into audit_log (actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), 'role_changed', 'profiles', p_user,
          jsonb_build_object('role', p_role, 'chapter', keep_chapter,
                             'region', keep_region, 'department', keep_department));
exception
  when unique_violation then
    raise exception 'That chapter already has a campus coordinator. Move or suspend them first.';
end $$;

revoke all on function public.set_user_role(uuid, app_role, uuid, uuid, uuid) from public;
grant execute on function public.set_user_role(uuid, app_role, uuid, uuid, uuid) to authenticated;
