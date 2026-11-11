import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetYourFiveSendRow } from '../SetYourFiveSendRow'
import { SET_YOUR_FIVE_COOLDOWN_ERROR, SET_YOUR_FIVE_POST_FAILED_ERROR } from '@/domain/loot/set-your-five'

// Why these cases: an officer's send reaches the whole guild, so the row has to
// ask first, show only counts, and stop a double tap (UI-15, D-23). Copy is
// DRAFT for the 04-19 sign-off. The guild id is synthetic.

const GUILD_ID = 'guild-1'
const showNotification = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification }),
}))

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

function setup(props: Partial<{ hasChannel: boolean; hasDiscoveryTier: boolean }> = {}) {
  render(
    <SetYourFiveSendRow
      guildId={GUILD_ID}
      hasChannel={props.hasChannel ?? true}
      hasDiscoveryTier={props.hasDiscoveryTier ?? true}
    />,
  )
  return userEvent.setup()
}

async function sendAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Send Set your 5' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Send Set your 5' }))
  // The modal fades out, so wait until only the row's own button is left.
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('[D-23] visibility', () => {
  it('renders nothing when the active expansion has no Discovery tier', () => {
    setup({ hasDiscoveryTier: false })
    expect(screen.queryByText('Ask raiders to set their 5')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send Set your 5' })).not.toBeInTheDocument()
  })

  it('shows the label, the helper and an enabled button when a channel is set', () => {
    setup()
    expect(screen.getByText('Ask raiders to set their 5')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Posts a message in the raid summary channel and sends each member a direct message with a link to the picker.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
    expect(screen.queryByText('Choose a raid summary channel first.')).not.toBeInTheDocument()
  })

  it('is disabled with the helper when no raid summary channel is set', async () => {
    const user = setup({ hasChannel: false })
    const button = screen.getByRole('button', { name: 'Send Set your 5' })
    expect(button).toBeDisabled()
    expect(screen.getByText('Choose a raid summary channel first.')).toBeInTheDocument()
    await user.click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('[UI-15] confirm before sending', () => {
  it('opens the confirm and sends nothing until it is confirmed', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Send Set your 5' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Send Set your 5 to your guild?')
    expect(dialog).toHaveTextContent(
      'This posts in the raid summary channel and sends a direct message to every active member with Discord linked. Members who have direct messages turned off are skipped quietly.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing when the officer picks Not now', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Send Set your 5' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
  })
})

describe('[D-23] sending and the counts-only result', () => {
  it('posts the guild id, shows Sending... while it runs, then the counts', async () => {
    let finish: (value: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { finish = resolve }))
    const user = setup()
    await sendAndConfirm(user)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/discord/set-your-five')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ guild_id: GUILD_ID })

    const sending = await screen.findByRole('button', { name: /Sending\.\.\./ })
    expect(sending).toBeDisabled()

    await act(async () => {
      finish(jsonResponse(200, { posted: true, sent: 3, skipped: 1 }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Posted in the channel. Sent to 3 members. 1 skipped.')
    expect(showNotification).toHaveBeenCalledWith('success', 'Posted in the channel. Sent to 3 members. 1 skipped.')
  })

  it('says "Sent to 1 member." for one', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { posted: true, sent: 1, skipped: 1 }))
    const user = setup()
    await sendAndConfirm(user)
    expect(await screen.findByRole('status')).toHaveTextContent('Posted in the channel. Sent to 1 member. 1 skipped.')
  })

  it('leaves out the skipped sentence for zero', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { posted: true, sent: 4, skipped: 0 }))
    const user = setup()
    await sendAndConfirm(user)
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Posted in the channel. Sent to 4 members.')
    expect(status).not.toHaveTextContent('skipped')
  })

  it('says "Nobody to message." when no member could be reached', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { posted: true, sent: 0, skipped: 5 }))
    const user = setup()
    await sendAndConfirm(user)
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Posted in the channel. Nobody to message.')
    expect(status).not.toHaveTextContent('skipped')
  })
})

describe('[UI-15] 60-second disable after a send', () => {
  it('keeps the button disabled for 60 seconds, then enables it again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fetchMock.mockResolvedValue(jsonResponse(200, { posted: true, sent: 2, skipped: 0 }))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<SetYourFiveSendRow guildId={GUILD_ID} hasChannel hasDiscoveryTier />)
    await sendAndConfirm(user)

    await screen.findByRole('status')
    const button = screen.getByRole('button', { name: 'Send Set your 5' })
    expect(button).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(59_000)
    })
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeDisabled()

    await act(async () => {
      vi.advanceTimersByTime(1_500)
    })
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
  })
})

describe('E6 errors', () => {
  it('shows the post-failed sentence and keeps the button enabled on a 502', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { error: SET_YOUR_FIVE_POST_FAILED_ERROR }))
    const user = setup()
    await sendAndConfirm(user)
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('error', "Couldn't post in the channel. Try again."))
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
    expect(screen.queryByText(/Posted in the channel/)).not.toBeInTheDocument()
  })

  it('shows the same sentence when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    const user = setup()
    await sendAndConfirm(user)
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('error', "Couldn't post in the channel. Try again."))
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
  })

  it("shows the route's cooldown sentence on a 429 and keeps the button enabled", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: SET_YOUR_FIVE_COOLDOWN_ERROR, retry_after_minutes: 40 }))
    const user = setup()
    await sendAndConfirm(user)
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('error', SET_YOUR_FIVE_COOLDOWN_ERROR))
    expect(screen.getByRole('button', { name: 'Send Set your 5' })).toBeEnabled()
  })
})
