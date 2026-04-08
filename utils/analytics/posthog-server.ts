import { PostHog } from 'posthog-node'

/**
 * Shared PostHog server client singleton.
 *
 * Used by both analytics (server.ts) and feature flags (feature-flags-server.ts)
 * so we don't create duplicate HTTP connections.
 *
 * Uses flushAt:1 + flushInterval:0 for serverless environments where the
 * process may exit before a batch timer fires. This sends each event
 * immediately without destroying the client (unlike shutdown()).
 */
let client: PostHog | null = null

export function getPostHogServerClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null

  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return client
}
