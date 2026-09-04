-- =====================================================================
-- AAC — 008 · Deleting published writing
--
-- The `write_posts` policy from 002 grants ALL operations — delete included —
-- to an author over their own rows, at any status. So a contributor could
-- delete their own *published* article, breaking its URL for everyone who
-- ever linked to it.
--
-- The server action already refuses this, but a check that lives only in the
-- application is not a boundary: anything holding the anon key and a session
-- can call PostgREST directly. Same rule as events (007), applied where it is
-- actually enforced.
--
-- Splitting delete off means the broad `for all` policy must lose it, so the
-- remaining verbs are spelled out.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['posts','programmes','resources','pages'] loop
    execute format('drop policy if exists write_%1$s on %1$s;', t);

    -- Read, create and update: unchanged from 002.
    execute format($f$
      create policy read_%1$s on %1$s for select to authenticated
      using (role_rank() >= 60 or (can_write() and coalesce(created_by, auth.uid()) = auth.uid()));
    $f$, t);

    execute format('drop policy if exists insert_%1$s on %1$s;', t);
    execute format($f$
      create policy insert_%1$s on %1$s for insert to authenticated
      with check (role_rank() >= 60 or can_write());
    $f$, t);

    execute format('drop policy if exists update_%1$s on %1$s;', t);
    execute format($f$
      create policy update_%1$s on %1$s for update to authenticated
      using (role_rank() >= 60 or (can_write() and coalesce(created_by, auth.uid()) = auth.uid()))
      with check (role_rank() >= 60 or can_write());
    $f$, t);

    -- Delete: coordinators may remove anything; an author only their own work,
    -- and only while it has never been public.
    execute format('drop policy if exists delete_%1$s on %1$s;', t);
    execute format($f$
      create policy delete_%1$s on %1$s for delete to authenticated
      using (
        role_rank() >= 60
        or (
          status in ('draft', 'changes_requested', 'in_review')
          and can_write()
          and coalesce(created_by, auth.uid()) = auth.uid()
        )
      );
    $f$, t);
  end loop;
end $$;

-- Ordering the blog index and the sitemap by publication date; the index also
-- filters to published, so both columns belong in one index.
create index if not exists posts_published
  on posts (status, published_at desc);
