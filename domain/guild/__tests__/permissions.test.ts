import { describe, it, expect } from 'vitest'
import {
  roleHasPermission,
  ALL_PERMISSION_CODES,
  PERMISSIONS,
  ROLE_POSITIONS,
  isOfficerPosition,
  isGuildMasterPosition,
  type PermissionCode,
} from '../roles'

// ─── PERMISSIONS constant integrity ─────────────────────────

describe('PERMISSIONS constant', () => {
  it('defines exactly 9 permissions', () => {
    expect(ALL_PERMISSION_CODES).toHaveLength(9)
  })

  it('every permission has a label and description', () => {
    for (const code of ALL_PERMISSION_CODES) {
      const perm = PERMISSIONS[code]
      expect(perm.label).toBeTruthy()
      expect(perm.description).toBeTruthy()
      expect(typeof perm.label).toBe('string')
      expect(typeof perm.description).toBe('string')
    }
  })

  it('ALL_PERMISSION_CODES matches PERMISSIONS keys', () => {
    expect(new Set(ALL_PERMISSION_CODES)).toEqual(new Set(Object.keys(PERMISSIONS)))
  })

  it('contains the expected permission codes', () => {
    const expected = [
      'manage_submissions',
      'manage_loot',
      'manage_attendance',
      'manage_members',
      'manage_settings',
      'manage_roster',
      'manage_reserves',
      'view_audit_log',
      'view_master_sheet',
    ]
    expect(ALL_PERMISSION_CODES).toEqual(expect.arrayContaining(expected))
    expect(expected).toEqual(expect.arrayContaining([...ALL_PERMISSION_CODES]))
  })
})

// ─── Position threshold sanity ──────────────────────────────

describe('position thresholds', () => {
  it('Officer threshold is 50', () => {
    expect(ROLE_POSITIONS.OFFICER).toBe(50)
    expect(isOfficerPosition(50)).toBe(true)
    expect(isOfficerPosition(49)).toBe(false)
  })

  it('Guild Master threshold is 100', () => {
    expect(ROLE_POSITIONS.GUILD_MASTER).toBe(100)
    expect(isGuildMasterPosition(100)).toBe(true)
    expect(isGuildMasterPosition(99)).toBe(false)
  })

  it('Officer threshold includes Guild Master', () => {
    expect(isOfficerPosition(100)).toBe(true)
    expect(isOfficerPosition(150)).toBe(true)
  })
})

// ─── roleHasPermission — Officer/GM catch-all ───────────────

describe('roleHasPermission — officer catch-all', () => {
  it('Officer (position 50) gets ALL permissions with empty array', () => {
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(50, [], perm)).toBe(true)
    }
  })

  it('Guild Master (position 100) gets ALL permissions with empty array', () => {
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(100, [], perm)).toBe(true)
    }
  })

  it('custom officer position (75) gets ALL permissions', () => {
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(75, [], perm)).toBe(true)
    }
  })

  it('officer ignores permissions array entirely', () => {
    // Officer with only manage_loot should still get manage_settings
    expect(roleHasPermission(50, ['manage_loot'], 'manage_settings')).toBe(true)
    // Officer with empty array gets everything
    expect(roleHasPermission(60, [], 'view_audit_log')).toBe(true)
  })
})

// ─── roleHasPermission — granular permissions for non-officers ─

describe('roleHasPermission — granular permissions', () => {
  it('Member (position 0) with no permissions gets nothing', () => {
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(0, [], perm)).toBe(false)
    }
  })

  it('custom role (position 25) with no permissions gets nothing', () => {
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(25, [], perm)).toBe(false)
    }
  })

  it('grants only the specific permission in the array', () => {
    expect(roleHasPermission(10, ['manage_loot'], 'manage_loot')).toBe(true)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_submissions')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_attendance')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_members')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_settings')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_roster')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'manage_reserves')).toBe(false)
    expect(roleHasPermission(10, ['manage_loot'], 'view_audit_log')).toBe(false)
  })

  it('grants multiple specified permissions', () => {
    const perms = ['manage_loot', 'manage_attendance', 'manage_reserves']
    expect(roleHasPermission(10, perms, 'manage_loot')).toBe(true)
    expect(roleHasPermission(10, perms, 'manage_attendance')).toBe(true)
    expect(roleHasPermission(10, perms, 'manage_reserves')).toBe(true)
    expect(roleHasPermission(10, perms, 'manage_members')).toBe(false)
    expect(roleHasPermission(10, perms, 'manage_settings')).toBe(false)
  })

  it('grants all permissions if all are in the array', () => {
    const allPerms = [...ALL_PERMISSION_CODES]
    for (const perm of ALL_PERMISSION_CODES) {
      expect(roleHasPermission(10, allPerms, perm)).toBe(true)
    }
  })
})

// ─── Edge cases ─────────────────────────────────────────────

describe('roleHasPermission — edge cases', () => {
  it('position 49 does NOT get officer catch-all', () => {
    expect(roleHasPermission(49, [], 'manage_loot')).toBe(false)
    expect(roleHasPermission(49, [], 'manage_settings')).toBe(false)
  })

  it('position 49 with explicit permission still works', () => {
    expect(roleHasPermission(49, ['manage_loot'], 'manage_loot')).toBe(true)
    expect(roleHasPermission(49, ['manage_loot'], 'manage_settings')).toBe(false)
  })

  it('negative position with permissions still works', () => {
    expect(roleHasPermission(-1, ['manage_loot'], 'manage_loot')).toBe(true)
    expect(roleHasPermission(-1, [], 'manage_loot')).toBe(false)
  })

  it('handles empty string in permissions array', () => {
    expect(roleHasPermission(10, [''], 'manage_loot')).toBe(false)
  })

  it('handles unknown permission code in array', () => {
    expect(roleHasPermission(10, ['nonexistent_perm'], 'manage_loot')).toBe(false)
  })

  it('handles duplicate permissions in array', () => {
    expect(roleHasPermission(10, ['manage_loot', 'manage_loot'], 'manage_loot')).toBe(true)
  })
})

// ─── Backward compatibility contract ────────────────────────

describe('backward compatibility', () => {
  it('existing officer check (position >= 50) still grants full access', () => {
    // This is the CRITICAL contract — existing officers must not lose any access
    const officerPositions = [50, 51, 75, 99, 100, 150]
    for (const pos of officerPositions) {
      for (const perm of ALL_PERMISSION_CODES) {
        expect(roleHasPermission(pos, [], perm)).toBe(true)
      }
    }
  })

  it('existing member check (position < 50) still denies by default', () => {
    // Members without explicit permissions must not gain any access
    const memberPositions = [0, 1, 10, 25, 49]
    for (const pos of memberPositions) {
      for (const perm of ALL_PERMISSION_CODES) {
        expect(roleHasPermission(pos, [], perm)).toBe(false)
      }
    }
  })

  it('the ONLY way a non-officer gets access is via explicit permissions array', () => {
    // Verify there's no backdoor — position alone below 50 never grants access
    for (let pos = -10; pos < 50; pos += 5) {
      for (const perm of ALL_PERMISSION_CODES) {
        expect(roleHasPermission(pos, [], perm)).toBe(false)
      }
    }
  })
})
