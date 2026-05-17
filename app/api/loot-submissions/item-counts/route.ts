import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// Shared logic for fetching item counts.
//
// Supabase enforces a server-side 1000-row cap that .limit(10000) does NOT
// override — the previous implementation passed batches of 100 submission IDs
// hoping the limit would let through 10000 rows, but the server still capped
// each response at 1000. Submissions later in each batch silently came back
// with count=0. Paginate with .range() within each batch until exhausted.
async function getItemCounts(submissionIds: string[]): Promise<Record<string, number>> {
  if (submissionIds.length === 0) return {}

  const serviceSupabase = createServiceRoleClient()

  const BATCH_SIZE = 100
  const PAGE = 1000
  const countMap: Record<string, number> = {}

  for (let i = 0; i < submissionIds.length; i += BATCH_SIZE) {
    const batch = submissionIds.slice(i, i + BATCH_SIZE)
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await serviceSupabase
        .from('loot_submission_items')
        .select('submission_id')
        .in('submission_id', batch)
        .is('removed_at', null)
        // `.order('id')` is REQUIRED for stable pagination — without it,
        // Postgres returns rows in arbitrary order and successive .range()
        // calls skip / duplicate rows, which previously caused 14 of 172
        // approved submissions in Big Yikes to show count=0 despite having
        // real items.
        .order('id', { ascending: true })
        .range(start, start + PAGE - 1)

      if (error || !data || data.length === 0) break
      for (const item of data as { submission_id: string }[]) {
        countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
      }
      if (data.length < PAGE) break
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
