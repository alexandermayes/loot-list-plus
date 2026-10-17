// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveJoinMembershipFields, resolveJoinedVia } from '../join-membership'

const NOW = new Date('2026-10-16T12:00:00.000Z')
const CREATOR = { allowed: true, via: 'creator' } as const
const grant = (source: 'invite_code' | 'discord_verify' | null) =>
  ({ allowed: true, via: 'grant', source }) as const
const member = (siblings: Array<{ membership_status: string | null; trial_started_at: string | null }>) =>
  ({ allowed: true, via: 'member', siblings }) as const

describe('resolveJoinMembershipFields', () => {
  it('gives the creator Guild Master and never trial fields, even with trial on', () => {
    // regression for #356: the Battle.net import gave the creator the default role
    const fields = resolveJoinMembershipFields({
      access: CREATOR,
      defaultRole: 'Raider',
      newMembersStartAsTrial: true,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Guild Master' })
  })

  it('gives a join record holder the default role plus trial fields when trial is on', () => {
    const fields = resolveJoinMembershipFields({
      access: grant('invite_code'),
      defaultRole: 'Raider',
      newMembersStartAsTrial: true,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Raider', membership_status: 'trial', trial_started_at: NOW.toISOString() })
  })

  it('gives a join record holder only the default role when trial is off', () => {
    const fields = resolveJoinMembershipFields({
      access: grant('invite_code'),
      defaultRole: 'Raider',
      newMembersStartAsTrial: false,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Raider' })
  })

  it('puts an alt on trial with the sibling trial start when any sibling is on trial, ignoring the new-member setting', () => {
    // regression for #356: an alt got full status while the main was still on trial
    const fields = resolveJoinMembershipFields({
      access: member([
        { membership_status: 'trial', trial_started_at: '2026-09-01T00:00:00.000Z' },
        { membership_status: 'full', trial_started_at: null },
      ]),
      defaultRole: 'Raider',
      newMembersStartAsTrial: false,
      now: NOW,
    })

    expect(fields).toEqual({
      role: 'Raider',
      membership_status: 'trial',
      trial_started_at: '2026-09-01T00:00:00.000Z',
    })
  })

  it('uses the earliest trial start when several siblings are on trial', () => {
    const fields = resolveJoinMembershipFields({
      access: member([
        { membership_status: 'trial', trial_started_at: '2026-09-15T00:00:00.000Z' },
        { membership_status: 'trial', trial_started_at: '2026-09-01T00:00:00.000Z' },
      ]),
      defaultRole: 'Raider',
      newMembersStartAsTrial: false,
      now: NOW,
    })

    expect(fields.trial_started_at).toBe('2026-09-01T00:00:00.000Z')
  })

  it('falls back to now when the trial sibling has no trial start', () => {
    const fields = resolveJoinMembershipFields({
      access: member([{ membership_status: 'trial', trial_started_at: null }]),
      defaultRole: 'Raider',
      newMembersStartAsTrial: false,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Raider', membership_status: 'trial', trial_started_at: NOW.toISOString() })
  })

  it('gives an alt of full members only the default role even when trial is on', () => {
    const fields = resolveJoinMembershipFields({
      access: member([
        { membership_status: 'full', trial_started_at: null },
        { membership_status: 'full', trial_started_at: '2026-08-01T00:00:00.000Z' },
      ]),
      defaultRole: 'Raider',
      newMembersStartAsTrial: true,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Raider' })
  })

  it('gives only the default role on the member path with no siblings', () => {
    const fields = resolveJoinMembershipFields({
      access: member([]),
      defaultRole: 'Raider',
      newMembersStartAsTrial: true,
      now: NOW,
    })

    expect(fields).toEqual({ role: 'Raider' })
  })
})

describe('resolveJoinedVia', () => {
  it('returns the recorded join source for a join record holder', () => {
    expect(resolveJoinedVia(grant('discord_verify'), 'manual')).toBe('discord_verify')
    expect(resolveJoinedVia(grant('invite_code'), 'manual')).toBe('invite_code')
  })

  it('returns the requested value for a join record with no source', () => {
    expect(resolveJoinedVia(grant(null), 'manual')).toBe('manual')
  })

  it('returns the requested value unchanged for the creator and member paths', () => {
    expect(resolveJoinedVia(CREATOR, 'manual')).toBe('manual')
    expect(resolveJoinedVia(member([]), 'battlenet_import')).toBe('battlenet_import')
  })
})
