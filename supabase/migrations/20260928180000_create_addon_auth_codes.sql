-- GH #300: this table holds single-use OAuth 2.0 PKCE authorization codes
-- for the companion desktop app. Only the service role reads or writes it
-- (the /api/addon/auth routes in the follow-up PR). Rows hold a sha256 hash
-- of the code, never the code. A code is deleted when it is exchanged and
-- expires 60 seconds after it is issued. Nothing uses this table until the
-- follow-up PR merges.

CREATE TABLE IF NOT EXISTS "public"."addon_auth_codes" (
    "code_hash" text NOT NULL,
    "code_challenge" text NOT NULL,
    "user_id" uuid NOT NULL,
    "guild_id" uuid NOT NULL,
    "redirect_uri" text NOT NULL,
    "expires_at" timestamptz DEFAULT (now() + interval '60 seconds') NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "addon_auth_codes_pkey" PRIMARY KEY ("code_hash"),
    CONSTRAINT "addon_auth_codes_code_hash_check" CHECK ("code_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "addon_auth_codes_code_challenge_check" CHECK ("code_challenge" ~ '^[A-Za-z0-9_-]{43}$'),
    CONSTRAINT "addon_auth_codes_redirect_uri_check" CHECK ("redirect_uri" = 'lootlistplus://auth/callback'),
    CONSTRAINT "addon_auth_codes_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "addon_auth_codes_guild_id_fkey" FOREIGN KEY ("guild_id")
        REFERENCES "public"."guilds"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_addon_auth_codes_expires_at"
    ON "public"."addon_auth_codes" ("expires_at");

-- Service-role only: RLS on with no policies.
ALTER TABLE "public"."addon_auth_codes" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."addon_auth_codes" FROM "anon", "authenticated";

GRANT ALL ON TABLE "public"."addon_auth_codes" TO "service_role";

COMMENT ON TABLE "public"."addon_auth_codes" IS 'Single use, 60 second PKCE authorization codes for the companion app login flow, service role only.';
