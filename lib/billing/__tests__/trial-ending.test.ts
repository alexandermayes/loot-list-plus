import { describe, it, expect } from 'vitest'
import {
  hasPaymentMethodOnFile,
  trialWarningDecision,
  discordTimestamp,
  sanitizeGuildName,
  buildTrialEndingMessage,
} from '../trial-ending'

describe('hasPaymentMethodOnFile', () => {
  it('is true from a bare subscription default_payment_method string', () => {
    expect(hasPaymentMethodOnFile({ id: 's1', default_payment_method: 'pm_1', default_source: null }, null)).toBe(true)
  })

  it('is true from an expanded subscription default_payment_method object', () => {
    expect(
      hasPaymentMethodOnFile({ id: 's1', default_payment_method: { id: 'pm_1' }, default_source: null }, null)
    ).toBe(true)
  })

  it('is true from a bare subscription default_source string (legacy leg)', () => {
    expect(
      hasPaymentMethodOnFile({ id: 's1', default_payment_method: null, default_source: 'card_1' }, null)
    ).toBe(true)
  })

  it('is true from an expanded subscription default_source object', () => {
    expect(
      hasPaymentMethodOnFile({ id: 's1', default_payment_method: null, default_source: { id: 'card_1' } }, null)
    ).toBe(true)
  })

  it('is true from the customer invoice-settings default payment method as a bare string (the portal case)', () => {
    expect(
      hasPaymentMethodOnFile(
        { id: 's1', default_payment_method: null, default_source: null },
        { invoice_settings: { default_payment_method: 'pm_2' } }
      )
    ).toBe(true)
  })

  it('is true from the customer invoice-settings default payment method as an expanded object', () => {
    expect(
      hasPaymentMethodOnFile(
        { id: 's1', default_payment_method: null, default_source: null },
        { invoice_settings: { default_payment_method: { id: 'pm_2' } } }
      )
    ).toBe(true)
  })

  it('is true from the customer default_source', () => {
    expect(
      hasPaymentMethodOnFile(
        { id: 's1', default_payment_method: null, default_source: null },
        { default_source: 'card_2' }
      )
    ).toBe(true)
  })

  it('is false when invoice_settings.default_payment_method is explicitly null', () => {
    expect(
      hasPaymentMethodOnFile(
        { id: 's1', default_payment_method: null, default_source: null },
        { invoice_settings: { default_payment_method: null } }
      )
    ).toBe(false)
  })

  it('is false when customer is null - retrieve failed or customer deleted', () => {
    expect(
      hasPaymentMethodOnFile({ id: 's1', default_payment_method: null, default_source: null }, null)
    ).toBe(false)
  })

  it('treats empty string as absence, not presence, on every leg', () => {
    expect(
      hasPaymentMethodOnFile(
        { id: 's1', default_payment_method: '', default_source: '' },
        { invoice_settings: { default_payment_method: '' } }
      )
    ).toBe(false)
  })

  it('is false when every field is absent entirely', () => {
    expect(hasPaymentMethodOnFile({ id: 's1' }, {})).toBe(false)
  })
})

describe('trialWarningDecision', () => {
  it('reports not_ours when metadata is absent entirely', () => {
    expect(trialWarningDecision({ id: 's1', status: 'trialing' }, null)).toEqual({
      warn: false,
      reason: 'not_ours',
    })
  })

  it('reports not_ours when metadata has no guild_id key', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'trialing', metadata: { other: 'x' } }, null)
    ).toEqual({ warn: false, reason: 'not_ours' })
  })

  it('reports not_ours when guild_id is the empty string', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'trialing', metadata: { guild_id: '' } }, null)
    ).toEqual({ warn: false, reason: 'not_ours' })
  })

  it('reports not_trialing when status is active', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'active', metadata: { guild_id: 'g1' } }, null)
    ).toEqual({ warn: false, reason: 'not_trialing' })
  })

  it('reports not_trialing when status is paused', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'paused', metadata: { guild_id: 'g1' } }, null)
    ).toEqual({ warn: false, reason: 'not_trialing' })
  })

  it('reports not_trialing when status is absent', () => {
    expect(trialWarningDecision({ id: 's1', metadata: { guild_id: 'g1' } }, null)).toEqual({
      warn: false,
      reason: 'not_trialing',
    })
  })

  it('reports payment_method_on_file when the subscription itself carries a default', () => {
    expect(
      trialWarningDecision(
        {
          id: 's1',
          status: 'trialing',
          metadata: { guild_id: 'g1' },
          default_payment_method: 'pm_1',
        },
        null
      )
    ).toEqual({ warn: false, reason: 'payment_method_on_file' })
  })

  it('reports payment_method_on_file when only the customer carries an invoice-settings default', () => {
    expect(
      trialWarningDecision(
        { id: 's1', status: 'trialing', metadata: { guild_id: 'g1' } },
        { invoice_settings: { default_payment_method: 'pm_2' } }
      )
    ).toEqual({ warn: false, reason: 'payment_method_on_file' })
  })

  it('reports warn when a trialing, owned subscription has nothing anywhere', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'trialing', metadata: { guild_id: 'g1' } }, {})
    ).toEqual({ warn: true, reason: 'warn' })
  })

  it('reports warn when nothing is on the sub and the customer is null', () => {
    expect(
      trialWarningDecision({ id: 's1', status: 'trialing', metadata: { guild_id: 'g1' } }, null)
    ).toEqual({ warn: true, reason: 'warn' })
  })

  it('checks ownership before status: a subscription that is both not ours and not trialing reports not_ours', () => {
    expect(trialWarningDecision({ id: 's1', status: 'active' }, null)).toEqual({
      warn: false,
      reason: 'not_ours',
    })
  })
})

