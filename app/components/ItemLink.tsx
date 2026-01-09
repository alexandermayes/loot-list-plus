/**
 * ItemLink Component
 *
 * Renders an item name as a Wowhead tooltip link
 * The Wowhead power.js script automatically detects these links and adds tooltips
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
      className={`hover:underline ${className}`}
      data-wowhead={`item=${wowheadId}`}
    >
      {name}
    </a>
  )
}
