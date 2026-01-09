import { LucideIcon } from 'lucide-react'
import { Card } from './card'
import { cn } from '@/lib/utils'

interface ActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  iconColor?: string
  onClick: () => void
  className?: string
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor = 'bg-primary',
  onClick,
  className
}: ActionCardProps) {
  return (
    <Card
      className={cn(
        "p-6 cursor-pointer hover:bg-accent transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
        iconColor
      )}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-foreground font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </Card>
  )
}
