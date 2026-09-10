-- =====================================================================
-- AAC — 013 · Campus sites
--
-- Each chapter gets its own subdomain with its own events, blog and people,
-- while the main site stays the organisation's voice.
--
-- THE MODEL, in one line: `chapter_id` says who OWNS a piece of content, and
-- `is_featured` says whether the organisation has chosen to put it on the main
-- site as well.
--
--   chapter_id IS NULL   →  AAC's own content. Lives on aaci.ngo.
--   chapter_id = X       →  belongs to campus X. Lives on X's subdomain.
--   is_featured = true   →  additionally shown on aaci.ngo, whoever owns it.
--
-- That is deliberately two flags rather than a copy. Cross-posting by
-- duplicating a row would mean two records drifting apart — edited in one
-- place, stale in the other — and nobody able to say which is the real one.
--
-- WHERE EACH RULE LIVES. RLS decides who may EDIT a row. It cannot decide
-- where a row APPEARS, because Postgres does not know which hostname asked —
-- so "what shows on which site" is a filter in the query layer (lib/cms), and
-- published content stays publicly readable either way. Campus content is not
-- secret; it is simply somebody else's front page.
-- =====================================================================

-- ── Subdomain ────────────────────────────────────────────────────────
alter table chapters add column if not exists subdomain text;

-- Lowercase, hyphen-separated, no leading or trailing hyphen. This ends up in
-- a hostname, so it is validated here rather than trusted from a form.
alter table chapters drop constraint if exists chapters_subdomain_shape;
alter table chapters add constraint chapters_subdomain_shape
  check (
    subdomain is null
    or (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$' and subdomain !~ '--')
  );

create unique index if not exists chapters_subdomain_unique
  on chapters (subdomain) where subdomain is not null;

-- Names that must never become a chapter, because something else already
-- answers on them or will. Enforced in the database so it holds however the
-- row is written, not only through the form.
create table if not exists reserved_subdomains (name text primary key);

insert into reserved_subdomains (name) values
  ('www'), ('mail'), ('email'), ('smtp'), ('imap'), ('pop'), ('mx'),
  ('api'), ('app'), ('admin'), ('dashboard'), ('cms'), ('auth'), ('login'),
  ('blog'), ('events'), ('news'), ('support'), ('help'), ('docs'),
  ('static'), ('assets'), ('cdn'), ('img'), ('images'), ('media'),
  ('send'), ('track'), ('links'), ('go'), ('status'), ('staging'), ('dev'),
  ('test'), ('preview'), ('vercel'), ('ns1'), ('ns2'), ('autodiscover'),
  ('aaci'), ('aac'), ('donate'), ('pay')
on conflict (name) do nothing;

create or replace function public.check_subdomain_reserved()
returns trigger language plpgsql as $$
begin
  if new.subdomain is not null
     and exists (select 1 from reserved_subdomains where name = new.subdomain) then
    raise exception 'The subdomain "%" is reserved and cannot be used for a chapter.', new.subdomain;
  end if;
  return new;
end $$;

drop trigger if exists chapters_subdomain_guard on chapters;
create trigger chapters_subdomain_guard
  before insert or update of subdomain on chapters
  for each row execute function public.check_subdomain_reserved();

-- An admin can take a campus site offline without touching the chapter, the
-- people attached to it, or anything it has published.
alter table chapters add column if not exists site_enabled boolean not null default false;

-- Optional per-campus front-page copy. Null means "use the main hero", which
-- is what every chapter starts with.
alter table chapters add column if not exists site_headline text;
alter table chapters add column if not exists site_lede text;
alter table chapters add column if not exists site_hero jsonb;

-- ── Featuring campus content on the main site ────────────────────────
-- events already had chapter_id and is_featured; posts had only chapter_id;
-- programmes had neither. All three now carry the same pair, so "whose is it"
-- and "does it go on the main site" are asked the same way everywhere.
alter table posts      add column if not exists is_featured boolean not null default false;
alter table programmes add column if not exists is_featured boolean not null default false;
alter table programmes add column if not exists chapter_id uuid
  references chapters(id) on delete set null;

create index if not exists events_chapter_pub
  on events (chapter_id, status, starts_at desc);
create index if not exists posts_chapter_pub
  on posts (chapter_id, status, published_at desc);
create index if not exists programmes_chapter_pub
  on programmes (chapter_id, status, created_at desc);
create index if not exists events_featured     on events     (is_featured) where is_featured;
create index if not exists posts_featured      on posts      (is_featured) where is_featured;
create index if not exists programmes_featured on programmes (is_featured) where is_featured;

-- ── Campus executives ────────────────────────────────────────────────
-- Reuses team_members rather than a second people table, so one component,
-- one photo pipeline and one alt-text rule serve the board and the campus
-- committees alike. `chapter_id` is what makes a row a campus person.
alter table team_members add column if not exists chapter_id uuid
  references chapters(id) on delete cascade;

create index if not exists team_chapter on team_members (chapter_id) where chapter_id is not null;

-- 'executive' joins the existing tiers for campus committee roles.
alter table team_members drop constraint if exists team_members_tier_check;
alter table team_members add constraint team_members_tier_check
  check (tier in ('board', 'director', 'regional', 'zonal', 'campus', 'executive'));

-- The name uniqueness from 005 was global, which breaks the moment two
-- chapters each have a "General Secretary" or two people share a name.
drop index if exists team_members_name_unique;
create unique index if not exists team_members_name_per_scope
  on team_members (coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid), full_name);

