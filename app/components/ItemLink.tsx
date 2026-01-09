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
}

export default function ItemLink({ name, wowheadId, className = '', clickable = true }: ItemLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!clickable) {
      e.preventDefault()
    }
  }

  return (
    <a
      href={clickable ? `https://www.wowhead.com/classic/item=${wowheadId}` : '#'}
      target={clickable ? "_blank" : undefined}
      rel={clickable ? "noopener noreferrer" : undefined}
      className={className}
      data-wowhead={`item=${wowheadId}&domain=classic`}
      onClick={handleClick}
    >
      {name}
    </a>
  )
}