describe('discordTimestamp', () => {
  it('renders a whole-second unix timestamp as Discord date markdown', () => {
    expect(discordTimestamp(1790000000)).toBe('<t:1790000000:D>')
  })

  it('floors a fractional unix timestamp', () => {
    expect(discordTimestamp(1790000000.9)).toBe('<t:1790000000:D>')
  })

  it('is null for null', () => {
    expect(discordTimestamp(null)).toBeNull()
  })

  it('is null for undefined', () => {
    expect(discordTimestamp(undefined)).toBeNull()
  })

  it('is null for NaN', () => {
    expect(discordTimestamp(NaN)).toBeNull()
  })

  it('is null for zero', () => {
    expect(discordTimestamp(0)).toBeNull()
  })

  it('is null for a negative number', () => {
    expect(discordTimestamp(-1)).toBeNull()
  })
})

describe('sanitizeGuildName', () => {
  it('leaves an ordinary name unchanged', () => {
    expect(sanitizeGuildName('Midnight Council')).toBe('Midnight Council')
  })

  it('removes bracket and parenthesis characters that could form a markdown link', () => {
    const result = sanitizeGuildName('Evil[click here](https://evil.example)')
    expect(result).not.toBeNull()
    expect(result).not.toMatch(/[[\]()]/)
  })

  it('removes the at sign from an @everyone mention attempt', () => {
    const result = sanitizeGuildName('@everyone Guild')
    expect(result).not.toBeNull()
    expect(result).not.toContain('@')
  })

  it('removes markdown emphasis and code characters: asterisks, underscores, tildes, backticks, pipes', () => {
    const result = sanitizeGuildName('*a_b~c`d|e')
    expect(result).not.toBeNull()
    expect(result).not.toMatch(/[*_~`|]/)
  })

  it('truncates a 200-character name to at most 64 characters', () => {
    const longName = 'A'.repeat(200)
    const result = sanitizeGuildName(longName)
    expect(result).not.toBeNull()
    expect((result as string).length).toBeLessThanOrEqual(64)
  })

  it('is null when nothing usable remains after sanitising', () => {
    expect(sanitizeGuildName('   ')).toBeNull()
  })

  it('is null for null', () => {
    expect(sanitizeGuildName(null)).toBeNull()
  })
})

describe('buildTrialEndingMessage', () => {
  const billingUrl = 'https://www.getlootlist.com/guild-settings'

  it('includes the guild name, a Discord timestamp token, and the billing url when both guild name and trial end are present', () => {
    const { description } = buildTrialEndingMessage({
      guildName: 'Midnight Council',
      trialEnd: 1790000000,
      billingUrl,
    })
    expect(description).toContain('Midnight Council')
    expect(description).toContain('<t:')
    expect(description).toContain(billingUrl)
  })

  it('drops the possessive clause and renders no null/undefined when guild name is null', () => {
    const { description } = buildTrialEndingMessage({ guildName: null, trialEnd: 1790000000, billingUrl })
    expect(description).not.toContain('null')
    expect(description).not.toContain('undefined')
    expect(description).not.toContain('for **')
  })

  it('falls back to word-form "ends soon" and renders no null/undefined when trial end is null', () => {
    const { description } = buildTrialEndingMessage({
      guildName: 'Midnight Council',
      trialEnd: null,
      billingUrl,
    })
    expect(description).not.toContain('<t:')
    expect(description).not.toContain('null')
    expect(description).not.toContain('undefined')
  })

  it('renders no null/undefined when both guild name and trial end are null', () => {
    const { description } = buildTrialEndingMessage({ guildName: null, trialEnd: null, billingUrl })
    expect(description).not.toContain('null')
    expect(description).not.toContain('undefined')
  })

  it('contains no em dash or en dash character, enforcing the project copy rule mechanically', () => {
    const { description } = buildTrialEndingMessage({
      guildName: 'Midnight Council',
      trialEnd: 1790000000,
      billingUrl,
    })
    // Written as Unicode escapes so this test file does not itself contain
    // the characters it forbids.
    expect(description).not.toMatch(/[—–]/)
  })

  it('stays within the Discord embed description limit of 4096 characters', () => {
    const { description } = buildTrialEndingMessage({
      guildName: 'Midnight Council',
      trialEnd: 1790000000,
      billingUrl,
    })
    expect(description.length).toBeLessThanOrEqual(4096)
  })

  it('uses the yellow reminder color 0xeab308', () => {
    const { color } = buildTrialEndingMessage({
      guildName: 'Midnight Council',
      trialEnd: 1790000000,
      billingUrl,
    })
    expect(color).toBe(0xeab308)
  })
})
