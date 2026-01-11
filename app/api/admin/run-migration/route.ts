import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Run the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add policy to allow users to leave guilds (delete their own membership)
        DROP POLICY IF EXISTS "Users can leave guilds" ON guild_members;

        CREATE POLICY "Users can leave guilds"
        ON guild_members
        FOR DELETE
        USING (auth.uid() = user_id);
      `
    })

    if (error) {
      console.error('Migration error:', error)
      // Try direct query instead
      const { error: directError } = await supabase.from('guild_members').select('id').limit(1)

      // Since rpc might not work, let's try using raw SQL through a different method
      return NextResponse.json({
        message: 'Please run this SQL directly in Supabase SQL Editor:',
        sql: `
DROP POLICY IF EXISTS "Users can leave guilds" ON guild_members;

CREATE POLICY "Users can leave guilds"
ON guild_members
FOR DELETE
USING (auth.uid() = user_id);
        `,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
