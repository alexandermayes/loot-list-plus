import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { parseAuthorizeParams, listOfficerGuilds } from '@/lib/addon/companion-auth'
import { buildSignInPath } from '@/lib/post-auth-redirect'
import GuildPicker, { COMPANION_AUTHORIZE_COPY } from './GuildPicker'

export const metadata: Metadata = {
  title: { absolute: COMPANION_AUTHORIZE_COPY.title },
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>

function toURLSearchParams(resolved: SearchParams): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else if (value !== undefined) {
      params.append(key, value)
    }
  }
  return params
}

/**
 * The officer guild picker (GH #300 D-02): lists exactly the guilds where the
 * signed-in user has officer rights, one submit button per guild, all
 * POSTing to /api/addon/auth with the canonical query. This page never
 * issues a code — the consent POST does.
 */
export default async function CompanionAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const parsed = parseAuthorizeParams(toURLSearchParams(resolved))

  if (!parsed.ok) {
    return <GuildPicker state={{ kind: 'invalid' }} />
  }

  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    redirect(buildSignInPath(`/api/addon/auth?${parsed.query}`))
  }

  const guilds = await listOfficerGuilds(createServiceRoleClient(), user.id)
  if (guilds.length === 0) {
    return <GuildPicker state={{ kind: 'no_guilds' }} />
  }

  return <GuildPicker state={{ kind: 'pick', guilds, formAction: `/api/addon/auth?${parsed.query}` }} />
}
