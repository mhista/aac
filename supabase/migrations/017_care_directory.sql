-- =====================================================================
-- AAC — 017 · Care directory
--
-- The Medication Access & Global Partnership department keeps a list of
-- places a patient can actually go: pharmacies that stock cancer medicines,
-- cancer centres, and facilities that run screenings and tests (mammograms,
-- Pap smears, PSA tests and so on). The public site lists them so a visitor
-- can find the one nearest to them and call before they travel.
--
-- One table, not three. A teaching hospital can be a cancer centre, run
-- mammograms and dispense chemotherapy drugs all at once; three tables would
-- mean typing it three times and keeping three phone numbers in step.
-- `kind` says what the place mainly is; `services` says what it offers, and is
-- what the screenings pages filter on.
--
-- Nothing is public until someone marks it published. A half-typed listing
-- with a wrong phone number sends a sick person to the wrong place, so drafts
-- are the default and `verified_on` records when someone last confirmed the
-- details by calling.
--
-- Safe to run more than once.
-- =====================================================================

create table if not exists care_places (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          text not null default 'hospital'
                check (kind in ('pharmacy','cancer_centre','hospital','diagnostic_centre','clinic','laboratory','other')),
  summary       text,
  services      text[] not null default '{}',
  medicines     text,
  address       text,
  city          text,
  state         text,
  country       text not null default 'Nigeria',
  phone         text,
  phone_alt     text,
  whatsapp      text,
  email         text,
  website       text,
  hours         text,
  notes         text,
  is_partner    boolean not null default false,
  is_published  boolean not null default false,
  verified_on   date,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_care_places_kind     on care_places (kind) where is_published;
create index if not exists idx_care_places_services on care_places using gin (services);
create index if not exists idx_care_places_state    on care_places (country, state, city);

drop trigger if exists trg_care_places_updated on care_places;
create trigger trg_care_places_updated before update on care_places
  for each row execute function set_updated_at();

alter table care_places enable row level security;

-- Anyone, signed in or not, sees published listings and nothing else.
drop policy if exists pub_care_places on care_places;
create policy pub_care_places on care_places for select using (is_published);

-- Staff see drafts too (contributors and above, board included).
drop policy if exists staff_read_care_places on care_places;
create policy staff_read_care_places on care_places for select to authenticated
  using (role_rank() >= 35);

-- Directors, admins and content leads keep the list. Same people who keep
-- the rest of the national site content.
drop policy if exists write_care_places on care_places;
create policy write_care_places on care_places for insert to authenticated
  with check (can_edit_site_content());

drop policy if exists update_care_places on care_places;
create policy update_care_places on care_places for update to authenticated
  using (can_edit_site_content()) with check (can_edit_site_content());

-- Removing a listing is a director's or admin's call. Unpublishing is the
-- everyday way to take one down.
drop policy if exists delete_care_places on care_places;
create policy delete_care_places on care_places for delete to authenticated
  using (
    coalesce((select role from profiles where id = auth.uid()), 'viewer')
      in ('super_admin', 'admin', 'department_director')
    and coalesce((select status from profiles where id = auth.uid()), 'invited') = 'active'
  );

-- ── Homepage block ───────────────────────────────────────────────────
-- "Find care" sits directly after the six pillars, as a normal page section
-- so it can be moved or switched off from Dashboard → Pages like the rest.
do $$
declare home_id uuid; after_pos int;
begin
  select id into home_id from pages where slug = 'home';
  if home_id is null then
    raise notice 'No home page row; the block still shows, after the pillars.';
    return;
  end if;
  if exists (select 1 from page_sections where page_id = home_id and type = 'careAccess') then
    return;
  end if;
  select position into after_pos from page_sections where page_id = home_id and type = 'pillarCards';
  after_pos := coalesce(after_pos, 3) + 1;
  update page_sections set position = position + 1 where page_id = home_id and position >= after_pos;
  insert into page_sections (page_id, type, position, is_visible) values (home_id, 'careAccess', after_pos, true);
end $$;
