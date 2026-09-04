-- =====================================================================
-- AAC — 002 · Row Level Security
--
-- This is the real security boundary. The dashboard hides buttons a user
-- cannot use, but that is cosmetic; a stolen anon key still cannot read
-- another chapter's applications because Postgres refuses.
--
-- The rule that carries the most weight:
--   Campus coordinators CREATE and EDIT their own chapter's events but
--   CANNOT publish. They submit for review. Publishing goes through the
--   publish_content() RPC, which checks rank and writes the audit log.
--   That is what keeps 40+ coordinators from putting unreviewed content
--   on a public health website.
-- =====================================================================

-- ── Bring older runs of 001 up to date ───────────────────────────────
-- `resources` and `pages` were missing the shared publishing spine. These
-- are no-ops on a clean 001 run and repair a database that ran the earlier
-- version, so 002 is safe either way.
alter table resources add column if not exists created_by uuid references profiles(id) on delete set null;
alter table resources add column if not exists updated_by uuid references profiles(id) on delete set null;
alter table resources add column if not exists scheduled_for timestamptz;
alter table resources add column if not exists updated_at timestamptz not null default now();
alter table pages     add column if not exists created_by uuid references profiles(id) on delete set null;

-- ── Helpers (SECURITY DEFINER, search_path pinned) ───────────────────
create or replace function public.role_rank(uid uuid default auth.uid())
returns int language sql stable security definer set search_path = public as $$
  select coalesce((
    select case role
      when 'super_admin'          then 100
      when 'board_member'         then 90
      when 'admin'                then 80
      when 'department_director'  then 70
      when 'regional_coordinator' then 60
      when 'campus_coordinator'   then 50
      when 'content_lead'         then 40
      when 'contributor'          then 35
      when 'advocate'             then 30
      else 10
    end
    from profiles where id = uid and status = 'active'
  ), 0);
$$;

create or replace function public.my_chapter()
returns uuid language sql stable security definer set search_path = public as $$
  select chapter_id from profiles where id = auth.uid();
$$;

create or replace function public.my_region()
returns uuid language sql stable security definer set search_path = public as $$
  select region_id from profiles where id = auth.uid();
$$;

-- Board members read everything and write nothing: transparency without
-- operational risk.
create or replace function public.can_write()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'viewer')
         <> 'board_member' and role_rank() >= 35;
$$;

create or replace function public.can_publish()
returns boolean language sql stable security definer set search_path = public as $$
  select role_rank() >= 60 or
         coalesce((select role from profiles where id = auth.uid()), 'viewer') = 'content_lead';
$$;

-- ── Enable RLS everywhere ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'regions','departments','chapters','profiles','invitations',
    'media_assets','media_usage','categories','events','event_media','posts',
    'programmes','team_members','partners','testimonials','faqs',
    'impact_metrics','publications','resources','pages','page_sections',
    'contacts','applications','activities','impact_reports',
    'form_submissions','newsletter_subscribers','site_settings','navigation',
    'redirects','revisions','audit_log'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ── Public read: published content only ──────────────────────────────
drop policy if exists pub_events on events;
create policy pub_events on events for select using (status = 'published');

drop policy if exists pub_event_media on event_media;
create policy pub_event_media on event_media for select using (
  exists (select 1 from events e where e.id = event_id and e.status = 'published')
);

drop policy if exists pub_posts on posts;
create policy pub_posts on posts for select using (status = 'published');

drop policy if exists pub_programmes on programmes;
create policy pub_programmes on programmes for select using (status = 'published');

drop policy if exists pub_resources on resources;
create policy pub_resources on resources for select using (status = 'published');

drop policy if exists pub_pages on pages;
create policy pub_pages on pages for select using (status = 'published');

drop policy if exists pub_page_sections on page_sections;
create policy pub_page_sections on page_sections for select using (
  exists (select 1 from pages p where p.id = page_id and p.status = 'published')
);

do $$
declare t text;
begin
  foreach t in array array['team_members','partners','testimonials','faqs','impact_metrics','publications'] loop
    execute format('drop policy if exists pub_%1$s on %1$s;', t);
    execute format('create policy pub_%1$s on %1$s for select using (is_published = true);', t);
  end loop;
end $$;

drop policy if exists pub_chapters on chapters;
create policy pub_chapters on chapters for select using (status = 'active');

drop policy if exists pub_categories on categories;
create policy pub_categories on categories for select using (true);

drop policy if exists pub_media on media_assets;
create policy pub_media on media_assets for select using (true);

