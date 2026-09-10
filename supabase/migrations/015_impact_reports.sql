-- =====================================================================
-- AAC — 015 · Impact reports, scoped to the chapter they belong to
--
-- 002 gave coordinators `role_rank() >= 50` on this table, which in a
-- single-chapter world was fine and now is not: it lets any campus
-- coordinator read, edit and VERIFY another campus's reports. Verification is
-- what turns a claim into a number the organisation publishes, so it is the
-- last place a scoping gap should survive.
--
-- Brought in line with 013: reach is decided by `can_reach_chapter`, so a
-- campus coordinator verifies their own campus, a zonal coordinator their
-- zone, and directors and admins everything.
--
-- WHY THIS TABLE MATTERS. The impact figures on the public site are supposed
-- to be traceable to something that happened. This is that something. A
-- verified report is evidence; an unverified one is a claim. Keeping the two
-- apart is the difference between "800+ advocates, 5 patients supported" being
-- true and being marketing.
-- =====================================================================

-- Reports belong to a chapter. Older rows may predate the column being filled,
-- so backfill from the person who filed them before anything starts relying
-- on it.
update impact_reports r
   set chapter_id = p.chapter_id
  from profiles p
 where r.advocate_id = p.id
   and r.chapter_id is null
   and p.chapter_id is not null;

create index if not exists impact_reports_chapter on impact_reports (chapter_id, status);
create index if not exists impact_reports_date on impact_reports (activity_date desc);

drop policy if exists impact_reports_own on impact_reports;
drop policy if exists impact_reports_insert on impact_reports;
drop policy if exists impact_reports_update on impact_reports;
drop policy if exists impact_reports_delete on impact_reports;

-- Read: your own reports always, plus anything in your patch.
create policy impact_reports_read on impact_reports for select to authenticated
  using (
    advocate_id = auth.uid()
    or (chapter_id is not null and can_reach_chapter(chapter_id))
    or role_rank() >= 60
  );

-- File one for yourself, or for a chapter you actually cover.
create policy impact_reports_insert on impact_reports for insert to authenticated
  with check (
    can_write()
    and (
      advocate_id = auth.uid()
      or (chapter_id is not null and can_reach_chapter(chapter_id))
    )
  );

-- Edit your own while it is still open, or anything in your patch.
create policy impact_reports_update on impact_reports for update to authenticated
  using (
    (advocate_id = auth.uid() and status in ('draft', 'submitted'))
    or (role_rank() >= 50 and chapter_id is not null and can_reach_chapter(chapter_id))
    or role_rank() >= 60
  )
  with check (
    (advocate_id = auth.uid() and status in ('draft', 'submitted'))
    or (role_rank() >= 50 and chapter_id is not null and can_reach_chapter(chapter_id))
    or role_rank() >= 60
  );

create policy impact_reports_delete on impact_reports for delete to authenticated
  using (
    (advocate_id = auth.uid() and status = 'draft')
    or role_rank() >= 80
  );

-- ── Verifying is not the same as editing ─────────────────────────────
-- Anyone who may touch the row could otherwise set status = 'verified' on
-- their own report, which would make verification a formality. Postgres has no
-- column-level UPDATE in RLS, so this is a trigger.
create or replace function public.guard_verification()
returns trigger language plpgsql as $$
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    if new.advocate_id = auth.uid() and role_rank() < 60 then
      raise exception 'You cannot verify your own report. A coordinator above you does that.';
    end if;
    if role_rank() < 50 then
      raise exception 'Only a coordinator can verify a report.';
    end if;
    new.verified_by := auth.uid();
    new.verified_at := now();
  end if;

  /* Editing a verified report silently would change a published figure after
     the fact. Reopening it is allowed and explicit; changing it in place is
     not. */
  if old.status = 'verified' and new.status = 'verified'
     and (new.people_reached is distinct from old.people_reached) then
    if role_rank() < 60 then
      raise exception 'This report is verified. Reopen it before changing the number of people reached.';
    end if;
  end if;

  if new.status is distinct from 'verified' then
    new.verified_by := null;
    new.verified_at := null;
  end if;

  return new;
end $$;

drop trigger if exists impact_reports_verify_guard on impact_reports;
create trigger impact_reports_verify_guard before update on impact_reports
  for each row execute function public.guard_verification();

-- ── The number the organisation can actually stand behind ────────────
-- One place that answers "how many people have we reached", counting only
-- verified reports. Anything else would be a claim.
create or replace function public.verified_reach(p_chapter uuid default null)
returns table (people bigint, reports bigint)
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(people_reached), 0)::bigint, count(*)::bigint
    from impact_reports
   where status = 'verified'
     and (p_chapter is null or chapter_id = p_chapter);
$$;

grant execute on function public.verified_reach(uuid) to authenticated;
