import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// Shared logic for fetching item counts
async function getItemCounts(submissionIds: string[]): Promise<Record<string, number>> {
  if (submissionIds.length === 0) return {}

  const serviceSupabase = createServiceRoleClient()

  // Batch by submission IDs AND paginate within each batch
  // (Supabase default limit is 1000 rows per query)
  const BATCH_SIZE = 100
  const countMap: Record<string, number> = {}

  for (let i = 0; i < submissionIds.length; i += BATCH_SIZE) {
    const batch = submissionIds.slice(i, i + BATCH_SIZE)
    const { data, error } = await serviceSupabase
      .from('loot_submission_items')
      .select('submission_id')
      .in('submission_id', batch)
      .is('removed_at', null)
      .limit(10000) // override default 1000-row limit

    if (!error && data) {
      data.forEach((item: { submission_id: string }) => {
        countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
      })
    }
  }

  return countMap
}

// GET - Fetch item counts via query string (for small lists)
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ids = request.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json({})

  const submissionIds = ids.split(',').filter(Boolean)
  return NextResponse.json(await getItemCounts(submissionIds))
}

// POST - Fetch item counts via body (for large lists that exceed URL limits)
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const submissionIds = (body.ids || []).filter(Boolean)
  return NextResponse.json(await getItemCounts(submissionIds))
}
