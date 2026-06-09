-- Cap the resubmit-reminder cron at 3 DMs per list per needs-resubmit episode.
--
-- The cron counts reminders here and stops once it hits 3. The count is reset
-- when a list leaves the needs-resubmit state (resubmitted, or an officer
-- approves/rejects/reverts) so a fresh rejection starts a new run of 3.

alter table public.loot_submissions
  add column if not exists resubmit_reminder_count integer not null default 0;

comment on column public.loot_submissions.resubmit_reminder_count is
  'How many resubmit-reminder DMs have been sent for the current needs-resubmit episode. Capped at 3 by the cron; reset to 0 when the list is resubmitted or reviewed.';
