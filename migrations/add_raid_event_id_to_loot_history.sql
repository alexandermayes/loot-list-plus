-- Add raid_event_id column to loot_history to link awarded items to specific raid days
ALTER TABLE loot_history
ADD COLUMN IF NOT EXISTS raid_event_id UUID REFERENCES raid_events(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_loot_history_raid_event_id ON loot_history(raid_event_id);

-- Add comment explaining the column
COMMENT ON COLUMN loot_history.raid_event_id IS 'Links the awarded item to the specific raid event/day it was received on';
