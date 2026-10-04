/**
 * Shared /api/attendance/bulk fetch helper for the raid-tracking import
 * (261003-she D-06). executeImport makes several attendance and signup
 * writes per import; before this module most of them ignored the
 * response, so a failed save was silent. sendAttendanceBulk never throws
 * and always reports whether a call failed, so the import can collect
 * every failure and show the officer one error toast.
 */

/** One failed /api/attendance/bulk call: its HTTP status (if the fetch completed) and the server's error text (if it sent one). */
export interface AttendanceSaveFailure {
  status: number | null
  error: string | null
}

/** Start of the error toast shown after a raid-tracking import in which an attendance or signup save failed (COPY C-4). */
export const IMPORT_SAVE_FAILED_MESSAGE = "Some attendance from this import wasn't saved."

/** End of that toast when the server gave no error text (COPY C-5). */
export const IMPORT_SAVE_FAILED_FALLBACK = 'Refresh the page, then import again.'

/**
 * Calls /api/attendance/bulk with the given method and JSON body. Returns
 * null for an ok response. For a non-ok response, reads the JSON body (a
 * parse failure counts as no body) and returns the status plus the body's
 * error when it is a non-empty (after trimming) string, else null. A
 * thrown fetch (network failure) is also reported, with a null status and
 * a null error. Never throws.
 */
export async function sendAttendanceBulk(
  method: 'POST' | 'PATCH' | 'DELETE',
  body: Record<string, unknown>,
): Promise<AttendanceSaveFailure | null> {
  try {
    const res = await fetch('/api/attendance/bulk', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) return null

    const status = res.status
    const errorBody = await res.json().catch(() => null) as { error?: unknown } | null
    const errorText = typeof errorBody?.error === 'string' && errorBody.error.trim().length > 0
      ? errorBody.error
      : null

    console.error('Attendance save failed:', { method, status })
    return { status, error: errorText }
  } catch {
    console.error('Attendance save failed:', { method })
    return { status: null, error: null }
  }
}

/**
 * Builds the single error toast message for a raid-tracking import that had
 * one or more failed saves. Null when there were no failures. Otherwise
 * IMPORT_SAVE_FAILED_MESSAGE, a space, then the error text of the first
 * failure that has one, or IMPORT_SAVE_FAILED_FALLBACK when none does.
 */
export function importSaveFailureMessage(failures: readonly AttendanceSaveFailure[]): string | null {
  if (failures.length === 0) return null
  const withText = failures.find(f => f.error)
  return `${IMPORT_SAVE_FAILED_MESSAGE} ${withText?.error ?? IMPORT_SAVE_FAILED_FALLBACK}`
}
