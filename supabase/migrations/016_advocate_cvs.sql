-- =====================================================================
-- AAC — 016 · CVs
--
-- Advocates can attach a CV when they apply. It is optional, and it is the
-- only file this project stores that is genuinely private.
--
-- WHY NOT IMAGEKIT. Every other upload here — event photographs, portraits —
-- goes to ImageKit, because those are published. ImageKit URLs are public and
-- unauthenticated by design: anybody holding the address can read the file,
-- and addresses leak. A CV carries a person's phone number, their employer,
-- often their home town. Putting one behind a guessable public URL would be
-- handing out personal data to anyone who wandered past.
--
-- So CVs live in a PRIVATE Supabase Storage bucket with no public read at all.
-- Coordinators reach them through a signed link the server mints on request,
-- valid for minutes, which also means access can be reasoned about: a link in
-- somebody's browser history stops working.
-- =====================================================================

alter table advocates add column if not exists cv_path text;
alter table advocates add column if not exists cv_filename text;
alter table advocates add column if not exists cv_uploaded_at timestamptz;

/* The extracted text. Kept alongside the file for two reasons: it makes CVs
   searchable from the dashboard without downloading forty of them, and it is
   what gets summarised, so the original never has to be re-read. */
alter table advocates add column if not exists cv_text text;

/* The structured reading — skills, education, years of experience. Written by
   the summariser, and deliberately separate from cv_text so a bad parse can be
   cleared and redone without losing the source text. */
alter table advocates add column if not exists cv_summary jsonb;
alter table advocates add column if not exists cv_parsed_at timestamptz;

/* Searching CVs is the point of storing the text. Trigram rather than
   full-text: coordinators search for "oncology", "UNTH", "phlebotomy" —
   fragments and proper nouns, not natural-language queries. */
create index if not exists advocates_cv_text on advocates using gin (cv_text gin_trgm_ops);

-- ── The bucket ───────────────────────────────────────────────────────
-- `public = false`. Everything below depends on that being false.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advocate-cvs',
  'advocate-cvs',
  false,
  5242880,                                    -- 5MB. A CV is not a photo album.
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Who may touch a stored CV ────────────────────────────────────────
-- Nobody, through the API. Not anon, not authenticated, not coordinators.
--
-- That is not an oversight. Uploads arrive through a server action holding the
-- service role key, which validates the file first; reads happen through a
-- signed URL the server mints after checking the person's reach. Granting a
-- broad storage policy as well would add a second, weaker door to the same
-- room — and storage policies cannot express "only the coordinator whose
-- chapter this advocate belongs to", which is the rule that actually matters.
--
-- Any policy left over from an earlier attempt is removed rather than left
-- sitting there granting something nobody remembers granting.
drop policy if exists "advocate cvs public read" on storage.objects;
drop policy if exists "advocate cvs authenticated read" on storage.objects;
drop policy if exists "advocate cvs insert" on storage.objects;

-- ── Deleting a person deletes their CV ───────────────────────────────
-- An erasure request has to actually erase. The row going without the file
-- going would leave the document in the bucket with nothing pointing at it —
-- undiscoverable, undeletable through the interface, and still personal data.
--
-- The file itself is removed by the application before the row is deleted;
-- this records the orphan if that ever fails, so it can be swept up rather
-- than lost.
create table if not exists storage_orphans (
  id         uuid primary key default gen_random_uuid(),
  bucket     text not null,
  path       text not null,
  noted_at   timestamptz not null default now(),
  cleared_at timestamptz
);

alter table storage_orphans enable row level security;

drop policy if exists storage_orphans_admin on storage_orphans;
create policy storage_orphans_admin on storage_orphans for all to authenticated
  using (role_rank() >= 80) with check (role_rank() >= 80);

create or replace function public.note_cv_orphan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.cv_path is not null then
    insert into storage_orphans (bucket, path) values ('advocate-cvs', old.cv_path);
  end if;
  return old;
end $$;

drop trigger if exists advocates_cv_orphan on advocates;
create trigger advocates_cv_orphan before delete on advocates
  for each row execute function public.note_cv_orphan();
