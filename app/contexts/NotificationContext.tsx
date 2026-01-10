'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (type: NotificationType, message: string, duration?: number) => void
  dismissNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: NotificationType, message: string, duration: number = 5000) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const notification: Notification = { id, type, message, duration }

    setNotifications(prev => [...prev, notification])

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id)
      }, duration)
    }
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
