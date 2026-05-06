import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// GET - Fetch item counts for a list of submission IDs
// Returns: { [submission_id]: count }
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) {
    return NextResponse.json({})
  }

  const submissionIds = ids.split(',').filter(Boolean)
  if (submissionIds.length === 0) {
    return NextResponse.json({})
  }

  const serviceSupabase = createServiceRoleClient()

  const { data, error } = await serviceSupabase
    .from('loot_submission_items')
    .select('submission_id')
    .in('submission_id', submissionIds)
    .is('removed_at', null)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch item counts' }, { status: 500 })
  }

  const countMap: Record<string, number> = {}
  data?.forEach((item: { submission_id: string }) => {
    countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
  })

  return NextResponse.json(countMap)
}
