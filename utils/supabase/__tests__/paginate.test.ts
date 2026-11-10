import { describe, it, expect, vi } from 'vitest'
import { paginatedSelect, selectAllPagesOrThrow } from '../paginate'

// ─── paginatedSelect ──────────────────────────────────────
//
// The helper loops calling the builder with .range(start, end) windows of
// `pageSize` (default 1000), accumulating results until:
//   - the builder returns no data (null or empty array), OR
//   - a page comes back smaller than pageSize (the natural exhaustion signal)
//
// We test with a small pageSize so the loop math is observable. Behaviour
// must be identical at pageSize=1000.

/**
 * Build a stub query function that returns `total` rows split across pages.
 * Records every (start, end) call so tests can assert the windowing math.
 */
function makeFetcher<T>(rows: T[]) {
  const calls: { start: number; end: number }[] = []
  const fetcher = (start: number, end: number) => {
    calls.push({ start, end })
    return Promise.resolve({ data: rows.slice(start, end + 1) })
  }
  return { fetcher, calls }
}

describe('paginatedSelect', () => {
  it('returns an empty array when the first page is empty', async () => {
    const { fetcher, calls } = makeFetcher<number>([])
    const result = await paginatedSelect(fetcher, 100)
    expect(result).toEqual([])
    // One probe call is enough to learn the table is empty.
    expect(calls).toEqual([{ start: 0, end: 99 }])
  })

  it('returns all rows when total fits in one page', async () => {
    const rows = [1, 2, 3]
    const { fetcher, calls } = makeFetcher(rows)
    const result = await paginatedSelect(fetcher, 100)
    expect(result).toEqual(rows)
    // A short page (< pageSize) is the exhaustion signal — no second call.
    expect(calls).toEqual([{ start: 0, end: 99 }])
  })

  it('returns all rows across multiple pages', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => i)
    const { fetcher, calls } = makeFetcher(rows)
    const result = await paginatedSelect(fetcher, 100)
    expect(result).toEqual(rows)
    expect(result).toHaveLength(250)
    expect(calls).toEqual([
      { start: 0, end: 99 },
      { start: 100, end: 199 },
      { start: 200, end: 299 },
    ])
  })

  it('issues an extra probe page when total is a clean multiple of pageSize', async () => {
    // 200 rows, pageSize 100 → page 1 (100 rows) + page 2 (100 rows) + probe (0 rows)
    // The third call is necessary: page 2 was exactly pageSize so we can't tell
    // we're done without another probe.
    const rows = Array.from({ length: 200 }, (_, i) => i)
    const { fetcher, calls } = makeFetcher(rows)
    const result = await paginatedSelect(fetcher, 100)
    expect(result).toHaveLength(200)
    expect(calls).toHaveLength(3)
    expect(calls[2]).toEqual({ start: 200, end: 299 })
  })

  it('stops on a null data result', async () => {
    let callCount = 0
    const calls: number[] = []
    const fetcher = (start: number, _end: number) => {
      calls.push(start)
      callCount++
      // First call returns a full page, second returns null (e.g. RLS-blocked or error)
      if (callCount === 1) {
        return Promise.resolve({ data: [1, 2, 3] })
      }
      return Promise.resolve({ data: null })
    }
    const result = await paginatedSelect<number>(fetcher, 3)
    // First page consumed; null on second halts iteration without throwing.
    expect(result).toEqual([1, 2, 3])
    expect(calls).toEqual([0, 3])
  })

  it('uses the default pageSize of 1000 when not specified', async () => {
    const { fetcher, calls } = makeFetcher<number>([])
    await paginatedSelect(fetcher)
    expect(calls).toEqual([{ start: 0, end: 999 }])
  })

  it('preserves order across pages (does not interleave)', async () => {
    const rows = Array.from({ length: 7 }, (_, i) => `r${i}`)
    const { fetcher } = makeFetcher(rows)
    const result = await paginatedSelect(fetcher, 3)
    // Order from the fetcher is preserved: r0, r1, r2 then r3, r4, r5 then r6
    expect(result).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'])
  })

  it('handles pageSize of 1 (degenerate but valid)', async () => {
    const rows = ['a', 'b']
    const { fetcher, calls } = makeFetcher(rows)
    const result = await paginatedSelect(fetcher, 1)
    expect(result).toEqual(['a', 'b'])
    // 3 calls: a (full page), b (full page), then probe returns empty
    expect(calls).toEqual([
      { start: 0, end: 0 },
      { start: 1, end: 1 },
      { start: 2, end: 2 },
    ])
  })

  it('awaits sequentially (does not fire all pages in parallel)', async () => {
    // Even with a slow first page, the second page must not be requested
    // until the first resolves — otherwise we don't know whether to stop.
    const inFlight: number[] = []
    let active = 0
    const fetcher = async (start: number, end: number) => {
      active++
      inFlight.push(active)
      // Yield to the microtask queue
      await new Promise((r) => setTimeout(r, 1))
      active--
      const data = start === 0 ? [1, 2] : start === 2 ? [3, 4] : []
      return { data }
    }
    await paginatedSelect<number>(fetcher, 2)
    // Concurrency must never exceed 1.
    expect(Math.max(...inFlight)).toBe(1)
  })

  it('forwards errors from the builder (does not silently swallow)', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('rls denied')))
    await expect(paginatedSelect(fetcher, 100)).rejects.toThrow('rls denied')
    // One call attempted; rejection propagates immediately.
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

