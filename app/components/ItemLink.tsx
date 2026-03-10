/**
 * ItemLink Component
 *
 * Renders an item name as a Wowhead tooltip link with:
 * - Lazy-loaded icons (190KB icon map loaded on demand)
 * - Epic purple coloring
 * - Tooltips on hover via Wowhead power.js
 * - Correct wowhead domain based on active expansion
 */

import { memo, useContext, useState, useEffect } from 'react'
import { GuildDataContext } from '@/app/contexts/GuildContext'

// Lazy-load the 190KB item-icons module. Cache the getter once loaded.
let _getItemIconUrl: ((id: number, size: 'small' | 'medium' | 'large') => string | null) | null = null
let _loadPromise: Promise<void> | null = null

function ensureItemIconsLoaded(): Promise<void> {
  if (_getItemIconUrl) return Promise.resolve()
  if (!_loadPromise) {
    _loadPromise = import('@/data/item-icons').then(mod => {
      _getItemIconUrl = mod.getItemIconUrl
    })
  }
  return _loadPromise
}

/** Synchronous icon lookup - returns null if module not yet loaded */
function getIconUrl(wowheadId: number, size: 'small' | 'medium' | 'large' = 'small'): string | null {
  return _getItemIconUrl ? _getItemIconUrl(wowheadId, size) : null
}

/** Map expansion display names to wowhead URL/tooltip domains */
const EXPANSION_TO_WOWHEAD_DOMAIN: Record<string, string> = {
  'Classic': 'classic',
  'Classic WoW': 'classic',
  'The Burning Crusade': 'tbc',
  'Wrath of the Lich King': 'wotlk',
  'Cataclysm': 'cata',
  'Mists of Pandaria': 'mop-classic',
  'Warlords of Draenor': 'wow',
  'Legion': 'wow',
  'Battle for Azeroth': 'wow',
  'Shadowlands': 'wow',
  'Dragonflight': 'wow',
  'The War Within': 'wow',
}

export function getWowheadDomain(expansionName: string | undefined | null): string | null {
  if (!expansionName) return null
  return EXPANSION_TO_WOWHEAD_DOMAIN[expansionName] ?? null
}

interface ItemLinkProps {
  name: string
  wowheadId: number
  className?: string
  clickable?: boolean
  showIcon?: boolean
  /** Override wowhead domain (e.g. 'tbc', 'wotlk'). Auto-detected from guild context if omitted. */
  domain?: string
}

const ItemLink = memo(function ItemLink({ name, wowheadId, className = '', clickable = true, showIcon = true, domain: domainProp }: ItemLinkProps) {
  // Read expansion from guild context (safe - returns undefined outside provider)
  const guildData = useContext(GuildDataContext)
  const expansionDomain = domainProp ?? getWowheadDomain(guildData?.currentExpansion?.expansion_name)

  // Fallback: guess from item ID ranges if no context available
  const domain = expansionDomain ?? (
    wowheadId >= 35000 && wowheadId < 51000 ? 'wotlk' :
    wowheadId >= 22000 && wowheadId < 35000 ? 'tbc' :
    'classic'
  )

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!clickable) {
      e.preventDefault()
    }
  }

  // Try synchronous lookup first (fast path when module already loaded)
  const [iconUrl, setIconUrl] = useState<string | null>(() =>
    showIcon ? getIconUrl(wowheadId, 'small') : null
  )

  // If icons aren't loaded yet, trigger async load
  useEffect(() => {
    if (!showIcon) return
    if (_getItemIconUrl) {
      // Module loaded, update if needed
      const url = _getItemIconUrl(wowheadId, 'small')
      setIconUrl(url)
      return
    }
    // Module not loaded yet - trigger lazy load
    ensureItemIconsLoaded().then(() => {
      setIconUrl(getIconUrl(wowheadId, 'small'))
    })
  }, [wowheadId, showIcon])

  return (
    <a
      href={clickable ? `https://www.wowhead.com/${domain}/item=${wowheadId}` : '#'}
      target={clickable ? "_blank" : undefined}
      rel={clickable ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center gap-1 min-w-0 ${className}`}
      style={{
        color: '#a335ee'
      }}
      data-wowhead={`item=${wowheadId}&domain=${domain}`}
      onClick={handleClick}
    >
      {showIcon && (
        iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            width={18}
            height={18}
            className="inline-block rounded-sm flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
            loading="eager"
          />
        ) : (
          <span className="inline-block w-[18px] h-[18px] rounded-sm flex-shrink-0 bg-muted" />
        )
      )}
      <span className="truncate">{name}</span>
    </a>
  )
})

export default ItemLink
