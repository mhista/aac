-- =====================================================================
-- AAC — 007 · Deleting events
--
-- Deletion was admin-only (rank >= 80), which in practice meant nobody could
-- clear a mistyped draft without messaging the one person who can. That is
-- how an events list fills with "Untitled event" and stops being trusted.
--
-- The rule now distinguishes between the two very different acts that were
-- previously the same permission:
--
--   · Removing something that was never public — a draft, a rejected
--     submission, a duplicate. Low stakes, and the person who made it should
--     be able to clean up after themselves.
--   · Removing something that IS public. A published event has a URL that may
--     be linked from a report, a partner's site or a funding application, and
--     deleting it breaks those links silently. That stays with people who can
--     publish in the first place.
--
-- Both are still recorded in audit_log by the server action, so a deletion is
-- never anonymous.
-- =====================================================================

drop policy if exists events_delete on events;
create policy events_delete on events for delete to authenticated
  using (
    -- Coordinators and above may delete anything in their remit, published
    -- included.
    role_rank() >= 60
    or (
      -- Everyone else: only their own work, and only while it is not public.
      status in ('draft', 'changes_requested', 'in_review')
      and role_rank() >= 35
      and (created_by = auth.uid() or chapter_id = my_chapter())
    )
  );

-- Photographs attached to an event already cascade (event_media.event_id has
-- ON DELETE CASCADE). The underlying files in media_assets deliberately do
-- NOT go — they belong to the shared library and may be in use elsewhere.
