-- =====================================================================
-- TEST DATA — not a migration. Do not run this in production.
--
-- Three articles and three events, so the blog index, the article page, the
-- events index and the event detail page can all be seen with something in
-- them. Everything is tagged so it can be removed in one statement.
--
-- The content is plausible but INVENTED. No figure here is a real AAC number
-- and no person named is real. That is the point of the cleanup block at the
-- bottom: none of this should ever be mistaken for the organisation's record.
--
--   Run:     paste this whole file into the Supabase SQL editor.
--   Remove:  run the DELETE block at the bottom.
-- =====================================================================

-- Categories the posts reference, in case 003 was not run.
insert into categories (name, slug, kind, colour_token, position) values
  ('Prevention',       'prevention',       'post', 'prevention', 1),
  ('Survivor Stories', 'survivor-stories', 'post', 'support',    2),
  ('Research',         'research',         'post', 'research',   3)
on conflict (kind, slug) do nothing;

-- ── Articles ─────────────────────────────────────────────────────────
insert into posts
  (slug, title, excerpt, body, category_slug, tags, read_minutes,
   medically_reviewed_by, reviewed_at, status, published_at, seo)
values
(
  'test-what-happens-at-a-screening',
  '[TEST] What actually happens at a cancer screening',
  'People skip screening because they do not know what it involves. Here is the whole thing, step by step, so nothing about it is a surprise.',
  E'Most people who avoid screening are not avoiding the result. They are avoiding the unknown — a room they have never been in, a procedure nobody has described to them, and the possibility of being made to feel foolish for asking.\n\nSo here is the whole thing.\n\n## Before you go\n\nYou do not need to fast, and you do not need a referral for most community screenings. Bring any identification you have. If you are on medication, bring the packet or a photograph of it.\n\n- It usually takes under an hour\n- You can bring somebody with you\n- You can stop at any point, for any reason\n\n## What the screening itself involves\n\nA short conversation first: your age, your family history, anything you have noticed. Then the screening, which depends on what is being checked for. None of it requires you to be alone in a room with someone you have not met.\n\n> You are allowed to ask what someone is doing and why, at every step. A good clinician expects it.\n\n## Getting your result\n\nSome results are the same day. Some take a week. Either way you should leave knowing **when** and **how** you will be told — if nobody tells you that, ask before you go.\n\nA result that needs a second look is not a diagnosis. It is very often nothing. But it is always worth following up, and that is the part where having someone alongside you matters most.\n\n## If you want someone alongside you\n\nThat is what our support team is for. Write to us and we will help you work out where to go and what to expect.',
  'prevention',
  array['test','screening','prevention'],
  4,
  'Dr Adaeze Okonkwo, MBBS',
  now(),
  'published',
  now() - interval '3 days',
  '{"description":"People skip screening because they do not know what it involves. Here is the whole thing, step by step."}'::jsonb
),
(
  'test-chinelo-story',
  '[TEST] “I did not tell anyone for four months”',
  'Chinelo was 34 when she found the lump. She waited a third of a year before she told a single person. She wants to explain why, because she thinks the reason is common.',
  E'She found it in March. She told her sister in July.\n\n"I know how that sounds," she says. "I am a teacher. I tell children every day to ask for help. And I sat with it for four months."\n\n## Why she waited\n\nThree reasons, and she thinks all three are ordinary.\n\n1. She did not want to be a burden during a hard year for her family\n2. She did not know what it would cost, and was frightened of finding out\n3. She had watched somebody else go through it badly, and assumed that was what it was\n\n"The third one is the one nobody talks about. You are not scared of cancer in the abstract. You are scared of the one you watched."\n\n## What changed\n\nHer sister took the afternoon off and went with her. That was it — the whole intervention.\n\n> "I did not need a speech. I needed someone to sit in the corridor."\n\nShe was treated. She is well. She now goes with other people to their appointments, which is how we met her.\n\n## What she wants people to take from it\n\n"Four months is a long time. It is not a moral failing, it is just a long time. If you are in the middle of your own four months — the way out is one person. Not a plan. One person."',
  'survivor-stories',
  array['test','survivor'],
  3,
  null,
  null,
  'published',
  now() - interval '9 days',
  '{"description":"Chinelo was 34 when she found the lump, and waited four months before telling anyone. She explains why."}'::jsonb
),
(
  'test-draft-cost-of-a-diagnosis',
  '[TEST] What a diagnosis actually costs — a draft',
  'A working draft, kept unpublished on purpose so the review workflow can be seen with something real in it.',
  E'This one is deliberately left as a draft so the Submit for review and Request changes buttons have something to act on.\n\n## Still to do\n\n- Confirm the figures with the finance team\n- Have a clinician read the treatment section\n- Replace the placeholder cover image\n\nA draft article is invisible to the public: its web address returns not-found until somebody publishes it.',
  'research',
  array['test'],
  2,
  null,
  null,
  'draft',
  null,
  '{}'::jsonb
)
on conflict (slug) do nothing;

