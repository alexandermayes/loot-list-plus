/**
 * One decorative icon per need slot (UI-06). Icons never carry meaning: the
 * slot word and cost word do, so every consumer renders them aria-hidden.
 *
 * Each name was checked against the installed @hugeicons/core-free-icons
 * package. The UI-SPEC candidate list named AxeIcon and BowArrowIcon, which
 * the free package does not ship, and offered no glyph for trinkets, relics,
 * back, shoulders, wrist or legs, so those slots (and the off-hand weapon,
 * which would otherwise repeat the main hand sword) use the neutral target
 * icon the need labels already use elsewhere. Adding a glyph later is a
 * one-line change here.
 */
import {
  ArmoredBootIcon,
  BeltIcon,
  BodyArmorIcon,
  BookOpen01Icon,
  BoxingGloveIcon,
  CrownIcon,
  DiamondIcon,
  EarRings01Icon,
  Shield01Icon,
  Sword01Icon,
  Sword02Icon,
  Target02Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

import type { NeedSlotKey } from '@/domain/loot/needs'

export const NEED_SLOT_ICON_FALLBACK: IconSvgElement = Target02Icon

export const NEED_SLOT_ICONS: Readonly<Record<NeedSlotKey, IconSvgElement>> = Object.freeze({
  'two-hand-weapon': Sword02Icon,
  'main-hand-weapon': Sword01Icon,
  'off-hand-weapon': NEED_SLOT_ICON_FALLBACK,
  'ranged-weapon': NEED_SLOT_ICON_FALLBACK,
  trinket: NEED_SLOT_ICON_FALLBACK,
  ring: DiamondIcon,
  neck: EarRings01Icon,
  back: NEED_SLOT_ICON_FALLBACK,
  shield: Shield01Icon,
  'off-hand-item': BookOpen01Icon,
  relic: NEED_SLOT_ICON_FALLBACK,
  head: CrownIcon,
  shoulders: NEED_SLOT_ICON_FALLBACK,
  chest: BodyArmorIcon,
  wrist: NEED_SLOT_ICON_FALLBACK,
  hands: BoxingGloveIcon,
  waist: BeltIcon,
  legs: NEED_SLOT_ICON_FALLBACK,
  feet: ArmoredBootIcon,
})
