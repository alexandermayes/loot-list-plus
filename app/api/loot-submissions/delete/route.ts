import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, target } = body

    if (!guild_id || !target) {
      return NextResponse.json({ error: 'guild_id and target are required' }, { status: 400 })
    }

    if (target !== 'pending' && target !== 'all') {
      return NextResponse.json({ error: 'target must be "pending" or "all"' }, { status: 400 })
    }

    // Verify user is an officer in this guild
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userCharacters || userCharacters.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const characterIds = userCharacters.map(c => c.id)

    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('role')
      .eq('guild_id', guild_id)
      .in('character_id', characterIds)
      .in('role', ['Officer', 'Guild Master'])
      .limit(1)

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
    }

    // First, count how many submissions we're about to delete
    let countQuery = supabase
      .from('loot_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guild_id)

    if (target === 'pending') {
      countQuery = countQuery.eq('status', 'pending')
    }

    const { count: submissionCount } = await countQuery

    // Build the delete query based on target
    let deleteQuery = supabase
      .from('loot_submissions')
      .delete()
      .eq('guild_id', guild_id)

    if (target === 'pending') {
      deleteQuery = deleteQuery.eq('status', 'pending')
    }

    const { error } = await deleteQuery

    if (error) {
      console.error('Error deleting loot submissions:', error)
      return NextResponse.json({ error: 'Failed to delete loot submissions' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: submissionCount || 0,
      message: `Deleted ${submissionCount || 0} loot submission(s)`
    })
  } catch (error) {
    console.error('Error in loot submissions DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
