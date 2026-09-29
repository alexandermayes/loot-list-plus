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

/**
 * Outcome of a `sendDirectMessage` call, shaped for logging. `stage`
 * distinguishes which of the two calls in the DM sequence produced the
 * outcome - opening the DM channel and sending the message fail for
 * different reasons and deserve different log severities from the caller.
 */
export interface SendDirectMessageOutcome {
  ok: boolean
  stage: 'open_channel' | 'send_message'
  status: number | null
}

/**
 * Send a Discord DM: open (or reuse) a DM channel with `recipientId`, then
 * post `body` to it. Both calls go through `discordFetch`, so the existing
 * 429/5xx retry behaviour applies unchanged.
 *
 * Contract: never throws. `discordFetch` itself throws once its network
 * retries are exhausted (see above), so the try/catch here is load-bearing,
 * not defensive - a thrown network error comes back as a not-ok outcome
 * with a null status rather than propagating.
 *
 * Non-exceptional, expected failures a caller should treat quietly rather
 * than as an error: the recipient shares no server with the bot, the
 * recipient has DMs from server members disabled, or the id is stale.
 * Discord answers these with 403 and error code 50007 (the DM-refused
 * family). These are states of the world, not faults - this helper reports
 * them without logging at error severity and leaves the log-severity
 * decision to the caller.
 */
export async function sendDirectMessage(
  botToken: string,
  recipientId: string,
  body: Record<string, unknown>
): Promise<SendDirectMessageOutcome> {
  let channelRes: Response
  try {
    channelRes = await discordFetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: recipientId }),
    })
  } catch {
    // discordFetch throws once its network retries are exhausted.
    return { ok: false, stage: 'open_channel', status: null }
  }
  if (!channelRes.ok) {
    return { ok: false, stage: 'open_channel', status: channelRes.status }
  }

  let channel: { id: string }
  try {
    channel = await channelRes.json()
  } catch {
    // A 2xx response with an unparseable body - treat like the channel-open
    // stage failing, since there is no channel id to send to.
    return { ok: false, stage: 'open_channel', status: channelRes.status }
  }

  try {
    const messageRes = await discordFetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!messageRes.ok) {
      return { ok: false, stage: 'send_message', status: messageRes.status }
    }
    return { ok: true, stage: 'send_message', status: messageRes.status }
  } catch {
    return { ok: false, stage: 'send_message', status: null }
  }
}
