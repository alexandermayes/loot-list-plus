-- Migration: Enable RLS on discord_feedback_map
--
-- Supabase flagged this table as "publicly accessible" (rls_disabled_in_public).
-- The original migration deliberately skipped RLS because only the bot writes
-- to this table using the service role key, which bypasses RLS anyway. But
-- leaving RLS off means the anon/authenticated keys would technically have
-- access via PostgREST.
--
-- Enable RLS with no policies. Service role continues to bypass RLS, so the
-- bot is unaffected. All other roles are denied by default.

ALTER TABLE discord_feedback_map ENABLE ROW LEVEL SECURITY;
