import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  WOW_FOREVER_ANNOUNCEMENT,
  announcementEventProps,
  FOREVER_CREATE_PATH,
  FOREVER_CREATE_URL,
  FOREVER_BAR_DISMISSED_KEY,
  FOREVER_BAR_HTML_ATTR,
  FOREVER_BAR_PREPAINT_SCRIPT,
  ONBOARDING_SEEN_KEY,
  foreverModalSeenKey,
  getBrowserStorage,
  safeSetItem,
  shouldShowForeverModal,
} from '../announcements'

describe('constants', () => {
  it('exposes the announcement id and paths', () => {
    expect(WOW_FOREVER_ANNOUNCEMENT).toBe('wow-forever')
    expect(FOREVER_CREATE_PATH).toBe('/guild-select/create?game=forever')
    expect(FOREVER_CREATE_URL).toBe('https://www.lootlistplus.com/guild-select/create?game=forever')
  })
})

describe('announcementEventProps', () => {
  it('returns exactly announcement and surface, nothing else', () => {
    expect(announcementEventProps('app_modal')).toEqual({
      announcement: 'wow-forever',
      surface: 'app_modal',
    })
    expect(announcementEventProps('public_bar')).toEqual({
      announcement: 'wow-forever',
      surface: 'public_bar',
    })
  })
})

describe('foreverModalSeenKey', () => {
  it('namespaces the key per user', () => {
    expect(foreverModalSeenKey('user-1')).toBe('llp_announcement_wow-forever_modal_seen_user-1')
  })
})

describe('getBrowserStorage', () => {
  it('returns window.localStorage', () => {
    expect(getBrowserStorage()).toBe(window.localStorage)
  })

  it('returns null when localStorage access throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(getBrowserStorage()).toBeNull()
    if (original) Object.defineProperty(window, 'localStorage', original)
  })
})

describe('safeSetItem', () => {
  beforeEach(() => localStorage.clear())

  it('writes the key and returns true', () => {
    expect(safeSetItem(localStorage, 'k', 'v')).toBe(true)
    expect(localStorage.getItem('k')).toBe('v')
  })

  it('returns false for a null storage', () => {
    expect(safeSetItem(null, 'k', 'v')).toBe(false)
  })

  it('returns false when setItem throws', () => {
    const throwingStorage = {
      setItem: () => {
        throw new Error('quota')
      },
    } as unknown as Storage
    expect(safeSetItem(throwingStorage, 'k', 'v')).toBe(false)
  })
})

describe('shouldShowForeverModal', () => {
  const okStorage = () => {
    const store = new Map<string, string>()
    store.set(ONBOARDING_SEEN_KEY, '1')
    return {
      getItem: (key: string) => store.get(key) ?? null,
    } as Pick<Storage, 'getItem'>
  }

  it('is false while loading', () => {
    expect(
      shouldShowForeverModal(
        { loading: true, userId: 'u1', guild: { game: 'classic' } },
        okStorage()
      )
    ).toBe(false)
  })

  it('is false with no userId', () => {
    expect(
      shouldShowForeverModal(
        { loading: false, userId: null, guild: { game: 'classic' } },
        okStorage()
      )
    ).toBe(false)
  })

  it('is false with no guild', () => {
    expect(
      shouldShowForeverModal({ loading: false, userId: 'u1', guild: null }, okStorage())
    ).toBe(false)
  })

  it('is false for a Forever guild', () => {
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'forever' } },
        okStorage()
      )
    ).toBe(false)
  })

  it('is false when onboarding has not been seen', () => {
    const storage = { getItem: () => null } as Pick<Storage, 'getItem'>
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'classic' } },
        storage
      )
    ).toBe(false)
  })

  it('is false when the per-user seen key is already set', () => {
    const store = new Map<string, string>()
    store.set(ONBOARDING_SEEN_KEY, '1')
    store.set(foreverModalSeenKey('u1'), '1')
    const storage = { getItem: (key: string) => store.get(key) ?? null } as Pick<Storage, 'getItem'>
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'classic' } },
        storage
      )
    ).toBe(false)
  })

  it('is false when storage is null', () => {
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'classic' } },
        null
      )
    ).toBe(false)
  })

  it('is false when getItem throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
    } as Pick<Storage, 'getItem'>
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'classic' } },
        storage
      )
    ).toBe(false)
  })

  it('is true for a classic guild with onboarding seen and no seen key', () => {
    expect(
      shouldShowForeverModal(
        { loading: false, userId: 'u1', guild: { game: 'classic' } },
        okStorage()
      )
    ).toBe(true)
  })

  it('is true for a guild with a missing game (defaults to classic)', () => {
    expect(
      shouldShowForeverModal({ loading: false, userId: 'u1', guild: {} }, okStorage())
    ).toBe(true)
  })
})

describe('FOREVER_BAR_PREPAINT_SCRIPT', () => {
  afterEach(() => {
    document.documentElement.removeAttribute(FOREVER_BAR_HTML_ATTR)
    localStorage.clear()
  })

  it('sets the html attribute when the bar was dismissed', () => {
    localStorage.setItem(FOREVER_BAR_DISMISSED_KEY, '1')
    new Function(FOREVER_BAR_PREPAINT_SCRIPT)()
    expect(document.documentElement.getAttribute(FOREVER_BAR_HTML_ATTR)).toBe('dismissed')
  })

  it('leaves the attribute unset when the bar was never dismissed', () => {
    new Function(FOREVER_BAR_PREPAINT_SCRIPT)()
    expect(document.documentElement.getAttribute(FOREVER_BAR_HTML_ATTR)).toBeNull()
  })

  it('does not throw when localStorage.getItem throws', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    expect(() => {
      new Function(FOREVER_BAR_PREPAINT_SCRIPT)()
    }).not.toThrow()
    expect(document.documentElement.getAttribute(FOREVER_BAR_HTML_ATTR)).toBeNull()
    Storage.prototype.getItem = original
  })
})
