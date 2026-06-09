-- Pass D of the resubmit-nudge work (GH #123 follow-up): anti-spam marker for
-- the Discord resubmit reminder cron.
--
-- The cron DMs raiders whose lists still need (re)submitting. This column records
-- when we last reminded about a given submission so the cron re-reminds at most
-- once per cooldown window instead of every run.

alter table public.loot_submissions
  add column if not exists resubmit_reminded_at timestamptz;

comment on column public.loot_submissions.resubmit_reminded_at is
  'When the resubmit-reminder cron last DMed the raider about this submission. Used to throttle reminders to once per cooldown window.';
