/**
 * Battle.net API client utilities.
 * Handles OAuth token management and authenticated API requests.
 */

import { createServiceRoleClient } from '@/utils/supabase/service-role'

export interface BattlenetAccount {
  id: string
  user_id: string
  battlenet_id: number
  battletag: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string
  region: string
  created_at: string
  updated_at: string
}

export type GameVersion = 'cata-classic' | 'classic-era' | 'tbc-anniversary'

const REGION_API_HOSTS: Record<string, string> = {
  us: 'https://us.api.blizzard.com',
  eu: 'https://eu.api.blizzard.com',
}

const REGION_AUTH_HOSTS: Record<string, string> = {
  us: 'https://oauth.battle.net',
  eu: 'https://oauth.battle.net',
}

/**
 * Get the Battle.net OAuth authorize URL for a given region.
 */
export function getAuthorizeUrl(region: string, state: string, redirectUri: string): string {
  const authHost = REGION_AUTH_HOSTS[region] || REGION_AUTH_HOSTS.us
  const clientId = process.env.BLIZZARD_CLIENT_ID

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'wow.profile',
    state,
  })

  return `${authHost}/authorize?${params.toString()}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  region: string,
  redirectUri: string
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}> {
  const authHost = REGION_AUTH_HOSTS[region] || REGION_AUTH_HOSTS.us
  const clientId = process.env.BLIZZARD_CLIENT_ID
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET

  const response = await fetch(`${authHost}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${text}`)
  }

  return response.json()
}

/**
 * Fetch the authenticated user's Battle.net profile (battletag, id).
 */
export async function fetchUserInfo(
  accessToken: string,
  region: string
): Promise<{ id: number; battletag: string }> {
  const authHost = REGION_AUTH_HOSTS[region] || REGION_AUTH_HOSTS.us

  const response = await fetch(`${authHost}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`)
  }

  return response.json()
}

/**
 * Get a user's linked Battle.net account from the database.
 */
export async function getBattlenetAccount(userId: string): Promise<BattlenetAccount | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('battlenet_accounts')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as BattlenetAccount
}

/**
 * Refresh an expired access token using the refresh token.
 * Updates the stored tokens in the database.
 */
export async function refreshAccessToken(account: BattlenetAccount): Promise<BattlenetAccount> {
  if (!account.refresh_token) {
    throw new Error('No refresh token available. User needs to re-authenticate.')
  }

  const authHost = REGION_AUTH_HOSTS[account.region] || REGION_AUTH_HOSTS.us
  const clientId = process.env.BLIZZARD_CLIENT_ID
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET

  const response = await fetch(`${authHost}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}. User needs to re-authenticate.`)
  }

  const tokens = await response.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('battlenet_accounts')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || account.refresh_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)
    .select()
    .single()

  if (error || !data) {
    throw new Error('Failed to update tokens in database')
  }

  return data as BattlenetAccount
}

/**
 * Make an authenticated request to the Battle.net API.
 * Automatically refreshes the token if expired.
 */
export async function battlenetFetch(
  account: BattlenetAccount,
  path: string,
  namespace?: string
): Promise<Response> {
  // Check if token is expired (with 60s buffer)
  const isExpired = new Date(account.token_expires_at).getTime() < Date.now() + 60_000

  if (isExpired) {
    account = await refreshAccessToken(account)
  }

  const apiHost = REGION_API_HOSTS[account.region] || REGION_API_HOSTS.us
  const url = `${apiHost}${path}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.access_token}`,
  }

  if (namespace) {
    headers['Battlenet-Namespace'] = namespace
  }

  const response = await fetch(url, { headers })

  // If we get a 401, try refreshing the token once
  if (response.status === 401) {
    account = await refreshAccessToken(account)

    const retryHeaders: Record<string, string> = {
      Authorization: `Bearer ${account.access_token}`,
    }
    if (namespace) {
      retryHeaders['Battlenet-Namespace'] = namespace
    }

    return fetch(url, { headers: retryHeaders })
  }

  return response
}

/**
 * Get the WoW profile namespace for the given game version and region.
 */
export function getWowProfileNamespace(version: GameVersion, region: string): string {
  if (version === 'classic-era') {
    return `profile-classic1x-${region}`
  }
  if (version === 'tbc-anniversary') {
    return `profile-classicann-${region}`
  }
  // Cata Classic
  return `profile-classic-${region}`
}

/**
 * Returns all profile namespaces to try for the given version and region.
 * TBC Anniversary uses the `classicann` namespace. Classic Era uses `classic1x`
 * with a fallback to `classic` for realms that migrated. Cata Classic uses
 * `classic` with a fallback to `classic1x`.
 */
export function getWowProfileNamespaces(version: GameVersion, region: string): string[] {
  if (version === 'tbc-anniversary') {
    return [`profile-classicann-${region}`]
  }
  if (version === 'classic-era') {
    return [`profile-classic1x-${region}`, `profile-classic-${region}`]
  }
  return [`profile-classic-${region}`, `profile-classic1x-${region}`]
}

/**
 * Battle.net equipment slot names mapped to our character_equipped_items slot values.
 */
export const SLOT_MAPPING: Record<string, string> = {
  HEAD: 'Head',
  NECK: 'Neck',
  SHOULDER: 'Shoulder',
  CHEST: 'Chest',
  WAIST: 'Waist',
  LEGS: 'Legs',
  FEET: 'Feet',
  WRIST: 'Wrist',
  HANDS: 'Hands',
  FINGER_1: 'Finger 1',
  FINGER_2: 'Finger 2',
  TRINKET_1: 'Trinket 1',
  TRINKET_2: 'Trinket 2',
  BACK: 'Back',
  MAIN_HAND: 'Main Hand',
  OFF_HAND: 'Off Hand',
  RANGED: 'Ranged',
  SHIRT: 'Shirt',
  TABARD: 'Tabard',
}
