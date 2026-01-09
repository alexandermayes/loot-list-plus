import { ArrowLeft } from 'lucide-react'
import { Button } from './button'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  description?: string
  showBack?: boolean
  backUrl?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }
}

export function PageHeader({
  title,
  description,
  showBack = false,
  backUrl = '/dashboard',
  action
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(backUrl)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
          >
            {action.label}
          </Button>
        )}
      </div>
    </header>
  )
}
