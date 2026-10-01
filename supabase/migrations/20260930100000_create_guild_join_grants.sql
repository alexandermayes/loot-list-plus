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
--   The last statement records a join for every user who, when this runs,
--   joined a guild before they had a character and has not added one yet:
--   an active guild is set in user_active_characters, no active character
--   is set, the user did not create that guild, the user has no character
--   with a class set, and none of the user's characters is an active member
--   of that guild. These are the conditions the invite and Discord join
--   routes use for their no-character branch (they only pick characters with
--   a class set) and the pending guild state the app shows. Each row expires
--   30 days after this runs and allows one first character with the default
--   role. user_active_characters is read once, here, at migration time;
--   nothing reads it to decide access afterwards.
--
-- This file changes no existing row and is safe to re-run: every statement
-- is IF NOT EXISTS or idempotent, and the backfill uses ON CONFLICT DO
-- NOTHING, so a re-run inserts nothing twice and never reopens a used
-- record.
--
-- Rollback (revert the route changes first; with the table gone and the new
-- routes live, the access check fails closed with a 500)
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

-- One-time backfill for users waiting to add their first character.
INSERT INTO "public"."guild_join_grants" ("user_id", "guild_id", "source", "created_at", "expires_at")
SELECT "uac"."user_id", "uac"."active_guild_id", 'backfill', now(), now() + interval '30 days'
FROM "public"."user_active_characters" "uac"
JOIN "public"."guilds" "g" ON "g"."id" = "uac"."active_guild_id"
WHERE "uac"."active_character_id" IS NULL
  AND "g"."created_by" IS DISTINCT FROM "uac"."user_id"
  AND NOT EXISTS (
    SELECT 1 FROM "public"."characters" "c"
    WHERE "c"."user_id" = "uac"."user_id"
      AND "c"."class_id" IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM "public"."character_guild_memberships" "m"
    JOIN "public"."characters" "c" ON "c"."id" = "m"."character_id"
    WHERE "c"."user_id" = "uac"."user_id"
      AND "m"."guild_id" = "uac"."active_guild_id"
      AND "m"."is_active" = true
  )
ON CONFLICT ("user_id", "guild_id") DO NOTHING;
