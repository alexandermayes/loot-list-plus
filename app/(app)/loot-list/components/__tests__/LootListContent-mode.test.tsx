import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import LootListContent from '@/app/(app)/loot-list/components/LootListContent'
import { DEFAULT_MAX_ALLOCATION_POINTS, DEFAULT_MAX_TOKENS, DEFAULT_MAX_CATEGORY } from '@/domain/loot/bracket-validation'

// The page switch keys on one context field. Everything the page imports for
// its own work is replaced, so this file proves the switch and nothing else.
const hoisted = vi.hoisted(() => ({
  lootList: { current: {} as Record<string, unknown> },
}))

vi.mock('@/app/contexts/LootListContext', () => ({
  useLootList: () => hoisted.lootList.current,
}))
vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => ({
    activeGuild: { id: 'guild-1', name: 'Test guild' },
    activeCharacter: { id: 'char-1', name: 'Testchar', class: { name: 'Mage', color_hex: '#3fc7eb' } },
    guildExpansions: [],
    viewingExpansionId: null,
    setViewingExpansion: vi.fn(),
  }),
}))
vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: vi.fn() }),
}))
vi.mock('@/app/components/ExpansionGuard', () => ({
  ExpansionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/app/(app)/loot-list/components/NeedPicker', () => ({
  NeedPicker: () => <div data-testid="need-picker" />,
}))
vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: vi.fn(),
  usePagePerf: vi.fn(),
}))
vi.mock('@/app/components/BisImportModal', () => ({ BisImportModal: () => null }))

function setLootList(needTierSlots: Record<string, number> | null) {
  hoisted.lootList.current = {
    lootItems: [],
    submission: null,
    rankings: {},
    raidTiers: [],
    phaseTiers: [],
    phases: [1],
    resolvedGroups: [{ canonicalPhase: 1, phases: [1] }],
    phaseSubmissionStatuses: {},
    selectedPhase: 1,
    phaseDeadline: null,
    enforceSlotRestrictions: true,
    bracketLimits: {
      maxAllocationPoints: DEFAULT_MAX_ALLOCATION_POINTS,
      maxTokens: DEFAULT_MAX_TOKENS,
      maxCategory: DEFAULT_MAX_CATEGORY,
    },
    equippedWowheadIds: new Set<number>(),
    isLoading: false,
    isContentLoading: false,
    isSaving: false,
    isImportingBis: false,
    hasNoRaidTiers: false,
    hasChanges: false,
    originalStatus: null,
    removedItems: [],
    lockedPositions: {},
    needTierSlots,
    setSelectedPhase: vi.fn(),
    handleItemSelect: vi.fn(),
    moveRanking: vi.fn(),
    clearAllRankings: vi.fn(),
    saveSubmission: vi.fn(),
    importBisItems: vi.fn(),
    refreshGear: vi.fn(),
    removeApprovedItem: vi.fn(),
    restoreRemovedItem: vi.fn(),
  }
}

describe('LootListContent picker switch (D-12)', () => {
  beforeEach(() => {
    window.matchMedia =
      window.matchMedia ??
      ((query: string) =>
        ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList)
  })

  it('renders the 50-rank editor and no picker when need_tier_slots is null', () => {
    setLootList(null)
    render(<LootListContent />)

    expect(screen.queryByTestId('need-picker')).toBeNull()
    expect(screen.getByText('Bracket 1 (50-48)')).toBeInTheDocument()
  })

  it('renders the picker instead of the editor when need_tier_slots is a map', () => {
    setLootList({ 'tier-a': 1, 'tier-b': 2, 'tier-c': 3 })
    render(<LootListContent />)

    expect(screen.getByTestId('need-picker')).toBeInTheDocument()
    expect(screen.queryByText('Bracket 1 (50-48)')).toBeNull()
  })
})
