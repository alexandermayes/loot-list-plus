import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * POST /api/battlenet/disconnect
 *
 * Removes the user's linked Battle.net account.
 */
export async function POST() {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('battlenet_accounts')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to disconnect Battle.net:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/battlenet/disconnect:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
