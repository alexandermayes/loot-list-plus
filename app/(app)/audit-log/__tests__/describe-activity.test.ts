import { describe, it, expect } from 'vitest'
import { describeActivity, getCategory, type AuditLog } from '../_client'

// Why these cases: the Set your 5 send row (table_name set_your_five_sends)
// fell through to the generic label, so officers read "created set your five
// sends". regression for IN-01 (Phase 4 review). Every id is synthetic.

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    table_name: 'set_your_five_sends',
    record_id: 'guild-1',
    action: 'INSERT',
    user_id: 'user-1',
    user_display_name: 'Officer',
    old_data: null,
    new_data: { posted: true },
    changed_fields: null,
    created_at: '2026-11-11T00:00:00Z',
    _character_names: {},
    ...overrides,
  }
}

describe('the Set your 5 send row in the audit log', () => {
  it('reads as a sentence, not as the table name', () => {
    expect(describeActivity(log())).toEqual({ summary: 'sent Set your 5 to the guild' })
  })

  it('sits with the member activity', () => {
    expect(getCategory('set_your_five_sends')).toBe('members')
  })

  it('keeps the generic label for a table it does not know', () => {
    expect(describeActivity(log({ table_name: 'some_other_table' })).summary).toBe('created some other table')
    expect(getCategory('some_other_table')).toBe('settings')
  })
})
