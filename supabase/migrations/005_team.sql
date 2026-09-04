-- =====================================================================
-- AAC — 005 · Leadership
--
-- The board, the department directors and the country director, exactly as
-- supplied by the founder in September 2026. Names, positions and professions
-- are verbatim; nothing here is inferred.
--
-- Photographs live in /public/team and are referenced by path. They move to
-- ImageKit later — only the `photo` jsonb changes when they do.
--
-- Three people have no photograph attached yet because the picture could not
-- be matched to the name with certainty. They are seeded published with a null
-- photo; the team card renders a monogram in that case, so the page is correct
-- and complete either way. Attach them from Dashboard → Team.
--
-- Note on `tier`: it holds one value, so the two people who sit on the board
-- AND direct a department are stored as 'director' — that is what the
-- department pages query on. Their board membership is stated in role_title,
-- which is what the About page renders.
--
-- Re-runnable: keyed on full_name.
-- =====================================================================

create unique index if not exists team_members_name_unique
  on team_members (full_name);

-- Photo helper. Width and height are the real dimensions of the processed
-- files (900×1125, a 4:5 portrait), so the browser reserves the right box and
-- the cards do not shift as images arrive.
insert into team_members
  (full_name, role_title, tier, department_id, photo, position, is_published)
values

  -- ── Founder ──────────────────────────────────────────────────────
  ('Emmanuel Chika Ugwu',
   'Founder & Executive Director · Pharmacist',
   'board', null,
   jsonb_build_object('url','/team/emmanuel-chika-ugwu.jpg',
     'alt','Emmanuel Chika Ugwu, Founder and Executive Director of All Against Cancer Initiative',
     'width',900,'height',1125),
   1, true),

  -- ── Board ────────────────────────────────────────────────────────
  ('Tobechukwu Daniel Nneji',
   'Co-founder & Board Member · Director, Medication Access and Global Partnerships · Pharmacist',
   'director',
   (select id from departments where slug = 'partnerships-fellowship'),
   null,
   2, true),

  ('Rev. Fr. Ogbodo Daniel Kenechukwu',
   'Board Member · Pharmacist and Priest of the Catholic Diocese of Enugu State, Nigeria',
   'board', null,
   jsonb_build_object('url','/team/ogbodo-daniel-kenechukwu.jpg',
     'alt','Rev. Fr. Ogbodo Daniel Kenechukwu, Board Member of All Against Cancer Initiative',
     'width',900,'height',1125),
   3, true),

  ('Boma Mary Dapper',
   'Board Member · Public Administrative Specialist and Procurement Analyst',
   'board', null,
   jsonb_build_object('url','/team/boma-mary-dapper.jpg',
     'alt','Boma Mary Dapper, Board Member of All Against Cancer Initiative',
     'width',900,'height',1125),
   4, true),

  ('James C. Igatta',
   'Board Member · Director, Awareness, Advocacy and Campaigns · Pharmacist',
   'director',
   (select id from departments where slug = 'awareness-advocacy'),
   null,
   5, true),

  ('Chinaza Ndubuisi Ekwueme',
   'Board Member · Medical Doctor',
   'board', null,
   null,
   6, true),

  ('Amarachi Jennifer Okpala',
   'Board Member · South-West Zonal Coordinator · Pharmacist',
   'board', null,
   jsonb_build_object('url','/team/amarachi-jennifer-okpala.jpg',
     'alt','Amarachi Jennifer Okpala, Board Member and South-West Zonal Coordinator',
     'width',900,'height',1125),
   7, true),

  ('Owoh Chioma Chinedum',
   'Board Member · North Central Coordinator · Pharmacist',
   'board', null,
   jsonb_build_object('url','/team/owoh-chioma-chinedum.jpg',
     'alt','Owoh Chioma Chinedum, Board Member and North Central Coordinator',
     'width',900,'height',1125),
   8, true),

  -- ── Directors ────────────────────────────────────────────────────
  ('Dr. Okhesomi R. Eshemokhai',
   'Director, Patient and Survivor Support · Medical Doctor',
   'director',
   (select id from departments where slug = 'patient-support'),
   jsonb_build_object('url','/team/okhesomi-eshemokhai.jpg',
     'alt','Dr. Okhesomi R. Eshemokhai, Director of Patient and Survivor Support',
     'width',900,'height',1125),
   9, true),

  ('Emmanuel Acquah',
   'Country Director, Ghana · Cancer Researcher and Medical Laboratory Scientist',
   'director', null,
   jsonb_build_object('url','/team/emmanuel-acquah.jpg',
     'alt','Emmanuel Acquah, Country Director for Ghana',
     'width',900,'height',1125),
   10, true)

on conflict (full_name) do update set
  role_title    = excluded.role_title,
  tier          = excluded.tier,
  department_id = excluded.department_id,
  -- Never overwrite a photograph someone has since attached in the dashboard.
  photo         = coalesce(team_members.photo, excluded.photo),
  position      = excluded.position,
  is_published  = excluded.is_published,
  updated_at    = now();
