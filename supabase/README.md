# Database setup

Three migrations, run in order, in the Supabase SQL editor
(**Dashboard → SQL Editor → New query** → paste → Run).

| # | File | What it does |
|---|---|---|
| 1 | `migrations/001_schema.sql` | Tables, enums, indexes, triggers |
| 2 | `migrations/002_rls.sql` | Row Level Security + the publish RPC |
| 3 | `migrations/003_seed.sql` | Real seed data — departments, regions, categories, impact figures, FAQs, homepage sections |

Run 001 first and let it finish before 002. They're written to be safely
re-runnable, so a partial run can be repeated.

---

## After running them

**1. Create your own account.** Sign up through the site's login page (or
Dashboard → Authentication → Users → Add user). A `profiles` row is created
automatically by a trigger.

**2. Make yourself super admin.** New profiles default to `advocate`, which
can't do anything in the dashboard. Run this once with your email:

```sql
update profiles set role = 'super_admin' where email = 'you@example.com';
```

This is the only step that must be done by hand, and deliberately so —
there is no code path that grants super admin, which means there is no code
path an attacker can abuse to get it.

**3. Check the advisors.** Dashboard → Advisors → Security. It should be
clean. If it flags a table without RLS, 002 didn't finish.

---

## The permission model

Roles are **global tiers**. Scope (`chapter_id`, `region_id`,
`department_id`) is separate. That separation is what stops the model
exploding into role×scope combinations.

| Rank | Role | Scope | Count |
|---|---|---|---|
| 100 | `super_admin` | Global | 1–2 |
| 90 | `board_member` | Global, **read-only** | 7 |
| 80 | `admin` | Global | 2–3 |
| 70 | `department_director` | Department | 4 |
| 60 | `regional_coordinator` | Region | 15+ |
| 50 | `campus_coordinator` | One chapter | 40+ |
| 40 | `content_lead` | Global content, no CRM | few |
| 35 | `contributor` | Own drafts only | many |
| 30 | `advocate` | Own profile + impact reports | 800+ |
| 10 | `viewer` | Read-only, scoped | as needed |

**The rule that carries the most weight:** campus coordinators create and
edit their own chapter's events but **cannot publish**. They submit for
review; a regional coordinator, director, admin or content lead publishes.
That's what keeps 40+ coordinators from putting unreviewed content on a
public health website.

`board_member` is read-everything, write-nothing by design — transparency
without operational risk.

## Publishing

Publishing is not reachable through a normal `UPDATE`. RLS blocks setting
`status = 'published'` for anyone below rank 60. It goes through:

```sql
select publish_content('events', '<uuid>', 'published');
```

which checks rank, snapshots the row into `revisions`, updates it, and writes
to `audit_log` — atomically, every time. So every publish is reversible and
every publish is attributable.

## Notes

- `audit_log` is append-only: `UPDATE` and `DELETE` are revoked.
- `media_assets.alt_text` is `NOT NULL` — accessibility enforced by the
  schema, not by goodwill.
- `impact_metrics.value_display` is **text**, so `800+`, `5` and `0` are all
  exact. A null value renders the "measurement in progress" state.
- Donations ship behind a feature flag (`site_settings.feature_flags`),
  off until a payment provider is configured and verified.
