-- =====================================================================
-- AAC — 004 · Application waitlist
--
-- Applications are not always open. Rather than showing a closed door,
-- the site collects a name, an email and a country, and AAC emails those
-- people in a batch when an intake opens.
--
-- Two things this table takes seriously:
--
--   1. Consent. Every row carries the exact wording the person agreed to
--      (`consent_text`), when (`consent_at`), and from which page
--      (`source_path`). If anyone ever asks why they received an email,
--      the answer is one query away.
--   2. Unsubscribe. `unsubscribe_token` is generated at insert. Every
--      batch email must carry it. A person who unsubscribes keeps their
--      row (so we do not re-add them from a later duplicate submission)
--      but is filtered out of every send.
--
-- The public may INSERT and nothing else. Reading the list — which is a
-- list of real people's contact details — needs rank >= 50.
-- =====================================================================

create table if not exists application_waitlist (
  id                uuid primary key default gen_random_uuid(),

  -- What they are waiting for. Matches the `interest` prop on ApplyPanel.
  interest          text not null
                    check (interest in ('advocate','fellowship','chapter','volunteer','other')),

  full_name         text not null,
  email             text not null,
  country           text,
  phone             text,

  -- Optional and deliberately short. One sentence, not an application.
  note              text,

  -- Chapter applicants tell us where they are.
  institution       text,

  -- Provenance and consent.
  source_path       text,
  consent_text      text not null,
  consent_at        timestamptz not null default now(),

  -- Batch-email state.
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  notified_at       timestamptz,
  notify_count      int not null default 0,
  last_error        text,

  -- Light triage for whoever works the list.
  status            text not null default 'new'
                    check (status in ('new','notified','applied','declined','spam')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One row per person per thing they are waiting for. A second submission
-- refreshes their details rather than creating a duplicate — see the
-- upsert in lib/waitlist/actions.ts.
-- Case-insensitive, so Ada@ and ada@ are the same person. Done with an
-- expression index rather than citext to avoid depending on an extension.
create unique index if not exists application_waitlist_unique
  on application_waitlist (lower(email), interest);

create index if not exists application_waitlist_pending
  on application_waitlist (interest, created_at desc)
  where unsubscribed_at is null and status not in ('spam','declined');

create unique index if not exists application_waitlist_token
  on application_waitlist (unsubscribe_token);

drop trigger if exists set_updated_at on application_waitlist;
create trigger set_updated_at before update on application_waitlist
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
alter table application_waitlist enable row level security;

-- Anyone may join. They may not read the list back, so this cannot be
-- used to enumerate who else has signed up.
drop policy if exists waitlist_public_join on application_waitlist;
create policy waitlist_public_join on application_waitlist
  for insert with check (true);

-- Reading is contact data. Coordinator and above.
drop policy if exists waitlist_staff_read on application_waitlist;
create policy waitlist_staff_read on application_waitlist
  for select to authenticated using (role_rank() >= 50);

drop policy if exists waitlist_staff_update on application_waitlist;
create policy waitlist_staff_update on application_waitlist
  for update to authenticated
  using (role_rank() >= 50) with check (role_rank() >= 50);

-- Deleting people's records is an admin act.
drop policy if exists waitlist_admin_delete on application_waitlist;
create policy waitlist_admin_delete on application_waitlist
  for delete to authenticated using (role_rank() >= 80);

-- ── Unsubscribe ──────────────────────────────────────────────────────
-- Called from the public unsubscribe page. Security definer so it works
-- for a signed-out person holding a token, while the table itself stays
-- unreadable to anon. Returns true only if the token matched, so the page
-- can tell "done" from "that link is not valid".
create or replace function public.waitlist_unsubscribe(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare hit int;
begin
  update application_waitlist
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token = p_token;
  get diagnostics hit = row_count;
  return hit > 0;
end $$;

revoke all on function public.waitlist_unsubscribe(uuid) from public;
grant execute on function public.waitlist_unsubscribe(uuid) to anon, authenticated;

-- ── Feature flags ────────────────────────────────────────────────────
-- Backfill the applications flags for databases seeded before 003 gained
-- them, so an existing project does not need re-seeding.
update site_settings
   set feature_flags = feature_flags
     || jsonb_build_object(
          'applications_open',
          coalesce(feature_flags -> 'applications_open', 'false'::jsonb),
          'applications_closed_note',
          coalesce(feature_flags -> 'applications_closed_note', 'null'::jsonb),
          'application_forms',
          coalesce(feature_flags -> 'application_forms', '[]'::jsonb)
        )
 where id = 1;
