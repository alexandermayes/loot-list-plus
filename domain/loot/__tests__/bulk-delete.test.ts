import { describe, it, expect } from 'vitest'
import { bulkDeleteIds, bulkDeleteNotice, BULK_DELETE_STATUSES, BULK_DELETE_MAX_IDS, BULK_DELETE_CHUNK_SIZE } from '../bulk-delete'

describe('bulkDeleteIds (GH #352)', () => {
  it('keeps only pending ids for target pending', () => {
    const lists = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'approved' },
      { id: '3', status: 'pending' },
      { id: '4', status: 'draft' },
    ]
    expect(bulkDeleteIds(lists, 'pending')).toEqual(['1', '3'])
  })

  it('keeps pending, approved and rejected but drops drafts for target all', () => {
    const lists = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'approved' },
      { id: '3', status: 'rejected' },
      { id: '4', status: 'draft' },
    ]
    expect(bulkDeleteIds(lists, 'all')).toEqual(['1', '2', '3'])
  })

  it('de-duplicates and keeps input order', () => {
    const lists = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending' },
      { id: '1', status: 'pending' },
    ]
    expect(bulkDeleteIds(lists, 'pending')).toEqual(['1', '2'])
  })

  it('returns an empty array for empty input', () => {
    expect(bulkDeleteIds([], 'pending')).toEqual([])
    expect(bulkDeleteIds([], 'all')).toEqual([])
  })
})

describe('BULK_DELETE_STATUSES', () => {
  it('maps pending to pending only, and all to pending, approved, rejected', () => {
    expect(BULK_DELETE_STATUSES.pending).toEqual(['pending'])
    expect(BULK_DELETE_STATUSES.all).toEqual(['pending', 'approved', 'rejected'])
  })
})

describe('bulkDeleteNotice', () => {
  it('gives a success notice with the plural form when count matches requested and is not 1', () => {
    expect(bulkDeleteNotice(3, 3)).toEqual({ type: 'success', message: 'Deleted 3 submissions' })
  })

  it('gives a success notice with the singular form when count is 1', () => {
    expect(bulkDeleteNotice(1, 1)).toEqual({ type: 'success', message: 'Deleted 1 submission' })
  })

  it('gives a warning notice when count is lower than requested', () => {
    const notice = bulkDeleteNotice(2, 5)
    expect(notice.type).toBe('warning')
    expect(notice.message).toBe('Deleted 2 of 5 lists. The rest changed or were removed after the page loaded.')
  })

  it('gives a success notice for zero requested and zero deleted', () => {
    expect(bulkDeleteNotice(0, 0)).toEqual({ type: 'success', message: 'Deleted 0 submissions' })
  })
})

describe('bulk delete limits', () => {
  it('caps requests at 1000 ids per the server validation', () => {
    expect(BULK_DELETE_MAX_IDS).toBe(1000)
  })

  it('chunks delete calls at 100 ids per the server validation', () => {
    expect(BULK_DELETE_CHUNK_SIZE).toBe(100)
  })
})
