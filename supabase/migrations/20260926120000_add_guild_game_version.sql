-- Store each guild's game version, 'classic' or 'forever', fixed at creation (D-02).
-- Forever stays an expansion row internally (D-03); this column is only about which
-- ladder of expansions a guild is allowed to see and add.
--
-- Ships as its own migration-only PR, merged and applied to production BEFORE the
-- code PR that reads this column deploys (see Rollout in 260926-lj6-PLAN.md).

ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS game text NOT NULL DEFAULT 'classic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guilds_game_check'
      AND conrelid = 'public.guilds'::regclass
  ) THEN
    ALTER TABLE public.guilds
      ADD CONSTRAINT guilds_game_check CHECK (game IN ('classic', 'forever'));
  END IF;
END $$;

-- Backfill: a guild whose active expansion row is named 'Forever' is a Forever guild.
-- Filtered on IS DISTINCT FROM so re-running this migration is a no-op.
UPDATE public.guilds AS g
SET game = 'forever'
FROM public.expansions AS e
WHERE e.id = g.active_expansion_id
  AND e.name = 'Forever'
  AND g.game IS DISTINCT FROM 'forever';

COMMENT ON COLUMN public.guilds.game IS 'The guild''s game version, ''classic'' or ''forever'', set once at creation and never switched. Forever guilds keep a single ''Forever'' expansions row that holds their raid tiers and phases.';
