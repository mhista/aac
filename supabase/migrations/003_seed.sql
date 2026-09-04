-- =====================================================================
-- AAC — 003 · Seed
--
-- Real, verified data only. Nothing invented, nothing padded.
-- The impact figures here are the ones AAC supplied, dated September 2026.
-- Note `patients_supported` is 5 — not "5+". `drug_access_support` is 0 and
-- is seeded unpublished until there is something to report.
-- =====================================================================

-- ── Departments ──────────────────────────────────────────────────────
insert into departments (name, slug, description) values
  ('Awareness & Advocacy',       'awareness-advocacy',
   'Campaigns, community education and public advocacy.'),
  ('Patient & Survivor Support', 'patient-support',
   'Support for patients, survivors and caregivers, and medication access.'),
  ('Research & Innovation',      'research-innovation',
   'Research, evidence generation and the UgwuMind innovation programme.'),
  ('Partnerships & Fellowship',  'partnerships-fellowship',
   'Institutional partnerships, chapters and the AAC Fellowship.')
on conflict (slug) do nothing;

-- ── Regions ──────────────────────────────────────────────────────────
insert into regions (name, countries) values
  ('West Africa', array['Nigeria','Ghana']),
  ('East Africa', array['Kenya'])
on conflict (name) do nothing;

-- ── Categories ───────────────────────────────────────────────────────
insert into categories (name, slug, kind, colour_token, position) values
  ('Prevention',        'prevention',        'post', 'prevention', 1),
  ('Survivor Stories',  'survivor-stories',  'post', 'support',    2),
  ('Research',          'research',          'post', 'research',   3),
  ('Innovation',        'innovation',        'post', 'innovation', 4),
  ('Education',         'education',         'post', 'awareness',  5),
  ('Policy',            'policy',            'post', 'awareness',  6),
  ('Screening',         'screening',         'event','prevention', 1),
  ('Outreach',          'outreach',          'event','awareness',  2),
  ('Training',          'training',          'event','innovation', 3),
  ('Webinar',           'webinar',           'event','research',   4),
  ('Conference',        'conference',        'event','support',    5)
on conflict (kind, slug) do nothing;

-- ── Impact metrics · September 2026 ──────────────────────────────────
insert into impact_metrics
  (key, label, value_numeric, value_display, as_of, is_headline, position, methodology_note, is_published)
values
  ('advocates', 'Cancer Advocates', 800, '800+', '2026-09-01', true, 1,
   'People who have completed orientation and are active in a chapter or region.', true),
  ('leaders', 'AAC Leaders', 50, '50+', '2026-09-01', true, 2, null, true),
  ('countries_active', 'Countries active', 3, '3', '2026-09-01', true, 3,
   'Nigeria, Ghana and Kenya.', true),
  ('students_engaged', 'Students & young people engaged', 500, '500+', '2026-09-01', true, 4,
   'Counted from attendance at sessions we ran or co-ran.', true),
  ('healthcare_professionals', 'Healthcare professionals in our network', 200, '200+', '2026-09-01', false, 5, null, true),
  ('patients_supported', 'Patients supported', 5, '5', '2026-09-01', false, 6,
   'Our first cohort. Every one of them is a person we can name.', true),
  ('partners', 'Healthcare & community partners', 2, '2', '2026-09-01', false, 7, null, true),
  -- Held back until there is something to report. The component renders
  -- these correctly; they simply are not published yet.
  ('drug_access_support', 'Cancer drug access support', 0, '0', '2026-09-01', false, 8,
   'Programme in development. We will report the first figure when there is one.', false),
  ('people_reached', 'People reached through awareness activities', null, null, null, false, 9,
   'We are building the system to measure this properly. We would rather report nothing than report a number we cannot stand behind.', false)
on conflict (key) do update set
  label = excluded.label,
  value_numeric = excluded.value_numeric,
  value_display = excluded.value_display,
  as_of = excluded.as_of,
  is_headline = excluded.is_headline,
  position = excluded.position,
  methodology_note = excluded.methodology_note,
  updated_at = now();

