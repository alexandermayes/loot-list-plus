-- Guild join records: the server's record that a user proved the right to
-- join a guild before they had a character.
--
-- Background
--   Membership rows in character_guild_memberships are written by the server.
--   A user who joins a guild before they have a character (by invite code or
--   by a verified Discord server membership) has their character added later,
--   by POST /api/characters/[id]/guilds or by the Battle.net import. Those two
--   routes checked only character ownership. After this change a character is
--   added to a guild only for the guild's creator, for a user who already has
--   another active character in it, or for a user holding a join record
--   written here by the invite or Discord join route.
--
-- Table
--   One row per user and guild. source is the way the user joined
--   ('invite_code' or 'discord_verify', the joined_via values those routes
--   already write) or 'backfill' for the one-time rows below. A record is
--   valid for 30 days after the join and is used once: the first membership
--   write that makes the user an active member of the guild sets consumed_at.
--   A new join upserts the row and starts a fresh 30 days. Deleting the user
--   or the guild deletes the rows (ON DELETE CASCADE).
--
-- Access
--   Service role only. RLS is enabled with no policies, and all privileges
--   are revoked from PUBLIC, anon and authenticated, because the default
--   privileges on the public schema would otherwise grant them on a new
--   table. No function, trigger or policy is created.
--
-- Backfill
--   Added with the backfill statement.
--
-- This file changes no existing row and is safe to re-run.
--
-- Rollback
--   Revert the route changes first, then:
--   DROP TABLE IF EXISTS "public"."guild_join_grants";

CREATE TABLE IF NOT EXISTS "public"."guild_join_grants" (
    "user_id" uuid NOT NULL,
    "guild_id" uuid NOT NULL,
    "source" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "expires_at" timestamptz DEFAULT (now() + interval '30 days') NOT NULL,
    "consumed_at" timestamptz,
    CONSTRAINT "guild_join_grants_pkey" PRIMARY KEY ("user_id", "guild_id"),
    CONSTRAINT "guild_join_grants_source_check" CHECK ("source" IN ('invite_code', 'discord_verify', 'backfill')),
    CONSTRAINT "guild_join_grants_expires_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "guild_join_grants_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "guild_join_grants_guild_id_fkey" FOREIGN KEY ("guild_id")
        REFERENCES "public"."guilds"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_guild_join_grants_guild_id"
    ON "public"."guild_join_grants" ("guild_id");

-- Service role only: RLS on with no policies.
ALTER TABLE "public"."guild_join_grants" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."guild_join_grants" FROM PUBLIC, "anon", "authenticated";

GRANT ALL ON TABLE "public"."guild_join_grants" TO "service_role";

COMMENT ON TABLE "public"."guild_join_grants" IS 'Server record that a user joined a guild by invite code or Discord before they had a character. Valid for 30 days, used once by the first membership write. Service role only.';
