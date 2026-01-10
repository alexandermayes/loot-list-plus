-- Drop existing function first (if it exists with different signature)
DROP FUNCTION IF EXISTS generate_invite_code();

-- Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on guild_invite_codes if not already enabled
ALTER TABLE guild_invite_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Officers can manage invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Anyone can view active invite codes" ON guild_invite_codes;

-- Policy: Officers can insert, update, and delete invite codes for their guilds
CREATE POLICY "Officers can manage invite codes"
ON guild_invite_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_members.guild_id = guild_invite_codes.guild_id
      AND guild_members.user_id = auth.uid()
      AND guild_members.role = 'Officer'
  )
);

-- Policy: Anyone (authenticated or not) can view active invite codes (needed for validation)
CREATE POLICY "Anyone can view active invite codes"
ON guild_invite_codes
FOR SELECT
USING (is_active = true);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code() TO anon;
