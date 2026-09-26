'use client'

import { useState } from 'react'
import {
  FOREVER_RULESETS,
  REALM_REGIONS,
  REGION_CODES,
  formatForeverRuleset,
  parseForeverRuleset,
  type ForeverRegionCode,
  type ForeverRuleset,
} from '@/data/wow-realms'
import { ComboDropdown, type DropdownOption } from '@/components/ui/searchable-dropdown'

interface ForeverRulesetSelectorProps {
  /** Current formatted value, e.g. "PvP (US)", or '' when nothing is selected yet */
  value: string
  /** Called with the formatted "{Ruleset} ({Region})" value once both are chosen, or '' otherwise */
  onChange: (value: string) => void
  disabled?: boolean
}

const REGION_OPTIONS: DropdownOption[] = REALM_REGIONS.map((region) => ({
  value: REGION_CODES[region],
  label: REGION_CODES[region],
}))

const RULESET_OPTIONS: DropdownOption[] = FOREVER_RULESETS.map((ruleset) => ({
  value: ruleset,
  label: ruleset,
}))

/**
 * WoW Forever has no realms: guilds pick a region and a ruleset (Normal, PvP,
 * Roleplaying, Hardcore) instead. Emits the combined "{Ruleset} ({Region})"
 * string that is stored in the same guilds.realm column a normal realm uses.
 */
export default function ForeverRulesetSelector({ value, onChange, disabled = false }: ForeverRulesetSelectorProps) {
  const parsed = parseForeverRuleset(value)
  const [region, setRegion] = useState<string>(parsed?.region || '')
  const [ruleset, setRuleset] = useState<string>(parsed?.ruleset || '')

  // Keep internal selection in sync if the parent resets or loads a new value.
  // Adjusted during render (not an effect) per React's "storing information
  // from previous renders" pattern, so there is no extra render or flicker.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    const next = parseForeverRuleset(value)
    setRegion(next?.region || '')
    setRuleset(next?.ruleset || '')
  }

  const emit = (nextRegion: string, nextRuleset: string) => {
    if (nextRegion && nextRuleset) {
      onChange(formatForeverRuleset(nextRuleset as ForeverRuleset, nextRegion as ForeverRegionCode))
    } else {
      onChange('')
    }
  }

  const handleRegionChange = (nextRegion: string) => {
    setRegion(nextRegion)
    setRuleset('')
    emit(nextRegion, '')
  }

  const handleRulesetChange = (nextRuleset: string) => {
    setRuleset(nextRuleset)
    emit(region, nextRuleset)
  }

  return (
    <ComboDropdown
      prefixValue={region}
      onPrefixChange={handleRegionChange}
      prefixOptions={REGION_OPTIONS}
      prefixPlaceholder="Region"
      value={ruleset}
      onChange={handleRulesetChange}
      options={RULESET_OPTIONS}
      placeholder="Ruleset"
      searchable={false}
      clearable={true}
      disabled={disabled}
    />
  )
}
