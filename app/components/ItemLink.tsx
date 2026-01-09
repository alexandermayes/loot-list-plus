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
}

export default function ItemLink({ name, wowheadId, className = '' }: ItemLinkProps) {
  return (
    <a
      href={`https://www.wowhead.com/classic/item=${wowheadId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-wowhead={`item=${wowheadId}&domain=classic`}
    >
      {name}
    </a>
  )
}
