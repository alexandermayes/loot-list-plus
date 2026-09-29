import { describe, it, expect, vi } from 'vitest'
import {
  paymentMethodCustomerId,
  resumableSubscriptionIds,
  resumePausedSubscriptions,
} from '../resume-paused'

describe('paymentMethodCustomerId', () => {
  it('reads the bare customer id string', () => {
    expect(paymentMethodCustomerId({ customer: 'cus_1' })).toBe('cus_1')
  })

  it('reads the id off the expanded customer object', () => {
    expect(paymentMethodCustomerId({ customer: { id: 'cus_2' } })).toBe('cus_2')
  })

  it('is null for a null customer - reachable per the SDK union', () => {
    expect(paymentMethodCustomerId({ customer: null })).toBeNull()
  })

  it('is null when customer is absent entirely', () => {
    expect(paymentMethodCustomerId({})).toBeNull()
  })

  it('is null for an empty string - would make the list call malformed', () => {
    expect(paymentMethodCustomerId({ customer: '' })).toBeNull()
  })
})

describe('resumableSubscriptionIds', () => {
  it('is empty for an empty array', () => {
    expect(resumableSubscriptionIds([])).toEqual([])
  })

  it('is empty for null', () => {
    expect(resumableSubscriptionIds(null)).toEqual([])
  })

  it('is empty for undefined', () => {
    expect(resumableSubscriptionIds(undefined)).toEqual([])
  })

  it('keeps one subscription whose metadata.guild_id is set', () => {
    expect(
      resumableSubscriptionIds([{ id: 'sub_1', metadata: { guild_id: 'g1' } }])
    ).toEqual(['sub_1'])
  })

  it('drops a subscription with no metadata key at all', () => {
    expect(resumableSubscriptionIds([{ id: 'sub_1' }])).toEqual([])
  })

  it('drops a subscription with metadata present but no guild_id', () => {
    expect(resumableSubscriptionIds([{ id: 'sub_1', metadata: { other: 'x' } }])).toEqual([])
  })

  it('drops a subscription whose guild_id is the empty string', () => {
    expect(
      resumableSubscriptionIds([{ id: 'sub_1', metadata: { guild_id: '' } }])
    ).toEqual([])
  })

  it('keeps both ids, in input order, when both carry a guild_id', () => {
    expect(
      resumableSubscriptionIds([
        { id: 'sub_1', metadata: { guild_id: 'g1' } },
        { id: 'sub_2', metadata: { guild_id: 'g2' } },
      ])
    ).toEqual(['sub_1', 'sub_2'])
  })

  it('keeps only the second id when only the second carries a guild_id - the data[0] case', () => {
    expect(
      resumableSubscriptionIds([
        { id: 'sub_1' },
        { id: 'sub_2', metadata: { guild_id: 'g2' } },
      ])
    ).toEqual(['sub_2'])
  })

  it('keeps both ids, undeduplicated, when they share the same guild_id', () => {
    expect(
      resumableSubscriptionIds([
        { id: 'sub_1', metadata: { guild_id: 'g1' } },
        { id: 'sub_2', metadata: { guild_id: 'g1' } },
      ])
    ).toEqual(['sub_1', 'sub_2'])
  })
})

describe('resumePausedSubscriptions', () => {
  it('is a no-op when the list resolves empty - redelivery and the ordinary-checkout case are free', async () => {
    const list = vi.fn().mockResolvedValue({ data: [] })
    const resume = vi.fn()
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.paused).toBe(0)
    expect(outcome.resumed).toEqual([])
    expect(outcome.listFailed).toBe(false)
    expect(resume).not.toHaveBeenCalled()
  })

  it('does not resume a paused subscription with no guild_id, but reports it as paused', async () => {
    const list = vi.fn().mockResolvedValue({ data: [{ id: 'sub_1' }] })
    const resume = vi.fn()
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.paused).toBe(1)
    expect(outcome.resumed).toEqual([])
    expect(resume).not.toHaveBeenCalled()
  })

  it('resumes one owned subscription and calls resume exactly once with its id', async () => {
    const list = vi.fn().mockResolvedValue({ data: [{ id: 'sub_1', metadata: { guild_id: 'g1' } }] })
    const resume = vi.fn().mockResolvedValue(undefined)
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.resumed).toEqual(['sub_1'])
    expect(resume).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledWith('sub_1')
  })

  it('resumes both owned subscriptions and calls resume twice', async () => {
    const list = vi.fn().mockResolvedValue({
      data: [
        { id: 'sub_1', metadata: { guild_id: 'g1' } },
        { id: 'sub_2', metadata: { guild_id: 'g2' } },
      ],
    })
    const resume = vi.fn().mockResolvedValue(undefined)
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.resumed).toEqual(['sub_1', 'sub_2'])
    expect(resume).toHaveBeenCalledTimes(2)
  })

  it('keeps resuming the second subscription when the first resume rejects, and resolves rather than rejecting', async () => {
    const list = vi.fn().mockResolvedValue({
      data: [
        { id: 'sub_1', metadata: { guild_id: 'g1' } },
        { id: 'sub_2', metadata: { guild_id: 'g2' } },
      ],
    })
    const resume = vi.fn().mockImplementation((id: string) =>
      id === 'sub_1' ? Promise.reject(new Error('needs invoice payment')) : Promise.resolve(undefined)
    )
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.resumed).toEqual(['sub_2'])
    expect(outcome.failed).toEqual(['sub_1'])
  })

  it('resolves with listFailed true, no calls to resume, when list itself rejects', async () => {
    const list = vi.fn().mockRejectedValue(new Error('stripe is down'))
    const resume = vi.fn()
    const outcome = await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_1')
    expect(outcome.listFailed).toBe(true)
    expect(outcome.resumed).toEqual([])
    expect(outcome.failed).toEqual([])
    expect(resume).not.toHaveBeenCalled()
  })

  it('passes the customer id, the literal paused status, and a limit of 100 to list', async () => {
    const list = vi.fn().mockResolvedValue({ data: [] })
    const resume = vi.fn()
    await resumePausedSubscriptions({ subscriptions: { list, resume } }, 'cus_42')
    expect(list).toHaveBeenCalledWith({ customer: 'cus_42', status: 'paused', limit: 100 })
  })
})
