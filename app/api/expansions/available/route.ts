import { NextResponse } from 'next/server'
import { getAvailableExpansions } from '@/app/services/expansionSeeder'

/**
 * GET /api/expansions/available
 * Get list of all available expansions with their data availability status
 */
export async function GET() {
  try {
    const available = getAvailableExpansions()

    return NextResponse.json({ expansions: available })
  } catch (error) {
    console.error('Error in GET /api/expansions/available:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
