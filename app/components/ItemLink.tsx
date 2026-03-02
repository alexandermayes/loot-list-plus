/**
 * ItemLink Component
 *
 * Renders an item name as a Wowhead tooltip link with:
 * - Pre-loaded icons (no layout shift)
 * - Epic purple coloring
 * - Tooltips on hover via Wowhead power.js
 * - Correct wowhead domain based on active expansion
 */

import { memo, useContext } from 'react'
import { getItemIconUrl } from '@/data/item-icons'
import { GuildDataContext } from '@/app/contexts/GuildContext'

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

  const iconUrl = showIcon ? getItemIconUrl(wowheadId, 'small') : null

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
      {iconUrl && (
        <img
          src={iconUrl}
          alt=""
          width={18}
          height={18}
          className="inline-block rounded-sm flex-shrink-0"
          style={{ imageRendering: 'pixelated' }}
          loading="eager"
        />
      )}
      <span className="truncate">{name}</span>
    </a>
  )
})

export default ItemLink
