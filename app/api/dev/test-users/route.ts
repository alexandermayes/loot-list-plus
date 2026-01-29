import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Only allow in development
const IS_DEV = process.env.NODE_ENV === 'development'

export async function GET() {
  // Block in production
  if (!IS_DEV) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const testUsersPath = resolve(process.cwd(), 'loadtest/test-users.json')

    if (!existsSync(testUsersPath)) {
      return NextResponse.json(
        { error: 'Test users file not found. Run: npx tsx scripts/create-test-users.ts' },
        { status: 404 }
      )
    }

    const data = JSON.parse(readFileSync(testUsersPath, 'utf8'))

    return NextResponse.json({
      users: data.users || [],
      count: data.user_count || 0,
    })
  } catch (error) {
    console.error('Error reading test users:', error)
    return NextResponse.json(
      { error: 'Failed to read test users' },
      { status: 500 }
    )
  }
}