-- ── Site settings ────────────────────────────────────────────────────
insert into site_settings (id, org, contact, socials, feature_flags) values (
  1,
  jsonb_build_object(
    'name','All Against Cancer Initiative',
    'abbr','AAC',
    'tagline','Bringing Hope through Awareness, Support and Research',
    'registrationBody','Corporate Affairs Commission',
    'registrationNumber','9812183',
    'country','Federal Republic of Nigeria'
  ),
  jsonb_build_object('general','contact@aaci.ngo','support','support@aaci.ngo'),
  jsonb_build_object(
    'linkedin','https://www.linkedin.com/company/all-against-cancer',
    'facebook','https://www.facebook.com/allagainstcancer',
    'x','https://x.com/allagainstcancr',
    'instagram','https://www.instagram.com/allagainstcancer',
    'tiktok','https://www.tiktok.com/@allagainstcancer'
  ),
  -- Donations stay off until a payment provider is configured and verified.
  jsonb_build_object('donations', false, 'chatbot', false, 'newsletter', true)
) on conflict (id) do nothing;

-- ── FAQs ─────────────────────────────────────────────────────────────
insert into faqs (question, answer, category, position, is_published) values
  ('How do I become a Cancer Advocate?',
   'Apply through the Get Involved page. There are no qualifications required — what matters is that you are willing to take what you learn to other people. After a short screening conversation you go through orientation and training, then start working with a coordinator.',
   'get-involved', 1, true),
  ('Does AAC give medical advice?',
   'No. We do not diagnose, interpret results, recommend treatment or estimate prognosis. We share general, evidence-based information and connect people to support. If you have symptoms that worry you, please see a qualified healthcare professional.',
   'support', 2, true),
  ('Where does AAC work?',
   'Nigeria, Ghana and Kenya, through university chapters and regional coordinators.',
   'about', 3, true),
  ('Is AAC a registered organisation?',
   'Yes. All Against Cancer Initiative is registered with the Corporate Affairs Commission of the Federal Republic of Nigeria, registration number 9812183.',
   'about', 4, true),
  ('How can my organisation partner with AAC?',
   'We work with hospitals, universities, pharmacies, pharmaceutical and biotechnology companies, government agencies, NGOs, technology companies and funders. Write to contact@aaci.ngo and tell us what you do and where you think we could work together.',
   'partner', 5, true)
on conflict do nothing;

-- ── Navigation ───────────────────────────────────────────────────────
insert into navigation (location, items) values
  ('header', '[
    {"label":"About","href":"/about"},
    {"label":"What We Do","href":"/what-we-do"},
    {"label":"Programmes","href":"/programmes"},
    {"label":"Events","href":"/events"},
    {"label":"Blog","href":"/blog"},
    {"label":"Get Involved","href":"/get-involved","children":[
      {"label":"Become an Advocate","href":"/get-involved/advocates"},
      {"label":"AAC Fellowship","href":"/get-involved/fellowship"},
      {"label":"University Chapters","href":"/get-involved/chapters"},
      {"label":"Volunteer","href":"/get-involved/volunteer"},
      {"label":"Partner with us","href":"/get-involved/partner"}
    ]}
  ]'::jsonb)
on conflict (location) do nothing;

-- ── Home page section registry ───────────────────────────────────────
-- Every section on the homepage, in order, all visible. Toggling
-- is_visible off in the dashboard removes a section from the live page.
insert into pages (slug, title, status, published_at)
values ('home', 'Home', 'published', now())
on conflict (slug) do nothing;

insert into page_sections (page_id, type, position, is_visible)
select p.id, s.type, s.position, true
from pages p,
     (values
       ('hero', 1), ('statement', 2), ('pillarCards', 3), ('impactStats', 4),
       ('featuredEvents', 5), ('countryReach', 6), ('values', 7),
       ('latestPosts', 8), ('getInvolved', 9)
     ) as s(type, position)
where p.slug = 'home'
  and not exists (select 1 from page_sections ps where ps.page_id = p.id and ps.type = s.type);