drop policy if exists pub_regions on regions;
create policy pub_regions on regions for select using (true);

drop policy if exists pub_departments on departments;
create policy pub_departments on departments for select using (true);

drop policy if exists pub_settings on site_settings;
create policy pub_settings on site_settings for select using (true);

drop policy if exists pub_navigation on navigation;
create policy pub_navigation on navigation for select using (true);

drop policy if exists pub_redirects on redirects;
create policy pub_redirects on redirects for select using (true);

-- ── Public write: only the two things the public may create ──────────
drop policy if exists anon_form_submit on form_submissions;
create policy anon_form_submit on form_submissions for insert with check (true);

drop policy if exists anon_newsletter on newsletter_subscribers;
create policy anon_newsletter on newsletter_subscribers for insert with check (true);

-- ── Profiles ─────────────────────────────────────────────────────────
drop policy if exists own_profile_read on profiles;
create policy own_profile_read on profiles for select to authenticated
  using (id = auth.uid() or role_rank() >= 50);

drop policy if exists own_profile_update on profiles;
create policy own_profile_update on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only super_admin and admin may change roles or create profiles for others.
drop policy if exists admin_profiles on profiles;
create policy admin_profiles on profiles for all to authenticated
  using (role_rank() >= 80) with check (role_rank() >= 80);

-- ── Staff read on unpublished content ────────────────────────────────
do $$
declare
  t text;
  v_clause text;
begin
  foreach t in array array['events','posts','programmes','resources','pages'] loop
    execute format('drop policy if exists staff_read_%1$s on %1$s;', t);
    -- Build the clause from what the table actually has, rather than assuming.
    -- Introspecting is cheap and means this file cannot be broken by a column
    -- that was added in a later migration than the one being run.
    select
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'created_by'
      ) then ' or created_by = auth.uid()' else '' end
      ||
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'chapter_id'
      ) then ' or (role_rank() >= 35 and chapter_id = my_chapter())' else '' end
    into v_clause;

    execute format(
      'create policy staff_read_%1$s on %1$s for select to authenticated
       using (role_rank() >= 60%2$s);', t, v_clause);
  end loop;
end $$;

-- ── Events: the workflow that matters ────────────────────────────────
drop policy if exists events_insert on events;
create policy events_insert on events for insert to authenticated
  with check (
    can_write()
    and status <> 'published'                 -- cannot create straight to live
    and (role_rank() >= 70 or chapter_id = my_chapter())
  );

drop policy if exists events_update on events;
create policy events_update on events for update to authenticated
  using (
    role_rank() >= 70
    or (role_rank() >= 60 and chapter_id = my_chapter())
    or (created_by = auth.uid() and status in ('draft','changes_requested'))
  )
  with check (
    -- A coordinator may move a draft to in_review, never to published.
    role_rank() >= 60 or status <> 'published'
  );

drop policy if exists events_delete on events;
create policy events_delete on events for delete to authenticated
  using (role_rank() >= 80);

drop policy if exists event_media_write on event_media;
create policy event_media_write on event_media for all to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_id
        and (role_rank() >= 60 or e.chapter_id = my_chapter() or e.created_by = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from events e
      where e.id = event_id
        and (role_rank() >= 60 or e.chapter_id = my_chapter() or e.created_by = auth.uid())
    )
  );

-- ── Posts, programmes, resources, pages ──────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['posts','programmes','resources','pages'] loop
    execute format('drop policy if exists write_%1$s on %1$s;', t);
    execute format($f$
      create policy write_%1$s on %1$s for all to authenticated
      using (role_rank() >= 60 or (can_write() and coalesce(created_by, auth.uid()) = auth.uid()))
      with check (role_rank() >= 60 or can_write());
    $f$, t);
  end loop;
end $$;

-- page_sections has no created_by of its own — it inherits its page's rules.
drop policy if exists write_page_sections on page_sections;
create policy write_page_sections on page_sections for all to authenticated
  using (can_write()) with check (can_write());

