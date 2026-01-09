-- TEMPORARY: Disable RLS to test if that's the issue
-- WARNING: Only use this for testing! Re-enable RLS after confirming the issue.

ALTER TABLE raid_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE expansions DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable RLS and run the proper policies:
-- ALTER TABLE raid_tiers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expansions ENABLE ROW LEVEL SECURITY;
-- Then run rls-policies.sql
