-- =====================================================================
-- AAC — 012 · Leadership on the homepage
--
-- Visitors could not find out who runs the organisation: the board was on the
-- About page, two clicks from the front door. For a young health charity
-- asking strangers to trust it with a diagnosis, "who are you" is not a
-- secondary question.
--
-- Registered as a normal page section so it can be reordered and switched off
-- from Dashboard → Homepage like every other block, rather than being
-- hard-coded into the page.
--
-- It sits directly after the impact figures: the numbers say what was done,
-- the faces say who did it, and a visitor deciding whether to trust AAC is
-- asking both questions at once.
--
-- Re-runnable.
-- =====================================================================

do $$
declare home_id uuid;
begin
  select id into home_id from pages where slug = 'home';
  if home_id is null then
    raise notice 'No home page row — run 003_seed.sql first. Nothing changed.';
    return;
  end if;

  -- Make room at position 5 by pushing everything from there down one.
  -- Guarded so re-running does not shove the list further each time.
  if not exists (
    select 1 from page_sections where page_id = home_id and type = 'leadership'
  ) then
    update page_sections
       set position = position + 1
     where page_id = home_id
       and position >= 5;

    insert into page_sections (page_id, type, position, is_visible)
    values (home_id, 'leadership', 5, true);
  end if;
end $$;
