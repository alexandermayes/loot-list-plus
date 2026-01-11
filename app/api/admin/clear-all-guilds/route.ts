import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // First, delete all guild members (to avoid foreign key issues)
    const { error: membersError } = await supabase
      .from('guild_members')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (membersError) {
      console.error('Error deleting guild members:', membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // Delete all invite codes
    const { error: invitesError } = await supabase
      .from('guild_invite_codes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (invitesError) {
      console.error('Error deleting invite codes:', invitesError)
      // Not critical, continue
    }

    // Delete all active guild entries
    const { error: activeError } = await supabase
      .from('user_active_guilds')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (activeError) {
      console.error('Error deleting active guilds:', activeError)
      // Not critical, continue
    }

    // Finally, delete all guilds
    const { error: guildsError } = await supabase
      .from('guilds')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (guildsError) {
      console.error('Error deleting guilds:', guildsError)
      return NextResponse.json({ error: guildsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'All guilds, members, and related data have been deleted'
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
