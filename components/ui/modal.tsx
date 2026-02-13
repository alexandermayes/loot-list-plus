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
      "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4",
      className
    )}
    onClick={(e) => {
      // Only close on direct clicks on the backdrop, not when mouse re-enters after leaving window
      // Check that the click is a genuine user interaction within bounds
      if (e.target === e.currentTarget && onClose && e.clientX > 0 && e.clientY > 0) {
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
  ({ className, size, maxHeight, onClick, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        modalContainerVariants({ size }),
        !maxHeight && "max-h-[95vh] sm:max-h-[85vh]",
        className
      )}
      style={maxHeight ? { maxHeight } : undefined}
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
        "p-4 sm:p-6 border-b border-border flex items-start justify-between gap-4 flex-shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          aria-label="Close"
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
    className={cn("p-4 sm:p-6 flex-1 overflow-y-auto", className)}
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
      "p-4 sm:p-6 border-t border-border flex items-center justify-end gap-3 flex-shrink-0",
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
  // Track if mousedown started on the backdrop (not inside the modal)
  // This prevents closing when user drags selection from inside modal to outside
  const mouseDownOnBackdrop = React.useRef(false)

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

  // Reset mousedown tracking when modal closes
  React.useEffect(() => {
    if (!open) {
      mouseDownOnBackdrop.current = false
    }
  }, [open])

  if (!open) return null

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    // Only track mousedown if it's directly on the backdrop
    mouseDownOnBackdrop.current = e.target === e.currentTarget
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if:
    // 1. Click is directly on backdrop (not bubbled from children)
    // 2. mousedown also started on the backdrop (prevents drag-selection closing)
    // 3. Click is within valid bounds (not from mouse leaving/entering window)
    if (
      e.target === e.currentTarget &&
      mouseDownOnBackdrop.current &&
      e.clientX > 0 &&
      e.clientY > 0
    ) {
      onClose()
    }
    mouseDownOnBackdrop.current = false
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex }}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <ModalContainer size={size} className={className} maxHeight={maxHeight}>
        {children}
      </ModalContainer>
    </div>
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
