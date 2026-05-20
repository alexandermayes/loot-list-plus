import { NextResponse } from 'next/server'
import { getAvailableExpansions } from '@/app/services/expansionSeeder'

/**
 * GET /api/expansions/available
 * Get list of all available expansions with their data availability status
 */
export async function GET() {
  try {
    const available = getAvailableExpansions()

    return NextResponse.json(
      { expansions: available },
      {
        headers: {
          // Driven by code constants — safe to cache long. Deployments invalidate
          // via the new build's edge cache eviction.
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/expansions/available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
