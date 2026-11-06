import { describe, it, expect } from 'vitest'
// Decisions about the Message Content intent and blank-text reports. The module
// has no top-level requires, so importing it here needs neither discord.js nor
// supabase (bot.js logs in at require time and feedback.js loads both). This
// file is .mjs (ESM) so Vitest imports it correctly, and is excluded from tsconfig.
import messageContent from './message-content.js'

const {
  isMessageContentIntentEnabled,
  buildGatewayIntents,
  messageContentStartupNotice,
} = messageContent

const EM_DASH = String.fromCodePoint(0x2014)
const FAKE_BITS = { Guilds: 1, GuildMessages: 512, MessageContent: 32768, GuildMessageReactions: 1024 }

describe('buildGatewayIntents', () => {
  it('leaves Message Content out when the env var is unset', () => {
    expect(buildGatewayIntents(FAKE_BITS, {})).toEqual([1, 512, 1024])
  })

  it('adds Message Content in today\'s order when the env var is exactly true', () => {
    expect(buildGatewayIntents(FAKE_BITS, { DISCORD_MESSAGE_CONTENT_INTENT: 'true' })).toEqual([1, 512, 32768, 1024])
  })

  it.each(['false', '1', 'TRUE', ''])('keeps the intent off for %j', (value) => {
    const env = { DISCORD_MESSAGE_CONTENT_INTENT: value }
    expect(isMessageContentIntentEnabled(env)).toBe(false)
    expect(buildGatewayIntents(FAKE_BITS, env)).toEqual([1, 512, 1024])
  })
})

describe('messageContentStartupNotice', () => {
  it('returns null when the intent is enabled', () => {
    expect(messageContentStartupNotice({ DISCORD_MESSAGE_CONTENT_INTENT: 'true' })).toBeNull()
  })

  it('names the env var and says reports file without message text', () => {
    const notice = messageContentStartupNotice({})
    expect(notice).toContain('DISCORD_MESSAGE_CONTENT_INTENT')
    expect(notice).toContain('without message text')
    expect(notice).not.toContain(EM_DASH)
  })
})
