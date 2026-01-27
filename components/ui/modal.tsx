"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

/**
 * Modal Component - LootList+ Design System
 *
 * A consistent modal/dialog system with backdrop, container, header, body, and footer.
 *
 * Sizes:
 * - sm: max-w-md (confirmations, simple forms)
 * - default: max-w-lg (standard forms)
 * - lg: max-w-2xl (complex forms, lists)
 * - xl: max-w-3xl (large content)
 * - full: max-w-4xl (very large content)
 */

// Modal Backdrop
const ModalBackdrop = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, onClick, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4",
      className
    )}
    onClick={(e) => {
      if (e.target === e.currentTarget && onClose) {
        onClose()
      }
      onClick?.(e)
    }}
    {...props}
  />
))
ModalBackdrop.displayName = "ModalBackdrop"

// Modal Container variants
const modalContainerVariants = cva(
  "bg-background-subtle border border-border-strong rounded-xl w-full overflow-hidden flex flex-col",
  {
    variants: {
      size: {
        sm: "max-w-md",
        default: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-3xl",
        full: "max-w-4xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface ModalContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalContainerVariants> {
  maxHeight?: string
}

const ModalContainer = React.forwardRef<HTMLDivElement, ModalContainerProps>(
  ({ className, size, maxHeight = "85vh", onClick, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(modalContainerVariants({ size }), className)}
      style={{ maxHeight }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      {...props}
    />
  )
)
ModalContainer.displayName = "ModalContainer"

// Modal Header
interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  showCloseButton?: boolean
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, onClose, showCloseButton = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "p-6 border-b border-border-strong bg-background-elevated flex items-start justify-between gap-4 flex-shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={24} />
        </button>
      )}
    </div>
  )
)
ModalHeader.displayName = "ModalHeader"

// Modal Title
const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-[20px] font-semibold text-foreground", className)}
    {...props}
  />
))
ModalTitle.displayName = "ModalTitle"

// Modal Description
const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[13px] text-muted-foreground mt-1", className)}
    {...props}
  />
))
ModalDescription.displayName = "ModalDescription"

// Modal Body
const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 flex-1 overflow-y-auto", className)}
    {...props}
  />
))
ModalBody.displayName = "ModalBody"

// Modal Footer
const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-6 border-t border-border-strong bg-background-elevated flex items-center justify-end gap-3 flex-shrink-0",
      className
    )}
    {...props}
  />
))
ModalFooter.displayName = "ModalFooter"

// Compound Modal Component
interface ModalProps extends VariantProps<typeof modalContainerVariants> {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  maxHeight?: string
  zIndex?: number
}

const Modal = ({
  open,
  onClose,
  children,
  size,
  className,
  maxHeight,
  zIndex = 50,
}: ModalProps) => {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <ModalBackdrop onClose={onClose} style={{ zIndex }}>
      <ModalContainer size={size} className={className} maxHeight={maxHeight}>
        {children}
      </ModalContainer>
    </ModalBackdrop>
  )
}

export {
  Modal,
  ModalBackdrop,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  modalContainerVariants,
}
