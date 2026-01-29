"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Delete02Icon, HelpCircleIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "./modal"

type ConfirmVariant = "danger" | "warning" | "default"

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
}

const variantConfig: Record<ConfirmVariant, {
  icon: typeof Alert02Icon
  iconColor: string
  iconBg: string
  buttonVariant: "destructive" | "primary" | "secondary"
}> = {
  danger: {
    icon: Delete02Icon,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
    buttonVariant: "destructive",
  },
  warning: {
    icon: Alert02Icon,
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
    buttonVariant: "primary",
  },
  default: {
    icon: HelpCircleIcon,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
    buttonVariant: "primary",
  },
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const config = variantConfig[variant]

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Let the caller handle errors
      console.error("Confirm action failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const actualLoading = loading || isLoading

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader showCloseButton={false}>
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-xl", config.iconBg)}>
            <HugeiconsIcon icon={config.icon} size={24} className={config.iconColor} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <ModalTitle>{title}</ModalTitle>
            <ModalDescription className="mt-2">{description}</ModalDescription>
          </div>
        </div>
      </ModalHeader>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={actualLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={handleConfirm}
          loading={actualLoading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// Hook for easy usage with state management
interface UseConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void | Promise<void>
}

export function useConfirm() {
  const [state, setState] = React.useState<UseConfirmOptions | null>(null)
  const [loading, setLoading] = React.useState(false)

  const confirm = React.useCallback((options: UseConfirmOptions) => {
    setState(options)
  }, [])

  const handleClose = React.useCallback(() => {
    setState(null)
    setLoading(false)
  }, [])

  const handleConfirm = React.useCallback(async () => {
    if (!state) return
    setLoading(true)
    try {
      await state.onConfirm()
      handleClose()
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [state, handleClose])

  const ConfirmDialog = React.useMemo(() => {
    if (!state) return null
    return (
      <ConfirmModal
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        loading={loading}
      />
    )
  }, [state, handleClose, handleConfirm, loading])

  return { confirm, ConfirmDialog }
}