-- ── Events ───────────────────────────────────────────────────────────
insert into events
  (slug, title, subtitle, event_type, body, venue, city, country,
   starts_at, ends_at, attendance, screenings_done, materials_distributed, status)
values
(
  'test-unn-screening-day',
  '[TEST] Campus screening day, University of Nigeria',
  'A morning of free screening and a very long queue',
  'screening',
  E'We expected eighty people. Two hundred and six came.\n\nThe queue formed before the tables were set up, which told us something on its own — the barrier was never willingness, it was access and cost.\n\n## What we did\n\nFour stations, six volunteers, two clinicians. Clinical breast examination, blood pressure, a short risk conversation, and a written referral for anyone who needed a second look.\n\n## What we learned\n\nThe conversation mattered more than we planned for. People queued for the screening and stayed for the questions — mostly about family history and about what things cost.\n\nWe ran out of printed material by 11am. Next time we bring three times as much.',
  'Faculty of Pharmaceutical Sciences',
  'Nsukka',
  'Nigeria',
  now() - interval '21 days',
  now() - interval '21 days' + interval '6 hours',
  206, 184, 300,
  'published'
),
(
  'test-lagos-awareness-walk',
  '[TEST] Awareness walk, Lagos',
  'Six kilometres, and a conversation with everyone who asked what the shirts were for',
  'outreach',
  E'A walk is a slow-moving conversation. That is the whole reason we do them.\n\nOne hundred and forty people walked. Perhaps twice that number asked what it was about, which is the number that actually matters.\n\n## The three questions we were asked most\n\n1. "Is it hereditary?"\n2. "How much does a check cost?"\n3. "Where would I even go?"\n\nWe could answer the first two. The third one is the work.',
  'Ikoyi to Victoria Island',
  'Lagos',
  'Nigeria',
  now() - interval '48 days',
  now() - interval '48 days' + interval '4 hours',
  140, 0, 500,
  'published'
),
(
  'test-upcoming-accra-training',
  '[TEST] Advocate training, Accra',
  'Two days of training for the new Ghana cohort',
  'training',
  E'A draft event, left unpublished so the review workflow can be seen with something real in it.\n\nStill needed: the final venue, the confirmed trainer list, and photographs once it has actually happened.',
  'To be confirmed',
  'Accra',
  'Ghana',
  now() + interval '26 days',
  now() + interval '27 days',
  null, null, null,
  'draft'
)
on conflict (slug) do nothing;

-- =====================================================================
-- CLEANUP — run this to remove everything above and nothing else.
-- Every test row is prefixed "[TEST]" and slugged "test-", so this is
-- safe to run at any point without touching real content.
-- =====================================================================
--
--   delete from event_media where event_id in (select id from events where slug like 'test-%');
--   delete from events where slug like 'test-%';
--   delete from posts  where slug like 'test-%';
--
-- =====================================================================
