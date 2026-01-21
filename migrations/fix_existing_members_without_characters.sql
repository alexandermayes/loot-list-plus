-- Migration: Fix existing guild members who don't have characters
-- This handles members who joined via Discord or invite before the character system was fully implemented

-- Step 1: Create characters for users who have guild memberships but no characters
DO $$
DECLARE
    member_record RECORD;
    new_character_id UUID;
BEGIN
    -- Find all guild_members who don't have any characters
    FOR member_record IN
        SELECT DISTINCT
            gm.user_id,
            gm.character_name,
            g.realm
        FROM guild_members gm
        LEFT JOIN characters c ON c.user_id = gm.user_id
        INNER JOIN guilds g ON g.id = gm.guild_id
        WHERE c.id IS NULL
        AND gm.is_active = true
    LOOP
        -- Create a character for this user
        INSERT INTO characters (
            user_id,
            name,
            realm,
            is_main,
            created_at,
            updated_at
        ) VALUES (
            member_record.user_id,
            member_record.character_name,
            member_record.realm,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_character_id;

        RAISE NOTICE 'Created character % for user %', new_character_id, member_record.user_id;
    END LOOP;
END $$;

-- Step 2: Create character_guild_memberships for all guild_members who don't have them
DO $$
DECLARE
    member_record RECORD;
    user_character_id UUID;
BEGIN
    -- Find all guild_members who don't have character_guild_memberships
    FOR member_record IN
        SELECT
            gm.user_id,
            gm.guild_id,
            gm.role,
            gm.joined_at,
            gm.joined_via,
            gm.is_active
        FROM guild_members gm
        WHERE gm.is_active = true
    LOOP
        -- Get the user's character (prefer main character)
        SELECT id INTO user_character_id
        FROM characters
        WHERE user_id = member_record.user_id
        ORDER BY is_main DESC, created_at ASC
        LIMIT 1;

        -- Check if character_guild_membership already exists
        IF NOT EXISTS (
            SELECT 1
            FROM character_guild_memberships
            WHERE character_id = user_character_id
            AND guild_id = member_record.guild_id
        ) THEN
            -- Create character_guild_membership
            INSERT INTO character_guild_memberships (
                character_id,
                guild_id,
                role,
                is_active,
                joined_at,
                joined_via
            ) VALUES (
                user_character_id,
                member_record.guild_id,
                member_record.role,
                member_record.is_active,
                member_record.joined_at,
                member_record.joined_via || '_migration'
            );

            RAISE NOTICE 'Created character_guild_membership for character % in guild %', user_character_id, member_record.guild_id;
        END IF;
    END LOOP;
END $$;

-- Step 3: Update user_active_characters for users who have guild memberships but no active character set
DO $$
DECLARE
    member_record RECORD;
    user_character_id UUID;
BEGIN
    FOR member_record IN
        SELECT DISTINCT gm.user_id, gm.guild_id
        FROM guild_members gm
        LEFT JOIN user_active_characters uac ON uac.user_id = gm.user_id
        WHERE uac.user_id IS NULL
        AND gm.is_active = true
    LOOP
        -- Get the user's main character
        SELECT id INTO user_character_id
        FROM characters
        WHERE user_id = member_record.user_id
        ORDER BY is_main DESC, created_at ASC
        LIMIT 1;

        IF user_character_id IS NOT NULL THEN
            -- Set active character and guild
            INSERT INTO user_active_characters (
                user_id,
                active_character_id,
                active_guild_id,
                updated_at
            ) VALUES (
                member_record.user_id,
                user_character_id,
                member_record.guild_id,
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                active_character_id = EXCLUDED.active_character_id,
                active_guild_id = EXCLUDED.active_guild_id,
                updated_at = NOW();

            RAISE NOTICE 'Set active character % for user %', user_character_id, member_record.user_id;
        END IF;
    END LOOP;
END $$;

-- Summary
SELECT
    'Migration complete!' as status,
    (SELECT COUNT(*) FROM characters) as total_characters,
    (SELECT COUNT(*) FROM character_guild_memberships) as total_memberships,
    (SELECT COUNT(*) FROM user_active_characters) as users_with_active_character;
