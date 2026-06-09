-- Pass C of the resubmit-nudge work (GH #123 follow-up): let raiders opt out of
-- the Discord reminder for lists that still need (re)submitting.
--
-- Gates only the proactive Discord DM (Pass D). The in-app banner and the
-- sidebar/dashboard badge are contextual UI and always show.

alter table public.user_preferences
  add column if not exists notify_resubmit_reminder boolean default true;

comment on column public.user_preferences.notify_resubmit_reminder is
  'When true (default), the raider gets a Discord DM reminding them about loot lists that still need to be (re)submitted. Gates the resubmit-reminder cron only.';
