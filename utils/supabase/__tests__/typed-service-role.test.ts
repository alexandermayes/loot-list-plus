import { describe, it, expect, vi } from 'vitest'
import { createTypedServiceRoleClient, type TypedServiceClient } from '../typed-service-role'
import { createServiceRoleClient } from '../service-role'

vi.mock('../service-role', () => ({ createServiceRoleClient: vi.fn() }))

/**
 * Compile-time guard (FIX-06). Never called: `npm run typecheck` is the test.
 * Each directive below fails with TS2578 (unused @ts-expect-error) if the
 * expression underneath ever type-checks, i.e. if the client loses its schema
 * typing. Each guarded expression stays on one line so the directive binds to it.
 */
function typedClientRejectsUnknownNames(c: TypedServiceClient) {
  // @ts-expect-error the real table is blp_tracking, not bad_luck_protection
  void c.from('bad_luck_protection')
  // @ts-expect-error the real table is guild_item_priorities, not item_priorities
  void c.from('item_priorities')
  // @ts-expect-error the real column is item_slot, not slot
  void c.from('loot_items').select('id').eq('slot', 'x')
}

describe('createTypedServiceRoleClient', () => {
  it('returns exactly the client createServiceRoleClient builds', () => {
    const sentinel = { sentinel: true }
    vi.mocked(createServiceRoleClient).mockReturnValue(sentinel as never)
    expect(createTypedServiceRoleClient()).toBe(sentinel)
  })

  it('keeps the compile-time guard in place (see typedClientRejectsUnknownNames)', () => {
    expect(typeof typedClientRejectsUnknownNames).toBe('function')
  })
})
