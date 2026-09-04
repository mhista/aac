-- =====================================================================
-- AAC — 001 · Schema
-- All Against Cancer Initiative · CMS + CRM foundation
--
-- Run this first, in the Supabase SQL editor. Then 002_rls.sql, then
-- 003_seed.sql. Each is idempotent enough to re-run safely.
--
-- Design notes that matter:
--   · Roles are global tiers; SCOPE (chapter / region / department) is a
--     separate column. That separation is what stops the permission model
--     exploding into role×scope combinations.
--   · Every content table shares the same publishing spine, so one set of
--     policies and one editor UI covers all of them.
--   · media_assets.alt_text is NOT NULL. Accessibility enforced by the
--     schema rather than by goodwill.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── Enums ────────────────────────────────────────────────────────────
do $$ begin
  create type app_role as enum (
    'super_admin','board_member','admin','department_director',
    'regional_coordinator','campus_coordinator','content_lead',
    'contributor','advocate','viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum (
    'draft','in_review','changes_requested','scheduled','published','archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_status as enum ('invited','active','suspended','alumni');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_kind as enum ('advocate','fellowship','volunteer','chapter','partner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum (
    'applied','screening','interview','accepted','onboarded','active','rejected','alumni'
  );
exception when duplicate_object then null; end $$;

-- ── Organisation ─────────────────────────────────────────────────────
create table if not exists regions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  countries   text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists chapters (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  university    text not null,
  city          text,
  country       text not null,
  region_id     uuid references regions(id) on delete set null,
  member_count  int,
  status        text not null default 'active'
                check (status in ('pending','active','dormant','closed')),
  founded_at    date,
  lat           numeric(9,6),
  lng           numeric(9,6),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (university, country)
);

-- Profiles mirror auth.users. Role is the tier; the three scope columns say
-- WHERE that tier applies.
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  email          text unique,
  avatar_url     text,
  phone          text,
  role           app_role not null default 'advocate',
  chapter_id     uuid references chapters(id) on delete set null,
  region_id      uuid references regions(id) on delete set null,
  department_id  uuid references departments(id) on delete set null,
  status         profile_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table chapters
  add column if not exists head_profile_id uuid references profiles(id) on delete set null;
alter table departments
  add column if not exists director_profile_id uuid references profiles(id) on delete set null;
alter table regions
  add column if not exists lead_profile_id uuid references profiles(id) on delete set null;

create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        app_role not null default 'advocate',
  chapter_id  uuid references chapters(id) on delete set null,
  region_id   uuid references regions(id) on delete set null,
  token       text not null unique default encode(gen_random_bytes(24),'hex'),
  invited_by  uuid references profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ── Media ────────────────────────────────────────────────────────────
create table if not exists media_assets (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'image' check (kind in ('image','video','document')),
  imagekit_file_id  text,
  imagekit_path     text,
  drive_file_id     text,
  drive_url         text,
  url               text not null,
  filename          text,
  mime_type         text,
  width             int,
  height            int,
  duration_s        numeric,
  size_bytes        bigint,
  lqip              text,
  focal_x           numeric(4,3) default 0.5,
  focal_y           numeric(4,3) default 0.5,
  -- Not null on purpose: an image cannot be saved without a description.
  alt_text          text not null,
  caption           text,
  credit            text,
  licence           text,
  source_url        text,
  consent_on_file   boolean not null default false,
  tags              text[] not null default '{}',
  folder            text,
  chapter_id        uuid references chapters(id) on delete set null,
  uploaded_by       uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table if not exists media_usage (
  asset_id    uuid not null references media_assets(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid not null,
  primary key (asset_id, entity_type, entity_id)
);

-- ── Content ──────────────────────────────────────────────────────────
create table if not exists categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null,
  kind         text not null check (kind in ('post','event','programme','resource')),
  colour_token text default 'awareness',
  position     int not null default 0,
  unique (kind, slug)
);

create table if not exists events (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  subtitle              text,
  event_type            text,
  body                  text,
  cover                 jsonb,
  starts_at             timestamptz,
  ends_at               timestamptz,
  venue                 text,
  city                  text,
  country               text,
  attendance            int,
  screenings_done       int,
  materials_distributed int,
  partner_ids           uuid[] default '{}',
  report_asset_id       uuid references media_assets(id) on delete set null,
  is_featured           boolean not null default false,
  display_index         int,
  status                content_status not null default 'draft',
  published_at          timestamptz,
  scheduled_for         timestamptz,
  seo                   jsonb not null default '{}'::jsonb,
  chapter_id            uuid references chapters(id) on delete set null,
  created_by            uuid references profiles(id) on delete set null,
  updated_by            uuid references profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists event_media (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references events(id) on delete cascade,
  asset_id  uuid references media_assets(id) on delete set null,
  url       text not null,
  alt       text not null,
  width     int,
  height    int,
  lqip      text,
  caption   text,
  credit    text,
  position  int not null default 0
);

create table if not exists posts (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  excerpt              text,
  body                 text,
  cover                jsonb,
  category             jsonb,
  category_slug        text,
  tags                 text[] default '{}',
  read_minutes         int,
  author               jsonb,
  author_id            uuid references profiles(id) on delete set null,
  medically_reviewed_by text,
  reviewed_at          timestamptz,
  status               content_status not null default 'draft',
  published_at         timestamptz,
  scheduled_for        timestamptz,
  seo                  jsonb not null default '{}'::jsonb,
  chapter_id           uuid references chapters(id) on delete set null,
  created_by           uuid references profiles(id) on delete set null,
  updated_by           uuid references profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists programmes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  subtitle      text,
  excerpt       text,
  body          text,
  pillar        text,
  cover         jsonb,
  status_label  text,
  target_reach  int,
  actual_reach  int,
  start_date    date,
  end_date      date,
  locations     text[] default '{}',
  partner_ids   uuid[] default '{}',
  status        content_status not null default 'draft',
  published_at  timestamptz,
  scheduled_for timestamptz,
  seo           jsonb not null default '{}'::jsonb,
  created_by    uuid references profiles(id) on delete set null,
  updated_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists team_members (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  role_title    text,
  tier          text check (tier in ('board','director','regional','campus')),
  department_id uuid references departments(id) on delete set null,
  bio           text,
  photo         jsonb,
  linkedin      text,
  position      int not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists partners (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  logo         jsonb,
  url          text,
  tier         text,
  position     int not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null,
  author_name  text not null,
  author_role  text,
  photo        jsonb,
  kind         text,
  consent_on_file boolean not null default false,
  position     int not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists faqs (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null,
  category     text,
  position     int not null default 0,
  is_published boolean not null default false
);

-- Impact metrics. value_display is TEXT so "800+" and "5" and "0" are all
-- exact. A null value renders the "measurement in progress" state — never
-- an estimate, never a rounded-up number.
create table if not exists impact_metrics (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,
  label             text not null,
  value_numeric     numeric,
  value_display     text,
  unit              text,
  as_of             date,
  is_headline       boolean not null default false,
  position          int not null default 0,
  methodology_note  text,
  chapter_id        uuid references chapters(id) on delete set null,
  is_published      boolean not null default true,
  updated_at        timestamptz not null default now()
);

create table if not exists publications (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  authors      text,
  journal      text,
  year         int,
  doi          text,
  url          text,
  abstract     text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists resources (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  file_asset_id  uuid references media_assets(id) on delete set null,
  resource_type  text,
  language       text default 'en',
  download_count int not null default 0,
  status         content_status not null default 'draft',
  published_at   timestamptz,
  scheduled_for  timestamptz,
  created_by     uuid references profiles(id) on delete set null,
  updated_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Page builder ─────────────────────────────────────────────────────
create table if not exists pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  status       content_status not null default 'draft',
  published_at timestamptz,
  seo          jsonb not null default '{}'::jsonb,
  created_by   uuid references profiles(id) on delete set null,
  updated_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists page_sections (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references pages(id) on delete cascade,
  type       text not null,
  position   int not null default 0,
  is_visible boolean not null default true,
  config     jsonb not null default '{}'::jsonb,
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── CRM ──────────────────────────────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'individual',
  full_name       text not null,
  email           text,
  phone           text,
  organisation    text,
  country         text,
  chapter_id      uuid references chapters(id) on delete set null,
  tags            text[] default '{}',
  owner_id        uuid references profiles(id) on delete set null,
  source          text,
  notes           text,
  consent_marketing boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists applications (
  id             uuid primary key default gen_random_uuid(),
  kind           application_kind not null,
  contact_id     uuid references contacts(id) on delete set null,
  chapter_id     uuid references chapters(id) on delete set null,
  region_id      uuid references regions(id) on delete set null,
  payload        jsonb not null default '{}'::jsonb,
  status         application_status not null default 'applied',
  score          int,
  reviewer_id    uuid references profiles(id) on delete set null,
  reviewer_notes text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references contacts(id) on delete cascade,
  type        text not null,
  subject     text,
  body        text,
  occurred_at timestamptz not null default now(),
  created_by  uuid references profiles(id) on delete set null
);

-- The technical backbone of the Certificate of Impact: advocates report,
-- coordinators verify, verified totals roll up into impact_metrics.
create table if not exists impact_reports (
  id                uuid primary key default gen_random_uuid(),
  advocate_id       uuid references profiles(id) on delete set null,
  chapter_id        uuid references chapters(id) on delete set null,
  title             text not null,
  description       text,
  people_reached    int,
  activity_date     date,
  evidence_asset_ids uuid[] default '{}',
  status            text not null default 'submitted'
                    check (status in ('draft','submitted','verified','rejected')),
  verified_by       uuid references profiles(id) on delete set null,
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists form_submissions (
  id         uuid primary key default gen_random_uuid(),
  form_type  text not null,
  payload    jsonb not null default '{}'::jsonb,
  ip_hash    text,
  user_agent text,
  status     text not null default 'new' check (status in ('new','read','actioned','spam')),
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','unsubscribed','bounced')),
  confirmed_at   timestamptz,
  unsubscribed_at timestamptz,
  source         text,
  created_at     timestamptz not null default now()
);

-- ── System ───────────────────────────────────────────────────────────
create table if not exists site_settings (
  id             int primary key default 1 check (id = 1),
  org            jsonb not null default '{}'::jsonb,
  contact        jsonb not null default '{}'::jsonb,
  socials        jsonb not null default '{}'::jsonb,
  seo_defaults   jsonb not null default '{}'::jsonb,
  feature_flags  jsonb not null default '{}'::jsonb,
  maintenance_mode boolean not null default false,
  updated_at     timestamptz not null default now()
);

create table if not exists navigation (
  id         uuid primary key default gen_random_uuid(),
  location   text not null unique,
  items      jsonb not null default '[]'::jsonb,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists redirects (
  id          uuid primary key default gen_random_uuid(),
  source      text not null unique,
  destination text not null,
  permanent   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists revisions (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Append-only. UPDATE and DELETE are revoked in 002_rls.sql.
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  diff        jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists idx_events_status_date  on events (status, starts_at desc);
create index if not exists idx_events_chapter      on events (chapter_id);
create index if not exists idx_posts_status_date   on posts (status, published_at desc);
create index if not exists idx_programmes_status   on programmes (status);
create index if not exists idx_event_media_event   on event_media (event_id, position);
create index if not exists idx_profiles_role       on profiles (role);
create index if not exists idx_profiles_chapter    on profiles (chapter_id);
create index if not exists idx_applications_status on applications (status, kind);
create index if not exists idx_contacts_chapter    on contacts (chapter_id);
create index if not exists idx_audit_created       on audit_log (created_at desc);
create index if not exists idx_page_sections_page  on page_sections (page_id, position);

-- ── updated_at trigger ───────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'chapters','profiles','events','posts','programmes','team_members',
    'pages','page_sections','contacts','applications','impact_metrics','resources'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ── New auth user → profile ──────────────────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
