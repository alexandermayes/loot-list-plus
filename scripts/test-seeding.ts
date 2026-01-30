/**
 * Test script to verify expansion seeding logic
 * Run with: npx tsx scripts/test-seeding.ts
 */

import { ITEM_CLASSIFICATIONS } from '../data/classic-wow-item-classifications'
import { TBC_ITEM_CLASSIFICATIONS } from '../data/tbc-item-classifications'
import { CLASSIC_ITEM_ROLES } from '../data/classic-item-roles'
import { TBC_ITEM_ROLES } from '../data/tbc-item-roles'
import { tbcRaids } from '../data/tbc-raids'
import { classicRaids } from '../data/classic-wow-raids'

// ANSI colors for output
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

function log(color: string, message: string) {
  console.log(`${color}${message}${RESET}`)
}

function testClassifications() {
  log(CYAN, '\n=== Testing Classifications ===\n')

  // Test TBC classifications
  const tbcReserved = Object.entries(TBC_ITEM_CLASSIFICATIONS).filter(([_, c]) => c === 'Reserved')
  const tbcLimited = Object.entries(TBC_ITEM_CLASSIFICATIONS).filter(([_, c]) => c === 'Limited')

  log(GREEN, `TBC Reserved items: ${tbcReserved.length}`)
  log(GREEN, `TBC Limited items: ${tbcLimited.length}`)

  // Test Classic classifications
  const classicReserved = Object.entries(ITEM_CLASSIFICATIONS).filter(([_, c]) => c === 'Reserved')
  const classicLimited = Object.entries(ITEM_CLASSIFICATIONS).filter(([_, c]) => c === 'Limited')

  log(GREEN, `Classic Reserved items: ${classicReserved.length}`)
  log(GREEN, `Classic Limited items: ${classicLimited.length}`)

  // Verify key items have correct classifications
  const tbcTestCases = [
    { name: 'Warglaive of Azzinoth (Main Hand)', expected: 'Reserved' },
    { name: "Thori'dal, the Stars' Fury", expected: 'Reserved' },
    { name: 'Bulwark of Azzinoth', expected: 'Reserved' },
    { name: 'Bracers of the Forgotten Conqueror', expected: 'Limited' },
    { name: 'Gloves of the Fallen Hero', expected: 'Limited' },
  ]

  let passed = 0
  let failed = 0

  for (const test of tbcTestCases) {
    const actual = TBC_ITEM_CLASSIFICATIONS[test.name]
    if (actual === test.expected) {
      log(GREEN, `  ✓ "${test.name}" = ${actual}`)
      passed++
    } else {
      log(RED, `  ✗ "${test.name}" expected ${test.expected}, got ${actual || 'undefined'}`)
      failed++
    }
  }

  return { passed, failed }
}

function testRoleMappings() {
  log(CYAN, '\n=== Testing Role Mappings ===\n')

  log(GREEN, `TBC items with roles: ${Object.keys(TBC_ITEM_ROLES).length}`)
  log(GREEN, `Classic items with roles: ${Object.keys(CLASSIC_ITEM_ROLES).length}`)

  // Verify key items have correct roles
  const tbcRoleTests = [
    { name: 'Warglaive of Azzinoth (Main Hand)', expected: ['physical'] },
    { name: 'Bulwark of Azzinoth', expected: ['tank'] },
    { name: "Zhar'doom, Greatstaff of the Devourer", expected: ['caster'] },
    { name: 'Crystal Spire of Karabor', expected: ['healer'] },
    { name: 'Stormrage Signet Ring', expected: ['caster', 'healer'] },
  ]

  const classicRoleTests = [
    { name: 'Thunderfury, Blessed Blade of the Windseeker', expected: ['tank'] },
    { name: 'Sulfuras, Hand of Ragnaros', expected: ['physical'] },
    { name: 'Azuresong Mageblade', expected: ['caster'] },
    { name: 'Rejuvenating Gem', expected: ['healer'] },
  ]

  let passed = 0
  let failed = 0

  log(YELLOW, '\nTBC Role Tests:')
  for (const test of tbcRoleTests) {
    const actual = TBC_ITEM_ROLES[test.name]
    const actualStr = JSON.stringify(actual?.sort())
    const expectedStr = JSON.stringify(test.expected.sort())
    if (actualStr === expectedStr) {
      log(GREEN, `  ✓ "${test.name}" = ${actualStr}`)
      passed++
    } else {
      log(RED, `  ✗ "${test.name}" expected ${expectedStr}, got ${actualStr || 'undefined'}`)
      failed++
    }
  }

  log(YELLOW, '\nClassic Role Tests:')
  for (const test of classicRoleTests) {
    const actual = CLASSIC_ITEM_ROLES[test.name]
    const actualStr = JSON.stringify(actual?.sort())
    const expectedStr = JSON.stringify(test.expected.sort())
    if (actualStr === expectedStr) {
      log(GREEN, `  ✓ "${test.name}" = ${actualStr}`)
      passed++
    } else {
      log(RED, `  ✗ "${test.name}" expected ${expectedStr}, got ${actualStr || 'undefined'}`)
      failed++
    }
  }

  return { passed, failed }
}

