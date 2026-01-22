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

    // Add is_guild_active column to raid_tiers
    // Using raw query through Supabase's REST API
    const { error } = await supabase
      .from('raid_tiers')
      .update({ is_guild_active: true })
      .is('is_guild_active', null)

    // If column doesn't exist, this will fail - that's expected
    // The column needs to be added via Supabase SQL Editor
    if (error && error.code === '42703') {
      return NextResponse.json({
        message: 'Please run this SQL directly in Supabase SQL Editor:',
        sql: `
ALTER TABLE raid_tiers
ADD COLUMN IF NOT EXISTS is_guild_active BOOLEAN DEFAULT true;

UPDATE raid_tiers SET is_guild_active = true WHERE is_guild_active IS NULL;
        `,
        error: 'Column does not exist yet - run the SQL above in Supabase SQL Editor'
      })
    }

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({
        message: 'Migration may have already been applied or there was an error',
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
