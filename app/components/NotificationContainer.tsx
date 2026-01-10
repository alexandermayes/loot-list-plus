'use client'

import { useNotification, NotificationType } from '@/app/contexts/NotificationContext'
import { useEffect, useState } from 'react'

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-green-900/95 border-green-500 text-green-100'
    case 'error':
      return 'bg-red-900/95 border-red-500 text-red-100'
    case 'warning':
      return 'bg-yellow-900/95 border-yellow-500 text-yellow-100'
    case 'info':
      return 'bg-blue-900/95 border-blue-500 text-blue-100'
  }
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'error':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    case 'warning':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    case 'info':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
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
              flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-lg
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
            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 hover:opacity-70 transition"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
