/**
 * Discord fetch wrapper with simple retry logic.
 *
 * Retries up to 2 times on failure (3 total attempts) with a 1-second delay
 * between retries. Respects Discord rate limits (429) by waiting for the
 * duration specified in the Retry-After header.
 *
 * This is a drop-in replacement for fetch() when calling Discord APIs.
 */

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function discordFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init)
      lastResponse = response

      // On rate limit, wait and retry
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter ? Math.ceil(parseFloat(retryAfter) * 1000) : RETRY_DELAY_MS
        console.warn(`[discord] Rate limited (429). Retrying after ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await sleep(waitMs)
        continue
      }

      // On server error (5xx), retry after a delay
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(`[discord] Server error ${response.status}. Retrying after ${RETRY_DELAY_MS}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await sleep(RETRY_DELAY_MS)
        continue
      }

      // For all other responses (success or client error), return immediately
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_RETRIES) {
        console.warn(`[discord] Fetch failed: ${lastError.message}. Retrying after ${RETRY_DELAY_MS}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await sleep(RETRY_DELAY_MS)
      }
    }
  }

  // If we exhausted retries with a response, return the last response
  if (lastResponse) {
    return lastResponse
  }

  // If all retries failed with network errors, throw the last error
  throw lastError ?? new Error('Discord fetch failed after all retries')
}
