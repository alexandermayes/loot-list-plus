import { NextResponse } from 'next/server'

// Returns the current deployment's build ID.
// The client checks this on navigation to detect stale bundles after a new deploy.
export function GET() {
  const buildId = process.env.NEXT_BUILD_ID
    || process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)
    || 'dev'

  return NextResponse.json(
    { buildId },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
