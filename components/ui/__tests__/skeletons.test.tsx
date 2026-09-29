import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  GuildSettingsContentSkeleton,
  RaidTrackingPageSkeleton,
  LootListBracketSkeleton,
} from '../skeletons'

describe('skeletons', () => {
  it('GuildSettingsContentSkeleton renders 8 card placeholders, matching the real guild-settings page 8 top-level sections', () => {
    const { container } = render(<GuildSettingsContentSkeleton />)

    expect(container.firstElementChild?.children.length).toBe(8)
  })

  it("RaidTrackingPageSkeleton's legend renders exactly 5 swatch placeholder groups, each pairing one square Skeleton with one label Skeleton", () => {
    const { container } = render(<RaidTrackingPageSkeleton />)

    expect(container.querySelectorAll('.flex.items-center.gap-1').length).toBe(5)
  })

  it("LootListBracketSkeleton's bracket header carries neither former left-border utility class", () => {
    const { container } = render(<LootListBracketSkeleton />)

    expect(container.innerHTML).not.toContain('border-l-4')
    expect(container.innerHTML).not.toContain('border-l-muted')
  })
})
