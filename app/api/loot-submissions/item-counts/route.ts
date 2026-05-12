import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// Shared logic for fetching item counts
async function getItemCounts(submissionIds: string[]): Promise<Record<string, number>> {
  if (submissionIds.length === 0) return {}

  const serviceSupabase = createServiceRoleClient()

  // Supabase .in() has a practical limit; batch if needed
  const BATCH_SIZE = 200
  const allData: { submission_id: string }[] = []

  for (let i = 0; i < submissionIds.length; i += BATCH_SIZE) {
    const batch = submissionIds.slice(i, i + BATCH_SIZE)
    const { data, error } = await serviceSupabase
      .from('loot_submission_items')
      .select('submission_id')
      .in('submission_id', batch)
      .is('removed_at', null)

    if (!error && data) allData.push(...data)
  }

  const countMap: Record<string, number> = {}
  allData.forEach(item => {
    countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
  })
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
