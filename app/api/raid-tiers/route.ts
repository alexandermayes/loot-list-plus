import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// GET - Fetch raid tiers for an expansion
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const expansionId = searchParams.get('expansion_id')
    const guildId = searchParams.get('guild_id')

    if (!expansionId || !guildId) {
      return NextResponse.json({ error: 'expansion_id and guild_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get raid tiers for this expansion that are active for the guild
    const { data: tiers, error: tiersError } = await supabase
      .from('raid_tiers')
      .select('id, name, is_active, submission_deadline')
      .eq('expansion_id', expansionId)
      .eq('is_guild_active', true)
      .order('id')

    if (tiersError) {
      console.error('Error fetching raid tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch raid tiers' }, { status: 500 })
    }

    return NextResponse.json({ tiers: tiers || [] })
  } catch (error) {
    console.error('Error in GET /api/raid-tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
