/**
 * ItemLink Component
 *
 * Renders an item name as a Wowhead tooltip link with:
 * - Pre-loaded icons (no layout shift)
 * - Epic purple coloring
 * - Tooltips on hover via Wowhead power.js
 */

import { memo } from 'react'
import { getItemIconUrl } from '@/data/item-icons'

interface ItemLinkProps {
  name: string
  wowheadId: number
  className?: string
  clickable?: boolean
  showIcon?: boolean
}

const ItemLink = memo(function ItemLink({ name, wowheadId, className = '', clickable = true, showIcon = true }: ItemLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!clickable) {
      e.preventDefault()
    }
  }

  // Detect expansion based on item ID ranges
  // Classic: 1-22000 (roughly)
  // TBC: 22000-35000 (some TBC items like enchanting recipes start at 22xxx)
  // WotLK: 35000-51000
  const isTBC = wowheadId >= 22000 && wowheadId < 35000
  const isWotLK = wowheadId >= 35000 && wowheadId < 51000

  const domain = isTBC ? 'tbc' : isWotLK ? 'wrath' : 'classic'
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
