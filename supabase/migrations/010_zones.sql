-- =====================================================================
-- AAC — 010 · The zonal_coordinator role  (RUN THIS ONE ON ITS OWN)
--
-- Postgres will not let a newly added enum value be USED in the same
-- transaction that added it:
--
--   ERROR: unsafe use of new value "zonal_coordinator" of enum type app_role
--   HINT:  New enum values must be committed before they can be used.
--
-- The Supabase SQL editor runs a whole script as one transaction, so adding
-- the value and then writing `when 'zonal_coordinator' then 55` in the same
-- file can never work. This file therefore does exactly one thing.
--
--   1. Run this file. Wait for it to succeed.
--   2. Then run 011_zones.sql, which creates the zones table and teaches
--      role_rank() about the new value.
-- =====================================================================

alter type app_role add value if not exists 'zonal_coordinator' after 'campus_coordinator';
