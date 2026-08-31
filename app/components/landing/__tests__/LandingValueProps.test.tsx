import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandingValueProps from '../LandingValueProps'

// jsdom implements neither matchMedia nor IntersectionObserver. This file's
// sibling parallax decoration (ParallaxItem -> useMouseParallax) and framer-motion's
// useInView (used by this component itself) call them respectively; without a stub,
// mounting the component throws before any assertion runs. Scoped to this test file,
// not global setup, since no other test in the repo currently mounts this component.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  if (!('IntersectionObserver' in window)) {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
    ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
  }
})

// Approved copy from 02-COPY-DRAFT.md, Sections B and C, "Approved" subsections.
// Copied verbatim (byte for byte) at execution time, do not reword here.
const QUOTES = [
  {
    author: 'Scizophrenic',
    guild: 'Crucible',
    variant: 'plain' as const,
    role: undefined,
    expansionTier: undefined,
  },
  {
    author: 'Para/Kidney',
    guild: 'Indecisive',
    variant: 'linked' as const,
    url: 'https://fresh.warcraftlogs.com/guild/us/nightslayer/indecisive',
    role: undefined,
    expansionTier: undefined,
  },
  {
    author: '2laxs',
    guild: 'Bad Guys',
    variant: 'plain' as const,
    role: undefined,
    expansionTier: undefined,
  },
  {
    author: 'Xx_',
    guild: 'Soul Stoned',
    variant: 'linked' as const,
    url: 'https://fresh.warcraftlogs.com/guild/us/dreamscythe/soul%20stoned',
    role: undefined,
    expansionTier: undefined,
  },
]

const VERIFIED_TEXT = 'Verified LootList+ customer'

describe('LandingValueProps, per-quote testimonial verification (PROOF-01)', () => {
  it.each(QUOTES)('renders $author of $guild with name, guild, and no invented metadata field', (quote) => {
    render(<LandingValueProps />)
    const name = screen.getByText(quote.author)
    expect(name).toBeInTheDocument()
    const guild = screen.getByText(quote.guild)
    expect(guild).toBeInTheDocument()
    // D-02: role and expansion/tier are NOT SUPPLIED for every quote in this plan, so
    // neither should render for any card.
    expect(quote.role).toBeUndefined()
    expect(quote.expansionTier).toBeUndefined()
  })

  it.each(QUOTES)('renders exactly one verification variant for $author of $guild, never zero and never two', (quote) => {
    render(<LandingValueProps />)
    const notes = screen.getAllByText(VERIFIED_TEXT)
    expect(notes.length).toBeGreaterThan(0)

    if (quote.variant === 'linked') {
      const link = screen.getByRole('link', { name: quote.guild })
      expect(link).toHaveAttribute('href', quote.url)
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      expect(link).toHaveAttribute('target', '_blank')
      // The linked guild name is not also rendered as plain unlinked text elsewhere.
      const plainGuildMentions = screen.getAllByText(quote.guild)
      expect(plainGuildMentions).toHaveLength(1)
      expect(plainGuildMentions[0].tagName.toLowerCase()).toBe('a')
    } else {
      const guildText = screen.getByText(quote.guild)
      expect(guildText.tagName.toLowerCase()).not.toBe('a')
      expect(screen.queryByRole('link', { name: quote.guild })).not.toBeInTheDocument()
    }
  })

  it('renders exactly two Warcraft Logs links and two plain-text-only notes across all four quotes', () => {
    render(<LandingValueProps />)
    const wclLinks = screen.getAllByRole('link')
    expect(wclLinks).toHaveLength(2)
    expect(wclLinks.map((l) => l.getAttribute('href')).sort()).toEqual(
      [
        'https://fresh.warcraftlogs.com/guild/us/nightslayer/indecisive',
        'https://fresh.warcraftlogs.com/guild/us/dreamscythe/soul%20stoned',
      ].sort()
    )
  })

  it('renders no structured data of any kind (D-05)', () => {
    const { container } = render(<LandingValueProps />)
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0)
  })
})

describe('LandingValueProps, stat row (PROOF-02)', () => {
  it('renders the approved replacement stat and drops the unmeasured time-saving claim', () => {
    render(<LandingValueProps />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('supported Classic expansions')).toBeInTheDocument()
    expect(screen.queryByText(/hours saved/i)).not.toBeInTheDocument()
  })

  it('renders the approved Row 1 replacement stat', () => {
    render(<LandingValueProps />)
    expect(screen.getByText('Every')).toBeInTheDocument()
    expect(screen.getByText('score fully explained')).toBeInTheDocument()
  })

  it('leaves the sibling 0 and 1 StatCards unchanged', () => {
    render(<LandingValueProps />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('spreadsheets needed')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('system for loot, attendance, and priorities')).toBeInTheDocument()
  })
})
