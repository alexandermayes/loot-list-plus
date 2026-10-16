/**
 * Guild join membership fields (server only, pure).
 *
 * Once resolveGuildJoinAccess has decided that a user may add a character to
 * a guild, this module decides what the new or reactivated membership row
 * looks like: its role, whether it starts on trial and from when, and which
 * joined_via to record. Both attach routes (the manual form and the
 * Battle.net import) call it so the two paths cannot drift apart again.
 *
 * No Supabase or Next imports: the routes read the data and pass it in.
 *
 * Not exported from the domain/guild barrel: that barrel is imported by client
 * code.
 */

import type { GuildJoinAccess } from '@/domain/guild/join-grants'

/** Trial standing of one of the user's other active characters in the guild. */
export interface SiblingMembership {
  membership_status: string | null
  trial_started_at: string | null
}

export interface JoinMembershipFields {
  role: string
  membership_status?: 'trial'
  trial_started_at?: string
}

type AllowedJoinAccess = Extract<GuildJoinAccess, { allowed: true }>

/** The literal guilds/route.ts writes for the creator's first membership. */
const CREATOR_ROLE = 'Guild Master'

/**
 * Decide role and trial fields for a membership the access check has allowed.
 *
 * - creator: always Guild Master and never trial. guilds/route.ts writes the
 *   creator's first membership with that literal and create_guild_default_roles
 *   guarantees the role exists, so the import path must match the manual one.
 * - grant: the default role, plus trial fields when the guild starts new
 *   members as trial, matching the invite and Discord join routes.
 * - member: the default role, and trial whenever any of the user's other
 *   characters in the guild is on trial. GET /api/guild-members already
 *   reports the user as trial if any character is, so the write side has to
 *   agree. The new-member setting does not apply: an existing member's alt is
 *   not a new member.
 */
export function resolveJoinMembershipFields(args: {
  access: AllowedJoinAccess
  defaultRole: string
  newMembersStartAsTrial: boolean
  now?: Date
}): JoinMembershipFields {
  const now = args.now ?? new Date()

  if (args.access.via === 'creator') {
    // regression for #356: the Battle.net import gave the creator the default role
    return { role: CREATOR_ROLE }
  }

  if (args.access.via === 'grant') {
    if (args.newMembersStartAsTrial) {
      return { role: args.defaultRole, membership_status: 'trial', trial_started_at: now.toISOString() }
    }
    return { role: args.defaultRole }
  }

  // regression for #356: an alt got full status while the main was still on trial
  const trialSiblings = args.access.siblings.filter(s => s.membership_status === 'trial')
  if (trialSiblings.length === 0) {
    return { role: args.defaultRole }
  }
  // Compare as instants, not strings: Postgres may hand back +00:00 offsets
  // while the routes write Z suffixes.
  const starts = trialSiblings
    .map(s => s.trial_started_at)
    .filter((s): s is string => typeof s === 'string' && !Number.isNaN(Date.parse(s)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))
  return {
    role: args.defaultRole,
    membership_status: 'trial',
    trial_started_at: starts[0] ?? now.toISOString(),
  }
}

/**
 * Decide joined_via. For a join record holder the recorded source (invite or
 * Discord) is what actually let them in, so it overrides whatever the client
 * sent; the client's value is only a hint. Creator and member paths have no
 * recorded source, so the requested value stands.
 */
export function resolveJoinedVia(access: AllowedJoinAccess, requested: string): string {
  if (access.via === 'grant' && access.source) {
    return access.source
  }
  return requested
}
