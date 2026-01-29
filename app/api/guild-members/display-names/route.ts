import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 })
    }

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create admin client for fetching user metadata
    const supabaseAdmin = createServiceRoleClient()

    // Fetch all users and extract their metadata
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Create map of user IDs to display names
    const displayNames: Record<string, string> = {}

    users?.forEach(u => {
      if (userIds.includes(u.id)) {
        displayNames[u.id] = u.user_metadata?.custom_claims?.global_name ||
                            u.user_metadata?.full_name ||
                            u.user_metadata?.name ||
                            'Unknown User'
      }
    })

    return NextResponse.json({ displayNames })
  } catch (error) {
    console.error('Error in display-names API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
