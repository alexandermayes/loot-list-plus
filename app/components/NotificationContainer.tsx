'use client'

import { useNotification, NotificationType } from '@/app/contexts/NotificationContext'
import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle01Icon, Cancel01Icon, AlertCircleIcon, InformationCircleIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

/**
 * Toast notification styles - matches inline alert styling
 */
const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-success/10 border-success/30 text-success'
    case 'error':
      return 'bg-destructive/10 border-destructive/30 text-destructive'
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
    case 'info':
      return 'bg-accent/10 border-accent/30 text-accent'
  }
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
    case 'error':
      return <HugeiconsIcon icon={Cancel01Icon} size={20} />
    case 'warning':
      return <HugeiconsIcon icon={AlertCircleIcon} size={20} />
    case 'info':
      return <HugeiconsIcon icon={InformationCircleIcon} size={20} />
  }
}

export default function NotificationContainer() {
  const { notifications, dismissNotification } = useNotification()
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([])

  useEffect(() => {
    // Animate in new notifications
    notifications.forEach(notification => {
      if (!visibleNotifications.includes(notification.id)) {
        setTimeout(() => {
          setVisibleNotifications(prev => [...prev, notification.id])
        }, 10)
      }
    })

    // Remove from visible list when dismissed
    const currentIds = notifications.map(n => n.id)
    setVisibleNotifications(prev => prev.filter(id => currentIds.includes(id)))
  }, [notifications])

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 pointer-events-none w-full max-w-2xl px-4">
      {notifications.map((notification) => {
        const isVisible = visibleNotifications.includes(notification.id)
        return (
          <div
            key={notification.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md bg-background/80
              ${getNotificationStyles(notification.type)}
              transition-all duration-300 ease-out
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
            `}
          >
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 text-sm font-medium">
              {notification.message}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 w-6 h-6 min-h-0 hover:opacity-70"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        )
      })}
    </div>
  )
}
