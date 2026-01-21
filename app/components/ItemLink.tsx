/**
 * ItemLink Component
 *
 * Renders an item name as a Wowhead tooltip link with automatic coloring and icons
 * The Wowhead power.js script automatically detects these links and:
 * - Colors them based on item quality (epic = purple, rare = blue, etc.)
 * - Adds item icons before the name
 * - Shows tooltips on hover
 *
 * Note: Parent components should call $WowheadPower.refreshLinks() after items load
 */

interface ItemLinkProps {
  name: string
  wowheadId: number
  className?: string
  clickable?: boolean
  showIcon?: boolean
}

export default function ItemLink({ name, wowheadId, className = '', clickable = true, showIcon = false }: ItemLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!clickable) {
      e.preventDefault()
    }
  }

  // Detect expansion based on item ID ranges
  // Classic: 1-23000
  // TBC: 23000-35000
  // WotLK: 35000-51000
  const isTBC = wowheadId >= 23000 && wowheadId < 35000
  const isWotLK = wowheadId >= 35000 && wowheadId < 51000

  const domain = isTBC ? 'tbc' : isWotLK ? 'wrath' : 'classic'

  return (
    <a
      href={clickable ? `https://www.wowhead.com/${domain}/item=${wowheadId}` : '#'}
      target={clickable ? "_blank" : undefined}
      rel={clickable ? "noopener noreferrer" : undefined}
      className={`${className} inline-flex items-center gap-1`}
      style={{
        color: '#a335ee'
      }}
      data-wowhead={`item=${wowheadId}&domain=${domain}`}
      onClick={handleClick}
    >
      {name}
    </a>
  )
}
