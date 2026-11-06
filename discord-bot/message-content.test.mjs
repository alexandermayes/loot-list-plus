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
  decideReportHandling,
  fallbackReportTitle,
  messageDescription,
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

const NO_TEXT = '(message text not available to the bot, see the Discord link below)'

describe('decideReportHandling', () => {
  it.each(['reaction', 'channel'])('uses the thread name for a forum starter from %s, with or without text', (source) => {
    expect(decideReportHandling({ text: '', attachmentCount: 0, forumStarter: true, source })).toBe('thread-name')
    expect(decideReportHandling({ text: 'hello', attachmentCount: 2, forumStarter: true, source })).toBe('thread-name')
  })

  it('falls back for a blank reaction on a non-forum message', () => {
    expect(decideReportHandling({ text: '', attachmentCount: 0, forumStarter: false, source: 'reaction' })).toBe('fallback')
  })

  it('skips a blank channel message and a blank message with no source', () => {
    expect(decideReportHandling({ text: '', attachmentCount: 0, forumStarter: false, source: 'channel' })).toBe('skip')
    expect(decideReportHandling({ text: '', attachmentCount: 0, forumStarter: false })).toBe('skip')
  })

  it.each(['reaction', 'channel'])('generates a title when text is present (%s)', (source) => {
    expect(decideReportHandling({ text: 'boss loot missing', attachmentCount: 0, forumStarter: false, source })).toBe('generated')
  })

  it.each(['reaction', 'channel'])('generates a title for attachments only (%s)', (source) => {
    expect(decideReportHandling({ text: '', attachmentCount: 1, forumStarter: false, source })).toBe('generated')
  })

  it('treats whitespace-only and undefined text as blank', () => {
    expect(decideReportHandling({ text: '   \n ', attachmentCount: 0, forumStarter: false, source: 'reaction' })).toBe('fallback')
    expect(decideReportHandling({ text: undefined, attachmentCount: 0, forumStarter: false, source: 'channel' })).toBe('skip')
  })
})

describe('fallbackReportTitle', () => {
  it('builds the title from the channel label only', () => {
    expect(fallbackReportTitle('#general')).toBe('Discord report in #general')
    expect(fallbackReportTitle('#general')).not.toContain(EM_DASH)
  })
})

describe('messageDescription', () => {
  it('trims real text', () => {
    expect(messageDescription('  boss loot missing \n')).toBe('boss loot missing')
  })

  it.each([undefined, null, '', '   '])('returns the not-available wording for %j', (value) => {
    expect(messageDescription(value)).toBe(NO_TEXT)
    expect(messageDescription(value)).not.toContain(EM_DASH)
  })
})