-- ── Editorial tables: content_lead and above ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'team_members','partners','testimonials','faqs','impact_metrics',
    'publications','categories','media_assets','media_usage','navigation','redirects'
  ] loop
    execute format('drop policy if exists manage_%1$s on %1$s;', t);
    execute format('create policy manage_%1$s on %1$s for all to authenticated
                    using (can_write()) with check (can_write());', t);
  end loop;
end $$;

-- ── Org tables: admin only ───────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['regions','departments','invitations','site_settings'] loop
    execute format('drop policy if exists admin_%1$s on %1$s;', t);
    execute format('create policy admin_%1$s on %1$s for all to authenticated
                    using (role_rank() >= 80) with check (role_rank() >= 80);', t);
  end loop;
end $$;

drop policy if exists chapters_write on chapters;
create policy chapters_write on chapters for all to authenticated
  using (role_rank() >= 80 or (role_rank() >= 60 and region_id = my_region())
         or (role_rank() >= 50 and id = my_chapter()))
  with check (role_rank() >= 60 or id = my_chapter());

-- ── CRM: scoped, and never readable by content roles ─────────────────
do $$
declare t text;
begin
  foreach t in array array['contacts','applications'] loop
    execute format('drop policy if exists crm_%1$s on %1$s;', t);
    execute format($f$
      create policy crm_%1$s on %1$s for all to authenticated
      using (role_rank() >= 80 or (role_rank() >= 50 and chapter_id = my_chapter())
             or (role_rank() >= 60 and chapter_id in (select id from chapters where region_id = my_region())))
      with check (role_rank() >= 50);
    $f$, t);
  end loop;
end $$;

drop policy if exists crm_activities on activities;
create policy crm_activities on activities for all to authenticated
  using (role_rank() >= 50) with check (role_rank() >= 50);

-- Advocates submit their own impact reports; coordinators verify.
drop policy if exists impact_reports_own on impact_reports;
create policy impact_reports_own on impact_reports for select to authenticated
  using (advocate_id = auth.uid() or role_rank() >= 50);

drop policy if exists impact_reports_insert on impact_reports;
create policy impact_reports_insert on impact_reports for insert to authenticated
  with check (advocate_id = auth.uid() and role_rank() >= 30);

drop policy if exists impact_reports_update on impact_reports;
create policy impact_reports_update on impact_reports for update to authenticated
  using (
    (advocate_id = auth.uid() and status in ('draft','submitted'))
    or role_rank() >= 50
  )
  with check (
    -- Only a coordinator or above may set 'verified'.
    status <> 'verified' or role_rank() >= 50
  );

-- ── Forms, newsletter, audit ─────────────────────────────────────────
drop policy if exists staff_forms on form_submissions;
create policy staff_forms on form_submissions for select to authenticated using (role_rank() >= 50);
drop policy if exists staff_forms_update on form_submissions;
create policy staff_forms_update on form_submissions for update to authenticated using (role_rank() >= 50);

drop policy if exists staff_newsletter on newsletter_subscribers;
create policy staff_newsletter on newsletter_subscribers for select to authenticated using (can_write());

drop policy if exists audit_read on audit_log;
create policy audit_read on audit_log for select to authenticated using (role_rank() >= 80);
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert to authenticated with check (true);

drop policy if exists revisions_rw on revisions;
create policy revisions_rw on revisions for all to authenticated
  using (role_rank() >= 35) with check (role_rank() >= 35);

-- Append-only audit log.
revoke update, delete on audit_log from authenticated, anon;

-- ── Publishing RPC ───────────────────────────────────────────────────
-- Publishing is deliberately NOT reachable through a plain UPDATE. It runs
-- here so rank is checked, a revision snapshot is taken, and the audit log
-- is written — atomically, every time.
create or replace function public.publish_content(
  p_table text,
  p_id uuid,
  p_status content_status default 'published'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_snapshot jsonb;
begin
  if p_table not in ('events','posts','programmes','resources','pages') then
    raise exception 'publish_content: unsupported table %', p_table;
  end if;

  if not can_publish() then
    raise exception 'publish_content: insufficient permissions'
      using hint = 'Submit for review instead — a coordinator or content lead publishes.';
  end if;

  execute format('select to_jsonb(t) from %I t where t.id = $1', p_table)
    into v_snapshot using p_id;

  if v_snapshot is null then
    raise exception 'publish_content: % % not found', p_table, p_id;
  end if;

  insert into revisions (entity_type, entity_id, snapshot, created_by)
  values (p_table, p_id, v_snapshot, auth.uid());

  execute format(
    'update %I set status = $1,
       published_at = case when $1 = ''published'' then coalesce(published_at, now()) else published_at end,
       updated_by = $2, updated_at = now()
     where id = $3', p_table)
  using p_status, auth.uid(), p_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, diff)
  values (auth.uid(), 'publish', p_table, p_id, jsonb_build_object('status', p_status));
end $$;

revoke all on function public.publish_content(text, uuid, content_status) from public, anon;
grant execute on function public.publish_content(text, uuid, content_status) to authenticated;
