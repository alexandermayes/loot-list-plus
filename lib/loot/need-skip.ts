/**
 * D-16 safety net for readers that meet a need row they were not written for.
 *
 * Every reader still has an explicit, tested need branch (DISC-06). This only
 * makes a skipped need row visible in the logs, once per request, instead of
 * dropping it silently. The log's first argument is a fixed string and the reader
 * name is a typed constant passed as data, so no request data ever reaches a
 * format string (CodeQL tainted format string rule).
 */

/** The readers that report skipped need rows through this helper. */
export type NeedReaderName = 'addon-guild-data' | 'addon-export-string' | 'character-gear'

/** One per request. Create it at the top of the reader and pass it down. */
export interface NeedSkipScope {
  readonly reader: NeedReaderName
  skipped: number
  warned: boolean
}

const NEED_SKIPPED_MESSAGE = 'Need rows skipped by a reader that does not handle them yet'

export function createNeedSkipScope(reader: NeedReaderName): NeedSkipScope {
  return { reader, skipped: 0, warned: false }
}

/**
 * Count skipped need rows and warn on the first positive count only. A count that
 * is not a positive integer is ignored and does not use up the one warning.
 */
export function noteNeedSkipped(scope: NeedSkipScope, count = 1): void {
  if (!Number.isInteger(count) || count <= 0) return

  scope.skipped += count
  if (scope.warned) return

  scope.warned = true
  console.warn(NEED_SKIPPED_MESSAGE, { reader: scope.reader, skipped: scope.skipped })
}