-- ── Reach ────────────────────────────────────────────────────────────
-- Who may act on content belonging to a given chapter. One function, used by
-- every content policy below, so the rule is stated once.
--
-- A campus coordinator reaches their own chapter. Zonal reaches the chapters
-- in their zone, regional those in their region. Directors, admins and content
-- leads reach everything — content leads because curating the main site is
-- their whole job, even though their rank is deliberately low.
create or replace function public.can_reach_chapter(p_chapter uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  r text := coalesce((select role::text from profiles where id = auth.uid()), 'viewer');
  rk int := role_rank();
begin
  -- Everything, including AAC's own national content.
  if r in ('super_admin', 'admin', 'department_director', 'board_member', 'content_lead') then
    return true;
  end if;

  -- National content is the organisation speaking. A coordinator does not
  -- publish in AAC's name.
  if p_chapter is null then
    return false;
  end if;

  if r = 'regional_coordinator' then
    return exists (select 1 from chapters c where c.id = p_chapter and c.region_id = my_region());
  end if;

  if r = 'zonal_coordinator' then
    return exists (select 1 from chapters c where c.id = p_chapter and c.zone_id = my_zone());
  end if;

  -- Campus coordinators and contributors: their own chapter only.
  if rk >= 35 then
    return p_chapter = my_chapter();
  end if;

  return false;
end $$;

revoke all on function public.can_reach_chapter(uuid) from public;
grant execute on function public.can_reach_chapter(uuid) to authenticated;

-- ── Events, posts and programmes: scoped by chapter ──────────────────
-- Replaces the "own row or rank >= 60" rules, which let any coordinator edit
-- any chapter's content as long as they created it — and, worse, let a
-- regional coordinator reach chapters outside their region.
--
-- Programmes join the list because a chapter can run one, but note what
-- can_reach_chapter does with a null chapter_id: a national programme stays
-- exactly as restricted as 009 made it, editable only by directors, admins and
-- content leads. Handing a campus its own programmes does not hand it AAC's.
do $$
declare t text;
begin
  foreach t in array array['events', 'posts', 'programmes'] loop
    execute format('drop policy if exists read_%1$s on %1$s;', t);
    execute format('drop policy if exists insert_%1$s on %1$s;', t);
    execute format('drop policy if exists update_%1$s on %1$s;', t);
    execute format('drop policy if exists delete_%1$s on %1$s;', t);
    execute format('drop policy if exists write_%1$s on %1$s;', t);

    execute format($f$
      create policy read_%1$s on %1$s for select to authenticated
      using (can_reach_chapter(chapter_id));
    $f$, t);

    execute format($f$
      create policy insert_%1$s on %1$s for insert to authenticated
      with check (can_write() and can_reach_chapter(chapter_id));
    $f$, t);

    execute format($f$
      create policy update_%1$s on %1$s for update to authenticated
      using (can_write() and can_reach_chapter(chapter_id))
      with check (can_write() and can_reach_chapter(chapter_id));
    $f$, t);

    -- Deleting something public is a coordinator's call; a contributor may
    -- clear their own unpublished work.
    execute format($f$
      create policy delete_%1$s on %1$s for delete to authenticated
      using (
        can_reach_chapter(chapter_id)
        and (
          role_rank() >= 60
          or (status in ('draft','changes_requested','in_review')
              and can_write()
              and coalesce(created_by, auth.uid()) = auth.uid())
        )
      );
    $f$, t);
  end loop;
end $$;

-- Featuring on the main site is an editorial decision, not a chapter's own.
-- Postgres has no column-level UPDATE in RLS, so this is a trigger.
create or replace function public.guard_featuring()
returns trigger language plpgsql as $$
begin
  if new.is_featured is distinct from old.is_featured then
    if coalesce((select role::text from profiles where id = auth.uid()), 'viewer')
       not in ('super_admin', 'admin', 'department_director', 'content_lead') then
      raise exception 'Only an admin, a director or a content lead can feature content on the main site.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists events_featuring_guard on events;
create trigger events_featuring_guard before update on events
  for each row execute function public.guard_featuring();

drop trigger if exists posts_featuring_guard on posts;
create trigger posts_featuring_guard before update on posts
  for each row execute function public.guard_featuring();

drop trigger if exists programmes_featuring_guard on programmes;
create trigger programmes_featuring_guard before update on programmes
  for each row execute function public.guard_featuring();

-- ── Campus people follow the chapter, not the board rules ────────────
-- 009 restricted team_members to directors and admins, which is right for the
-- board — but a campus coordinator must be able to list their own committee.
drop policy if exists gov_write_team_members on team_members;
drop policy if exists gov_update_team_members on team_members;
drop policy if exists gov_delete_team_members on team_members;

create policy gov_write_team_members on team_members for insert to authenticated
  with check (
    case when chapter_id is null
      then can_edit_governance()
      else can_write() and can_reach_chapter(chapter_id)
    end
  );

create policy gov_update_team_members on team_members for update to authenticated
  using (
    case when chapter_id is null
      then can_edit_governance()
      else can_write() and can_reach_chapter(chapter_id)
    end
  )
  with check (
    case when chapter_id is null
      then can_edit_governance()
      else can_write() and can_reach_chapter(chapter_id)
    end
  );

create policy gov_delete_team_members on team_members for delete to authenticated
  using (
    case when chapter_id is null
      then role_rank() >= 80
      else can_write() and can_reach_chapter(chapter_id)
    end
  );

-- ── Chapters: a coordinator may edit their own campus site copy ──────
drop policy if exists chapters_write on chapters;
create policy chapters_write on chapters for all to authenticated
  using (role_rank() >= 60 or (role_rank() >= 50 and id = my_chapter()))
  with check (role_rank() >= 60 or (role_rank() >= 50 and id = my_chapter()));

-- Turning a campus site on or off, and naming its subdomain, is an admin act.
create or replace function public.guard_chapter_site()
returns trigger language plpgsql as $$
begin
  if (new.subdomain is distinct from old.subdomain)
     or (new.site_enabled is distinct from old.site_enabled) then
    if role_rank() < 80 then
      raise exception 'Only an admin can name a subdomain or take a campus site online.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists chapters_site_guard on chapters;
create trigger chapters_site_guard before update on chapters
  for each row execute function public.guard_chapter_site();