function testSeedingLogic() {
  log(CYAN, '\n=== Testing Seeding Logic ===\n')

  let passed = 0
  let failed = 0

  // Simulate the seeding logic for a few TBC items
  const testItems = [
    { name: 'Warglaive of Azzinoth (Main Hand)', slot: 'Main Hand', wowhead_id: '32837' },
    { name: 'Bulwark of Azzinoth', slot: 'Shield', wowhead_id: '32375' },
    { name: 'Some Random Item', slot: 'Trinket', wowhead_id: '99999' }, // Not in mappings
  ]

  for (const item of testItems) {
    const classification = TBC_ITEM_CLASSIFICATIONS[item.name] || 'Unlimited'
    const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0
    const roles = TBC_ITEM_ROLES[item.name] || []

    const seededItem = {
      name: item.name,
      item_slot: item.slot,
      wowhead_id: item.wowhead_id,
      classification,
      allocation_cost,
      roles,
      is_available: true,
    }

    log(YELLOW, `\nItem: ${item.name}`)
    log(GREEN, `  Classification: ${seededItem.classification}`)
    log(GREEN, `  Allocation Cost: ${seededItem.allocation_cost}`)
    log(GREEN, `  Roles: ${JSON.stringify(seededItem.roles)}`)

    // Verify expected values
    if (item.name === 'Warglaive of Azzinoth (Main Hand)') {
      if (seededItem.classification === 'Reserved' &&
          seededItem.allocation_cost === 1 &&
          JSON.stringify(seededItem.roles) === '["physical"]') {
        log(GREEN, `  ✓ Warglaive seeded correctly`)
        passed++
      } else {
        log(RED, `  ✗ Warglaive seeding incorrect`)
        failed++
      }
    }

    if (item.name === 'Some Random Item') {
      if (seededItem.classification === 'Unlimited' &&
          seededItem.allocation_cost === 0 &&
          seededItem.roles.length === 0) {
        log(GREEN, `  ✓ Unmapped item defaults correctly`)
        passed++
      } else {
        log(RED, `  ✗ Unmapped item defaults incorrect`)
        failed++
      }
    }
  }

  return { passed, failed }
}

function testRaidDataIntegrity() {
  log(CYAN, '\n=== Testing Raid Data Integrity ===\n')

  let passed = 0
  let failed = 0

  // Count items in TBC raids
  let tbcItemCount = 0
  let tbcWithClassification = 0
  let tbcWithRoles = 0

  for (const raid of tbcRaids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        tbcItemCount++
        if (TBC_ITEM_CLASSIFICATIONS[item.name]) {
          tbcWithClassification++
        }
        if (TBC_ITEM_ROLES[item.name]) {
          tbcWithRoles++
        }
      }
    }
  }

  log(GREEN, `TBC Total Items in Raids: ${tbcItemCount}`)
  log(GREEN, `TBC Items with Classification: ${tbcWithClassification} (${Math.round(tbcWithClassification/tbcItemCount*100)}%)`)
  log(GREEN, `TBC Items with Roles: ${tbcWithRoles} (${Math.round(tbcWithRoles/tbcItemCount*100)}%)`)

  // Count items in Classic raids
  let classicItemCount = 0
  let classicWithClassification = 0
  let classicWithRoles = 0

  for (const raid of classicRaids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        classicItemCount++
        if (ITEM_CLASSIFICATIONS[item.name]) {
          classicWithClassification++
        }
        if (CLASSIC_ITEM_ROLES[item.name]) {
          classicWithRoles++
        }
      }
    }
  }

  log(GREEN, `\nClassic Total Items in Raids: ${classicItemCount}`)
  log(GREEN, `Classic Items with Classification: ${classicWithClassification} (${Math.round(classicWithClassification/classicItemCount*100)}%)`)
  log(GREEN, `Classic Items with Roles: ${classicWithRoles} (${Math.round(classicWithRoles/classicItemCount*100)}%)`)

  // Find items in classification that don't exist in raids (potential typos)
  log(YELLOW, '\n--- Checking for orphaned classifications (potential typos) ---')
  const tbcRaidItems = new Set<string>()
  for (const raid of tbcRaids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        tbcRaidItems.add(item.name)
      }
    }
  }

  const orphanedClassifications: string[] = []
  for (const itemName of Object.keys(TBC_ITEM_CLASSIFICATIONS)) {
    if (!tbcRaidItems.has(itemName)) {
      orphanedClassifications.push(itemName)
    }
  }

  if (orphanedClassifications.length > 0) {
    log(YELLOW, `Found ${orphanedClassifications.length} classifications for items not in TBC raids:`)
    orphanedClassifications.slice(0, 10).forEach(name => log(YELLOW, `  - ${name}`))
    if (orphanedClassifications.length > 10) {
      log(YELLOW, `  ... and ${orphanedClassifications.length - 10} more`)
    }
  } else {
    log(GREEN, `✓ All TBC classifications match items in raids`)
    passed++
  }

  return { passed, failed }
}

// Run all tests
function main() {
  log(CYAN, '╔════════════════════════════════════════════════════════════╗')
  log(CYAN, '║         Expansion Seeding Test Suite                       ║')
  log(CYAN, '╚════════════════════════════════════════════════════════════╝')

  const results = {
    classifications: testClassifications(),
    roles: testRoleMappings(),
    seeding: testSeedingLogic(),
    integrity: testRaidDataIntegrity(),
  }

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0)

  log(CYAN, '\n╔════════════════════════════════════════════════════════════╗')
  log(CYAN, '║                    Test Summary                            ║')
  log(CYAN, '╚════════════════════════════════════════════════════════════╝')

  if (totalFailed === 0) {
    log(GREEN, `\n✓ All ${totalPassed} tests passed!`)
  } else {
    log(RED, `\n✗ ${totalFailed} tests failed, ${totalPassed} passed`)
  }
}

main()
