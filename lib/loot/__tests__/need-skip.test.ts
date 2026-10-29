// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNeedSkipScope, noteNeedSkipped } from '../need-skip'

const FIXED_MESSAGE = 'Need rows skipped by a reader that does not handle them yet'

describe('need-skip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a scope for the named reader with nothing skipped yet', () => {
    expect(createNeedSkipScope('addon-guild-data')).toEqual({
      reader: 'addon-guild-data',
      skipped: 0,
      warned: false,
    })
  })

  it('counts every skip but warns once per scope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = createNeedSkipScope('addon-guild-data')

    noteNeedSkipped(scope)
    noteNeedSkipped(scope)
    noteNeedSkipped(scope)

    expect(scope.skipped).toBe(3)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('logs a fixed first argument and the reader name as data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = createNeedSkipScope('addon-export-string')

    noteNeedSkipped(scope, 2)

    expect(warn).toHaveBeenCalledWith(FIXED_MESSAGE, expect.objectContaining({ reader: 'addon-export-string' }))
    expect(warn.mock.calls[0][0]).toBe(FIXED_MESSAGE)
  })

  it('adds a batch count in one call', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = createNeedSkipScope('character-gear')

    noteNeedSkipped(scope, 5)
    noteNeedSkipped(scope, 4)

    expect(scope.skipped).toBe(9)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'ignores a count of %s: no change, no log',
    (count) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const scope = createNeedSkipScope('character-gear')

      noteNeedSkipped(scope, count)

      expect(scope).toEqual({ reader: 'character-gear', skipped: 0, warned: false })
      expect(warn).not.toHaveBeenCalled()
    },
  )

  it('does not let an ignored count use up the one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = createNeedSkipScope('addon-guild-data')

    noteNeedSkipped(scope, 0)
    noteNeedSkipped(scope, 1)

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('logs once per scope, so two requests each log once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = createNeedSkipScope('addon-guild-data')
    const second = createNeedSkipScope('addon-guild-data')

    noteNeedSkipped(first)
    noteNeedSkipped(first)
    noteNeedSkipped(second)

    expect(warn).toHaveBeenCalledTimes(2)
  })
})