// ─── selectAllPagesOrThrow ────────────────────────────────
//
// Same windowing as paginatedSelect, but every page's error is checked and
// thrown with the label, so a route can answer 500 rather than a partial list.

/** Fetcher returning { data, error: null } pages of `rows`, recording each (start, end) window. */
function makeCheckedFetcher<T>(rows: T[]) {
  const calls: { start: number; end: number }[] = []
  const fetcher = (start: number, end: number) => {
    calls.push({ start, end })
    return Promise.resolve({ data: rows.slice(start, end + 1), error: null })
  }
  return { fetcher, calls }
}

describe('selectAllPagesOrThrow', () => {
  it('requests one more page after a page of exactly pageSize rows and returns those rows', async () => {
    const rows = [1, 2, 3]
    const { fetcher, calls } = makeCheckedFetcher(rows)
    const result = await selectAllPagesOrThrow('things', fetcher, 3)
    expect(result).toEqual(rows)
    expect(calls).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ])
  })

  it('returns all of pageSize + 1 rows', async () => {
    const rows = [1, 2, 3, 4]
    const { fetcher } = makeCheckedFetcher(rows)
    expect(await selectAllPagesOrThrow('things', fetcher, 3)).toEqual(rows)
  })

  it('returns [] after one call when the first page is empty', async () => {
    const { fetcher, calls } = makeCheckedFetcher<number>([])
    expect(await selectAllPagesOrThrow('things', fetcher, 3)).toEqual([])
    expect(calls).toEqual([{ start: 0, end: 2 }])
  })

  it('rejects with the label and message when the second page errors', async () => {
    let call = 0
    const fetcher = () => {
      call++
      return Promise.resolve(
        call === 1
          ? { data: [1, 2, 3], error: null }
          : { data: null, error: { message: 'boom' } },
      )
    }
    await expect(selectAllPagesOrThrow('things', fetcher, 3)).rejects.toThrow('Failed to read things: boom')
  })

  it('returns exactly 1000 rows with two calls at the default page size', async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => i)
    const { fetcher, calls } = makeCheckedFetcher(rows)
    const result = await selectAllPagesOrThrow('things', fetcher)
    expect(result).toHaveLength(1000)
    expect(calls).toEqual([
      { start: 0, end: 999 },
      { start: 1000, end: 1999 },
    ])
  })

  it('returns all 1001 rows at the default page size', async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => i)
    const { fetcher } = makeCheckedFetcher(rows)
    const result = await selectAllPagesOrThrow('things', fetcher)
    expect(result).toHaveLength(1001)
    expect(result[1000]).toBe(1000)
  })

  it('treats a null page with no error as empty', async () => {
    const fetcher = () => Promise.resolve({ data: null, error: null })
    expect(await selectAllPagesOrThrow<number>('things', fetcher, 3)).toEqual([])
  })
})
