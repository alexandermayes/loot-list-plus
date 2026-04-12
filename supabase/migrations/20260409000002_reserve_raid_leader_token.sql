-- =============================================================================
-- Reserve raid leader token
-- =============================================================================
--
-- Adds a long, secret token to each reserve run that can be shared with
-- co-leaders to grant management permissions (lock/unlock, edit, award)
-- without requiring a LootList+ account. The token is separate from the
-- 8-char share_token which is public and only grants view + submit access.

CREATE OR REPLACE FUNCTION generate_reserve_leader_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE reserve_runs
  ADD COLUMN IF NOT EXISTS raid_leader_token TEXT;

-- Backfill any existing rows with a generated token so the column can go NOT NULL
UPDATE reserve_runs
SET raid_leader_token = generate_reserve_leader_token()
WHERE raid_leader_token IS NULL;

ALTER TABLE reserve_runs
  ALTER COLUMN raid_leader_token SET NOT NULL,
  ALTER COLUMN raid_leader_token SET DEFAULT generate_reserve_leader_token();

-- Token lookups happen on every mutating API call; needs to be fast and unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_reserve_runs_raid_leader_token
  ON reserve_runs(raid_leader_token);
