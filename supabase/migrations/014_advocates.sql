-- =====================================================================
-- AAC — 014 · Advocates
--
-- The 800+ people who have joined AAC applied through two Google Forms, one
-- for Nigeria and one for Ghana. This table is shaped to match those forms
-- question for question, so that:
--
--   · the existing responses can be imported without losing or guessing at
--     anything, and
--   · the form on the website collects the same facts, so the two sets of
--     people are one set of people rather than two that have to be reconciled
--     by hand later.
--
-- WHY TYPED COLUMNS AND NOT A JSONB BLOB. `applications.payload` already
-- exists and would have held this with no migration at all. But the questions
-- people will actually ask of this data — how many health professionals in
-- Enugu, who ticked Campus Coordination, which chapters have nobody near them
-- — are filters, and a filter over JSON is something only a developer can
-- write. Columns mean the dashboard can offer those as menus.
--
-- The two forms differ in exactly one place: Nigeria asks "State of
-- residence", Ghana asks "Region of Residence & District / Municipality".
-- Both are "where in the country do you live", so both land in `locality`
-- and the label changes by country in the interface.
-- =====================================================================

create table if not exists advocates (
  id            uuid primary key default gen_random_uuid(),

  -- ── Who ────────────────────────────────────────────────────────────
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text,

  /* Gender is a checkbox group on the Google Form, not a radio, so a response
     can legitimately carry more than one value. Storing it as an array is not
     a design opinion — it is what the existing data looks like, and coercing
     it to a single value on import would silently drop answers. */
  gender        text[] not null default '{}',
  age_range     text,

  -- ── Where ──────────────────────────────────────────────────────────
  country       text not null default 'Nigeria',
  locality      text,
  chapter_id    uuid references chapters(id) on delete set null,

  -- ── How they want to be involved ───────────────────────────────────
  profile_kind  text,
  interests     text[] not null default '{}',
  involvement   text,
  motivation    text,

  -- ── Students ───────────────────────────────────────────────────────
  school        text,
  faculty       text,
  study_level   text,

  -- ── Health professionals ───────────────────────────────────────────
  professional_title text,
  workplace          text,
  years_experience   text,

  -- ── Non-health volunteers ──────────────────────────────────────────
  occupation    text,

  -- ── Administration ─────────────────────────────────────────────────
  /* Where this row came from. Kept because "who are the people we already had
     versus who arrived since the website went up" is a question worth being
     able to answer, and because an import that goes wrong can be undone by
     source without touching anybody who signed up on the site. */
  source        text not null default 'website',
  submitted_at  timestamptz not null default now(),

  status        text not null default 'new'
                check (status in ('new','reviewing','accepted','active','declined','dormant')),
  reviewer_id   uuid references profiles(id) on delete set null,
  notes         text,

  /* Consent to general updates. Deliberately NOT defaulted to true on import:
     the Google Form never asked, so claiming these 800 people opted into a
     newsletter would be inventing a permission they never gave. They applied
     to join, which is consent to be contacted about their application — the
     website form asks the marketing question separately and honestly. */
  consent_updates boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

/* One row per person.
   Someone who typed Ada@ on the Google Form and ada@ on the website is one
   person, and an import that creates a second row for them makes the count
   wrong forever. The obvious way to express that is a unique index on
   lower(email) — but an expression index cannot be named as a conflict target
   by the client library, so every upsert would have to be hand-written SQL.
   Normalising the column on the way in gives the same guarantee and keeps
   `on conflict (email)` available to everything. */
create or replace function public.normalise_advocate_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;

drop trigger if exists advocates_email_lower on advocates;
create trigger advocates_email_lower before insert or update of email on advocates
  for each row execute function public.normalise_advocate_email();

/* Fold any rows that pre-date the trigger before the constraint is applied,
   so re-running this file on a database that already has data cannot fail. */
update advocates set email = lower(trim(email)) where email <> lower(trim(email));

create unique index if not exists advocates_email_unique on advocates (email);

create index if not exists advocates_country  on advocates (country);
create index if not exists advocates_status   on advocates (status);
create index if not exists advocates_kind     on advocates (profile_kind);
create index if not exists advocates_chapter  on advocates (chapter_id);
create index if not exists advocates_created  on advocates (created_at desc);
create index if not exists advocates_interests on advocates using gin (interests);

/* Free-text search over the fields a coordinator would actually type into a
   search box. A trigram index rather than full-text, because people search for
   fragments of names and schools, not for words in a document. */
create extension if not exists pg_trgm;
create index if not exists advocates_search on advocates using gin (
  (coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' ||
   coalesce(email,'') || ' ' || coalesce(school,'') || ' ' ||
   coalesce(locality,'')) gin_trgm_ops
);

drop trigger if exists advocates_touch on advocates;
create trigger advocates_touch before update on advocates
  for each row execute function set_updated_at();

-- ── Access ───────────────────────────────────────────────────────────
-- This is personal data: names, phone numbers, and in the motivation field
-- sometimes a cancer diagnosis in the family. It is the most sensitive table
-- in the database and it is treated that way.
--
--   · No public read. Not ever. There is no policy for anon.
--   · Coordinators see the people in their own patch, using the same reach
--     rule as content, so a campus coordinator sees their campus.
--   · Signing up is a public INSERT, and nothing more — a form submission
--     cannot read anything back, cannot set a status, and cannot see whether
--     the address is already registered.
alter table advocates enable row level security;

drop policy if exists advocates_read on advocates;
create policy advocates_read on advocates for select to authenticated
  using (
    role_rank() >= 60
    or coalesce((select role::text from profiles where id = auth.uid()), '') in
       ('super_admin','admin','department_director','board_member')
    or (chapter_id is not null and can_reach_chapter(chapter_id))
  );

drop policy if exists advocates_insert_public on advocates;
create policy advocates_insert_public on advocates for insert to anon, authenticated
  with check (true);

drop policy if exists advocates_update on advocates;
create policy advocates_update on advocates for update to authenticated
  using (role_rank() >= 50 and (chapter_id is null or can_reach_chapter(chapter_id)))
  with check (role_rank() >= 50 and (chapter_id is null or can_reach_chapter(chapter_id)));

/* Deleting a person's record is a data-protection act — an erasure request,
   or clearing up a bad import. Admins only. */
drop policy if exists advocates_delete on advocates;
create policy advocates_delete on advocates for delete to authenticated
  using (role_rank() >= 80);

-- ── Signing up must not be a way to read the list ─────────────────────
-- A plain INSERT from the public form fails loudly on a duplicate email, and
-- the error message would tell an attacker that address is registered. This
-- function swallows that: registering twice quietly updates the existing row
-- and reports success either way, so the form can never be used to test
-- whether somebody is a member.
create or replace function public.register_advocate(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(payload->>'email'));
begin
  if e is null or e = '' or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'A valid email address is required.';
  end if;

  insert into advocates (
    first_name, last_name, email, phone, gender, age_range, country, locality,
    profile_kind, interests, involvement, motivation,
    school, faculty, study_level,
    professional_title, workplace, years_experience, occupation,
    source, consent_updates
  ) values (
    trim(payload->>'first_name'),
    trim(payload->>'last_name'),
    e,
    nullif(trim(coalesce(payload->>'phone','')), ''),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'gender')), '{}'),
    nullif(payload->>'age_range',''),
    coalesce(nullif(payload->>'country',''), 'Nigeria'),
    nullif(trim(coalesce(payload->>'locality','')), ''),
    nullif(payload->>'profile_kind',''),
    coalesce((select array_agg(value::text) from jsonb_array_elements_text(payload->'interests')), '{}'),
    nullif(payload->>'involvement',''),
    nullif(trim(coalesce(payload->>'motivation','')), ''),
    nullif(trim(coalesce(payload->>'school','')), ''),
    nullif(trim(coalesce(payload->>'faculty','')), ''),
    nullif(trim(coalesce(payload->>'study_level','')), ''),
    nullif(trim(coalesce(payload->>'professional_title','')), ''),
    nullif(trim(coalesce(payload->>'workplace','')), ''),
    nullif(payload->>'years_experience',''),
    nullif(trim(coalesce(payload->>'occupation','')), ''),
    'website',
    coalesce((payload->>'consent_updates')::boolean, false)
  )
  on conflict (email) do update set
    /* A second submission is almost always someone correcting themselves, so
       take the new answers — but never let it reset an application a
       coordinator has already acted on. */
    first_name   = excluded.first_name,
    last_name    = excluded.last_name,
    phone        = coalesce(excluded.phone, advocates.phone),
    gender       = excluded.gender,
    age_range    = coalesce(excluded.age_range, advocates.age_range),
    country      = excluded.country,
    locality     = coalesce(excluded.locality, advocates.locality),
    profile_kind = coalesce(excluded.profile_kind, advocates.profile_kind),
    interests    = excluded.interests,
    involvement  = coalesce(excluded.involvement, advocates.involvement),
    motivation   = coalesce(excluded.motivation, advocates.motivation),
    school       = coalesce(excluded.school, advocates.school),
    faculty      = coalesce(excluded.faculty, advocates.faculty),
    study_level  = coalesce(excluded.study_level, advocates.study_level),
    professional_title = coalesce(excluded.professional_title, advocates.professional_title),
    workplace    = coalesce(excluded.workplace, advocates.workplace),
    years_experience = coalesce(excluded.years_experience, advocates.years_experience),
    occupation   = coalesce(excluded.occupation, advocates.occupation),
    consent_updates = excluded.consent_updates,
    updated_at   = now();
end $$;

revoke all on function public.register_advocate(jsonb) from public;
grant execute on function public.register_advocate(jsonb) to anon, authenticated;
