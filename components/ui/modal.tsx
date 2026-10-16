"use client"

import * as React from "react"
import { createPortal } from "react-dom"
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

const TRANSITION_MS = 150

// Context carrying the current Modal's generated titleId down to a
// descendant ModalTitle, so ModalTitle can self-assign an `id` that the
// Modal's own `aria-labelledby` points to — mirrors card.tsx's CardContext
// (createContext + Provider-wraps-children + useContext-in-subcomponent).
const ModalTitleContext = React.createContext<string | undefined>(undefined)

// Module-scope "modal stack" registry. Tracks every currently-open Modal
// instance by id + zIndex so exactly the topmost one can install the focus
// trap and respond to Escape (D-04) even when multiple Modals are open at
// once. This is genuinely new logic with no in-repo analog — the WAI-ARIA
// APG dialog pattern is the behavioral spec being satisfied here, not a
// code source to copy.
type ModalStackEntry = { id: string; zIndex: number }
let modalStack: ModalStackEntry[] = []
const modalStackListeners = new Set<() => void>()

function registerOpenModal(id: string, zIndex: number) {
  modalStack = [...modalStack.filter((entry) => entry.id !== id), { id, zIndex }]
  modalStackListeners.forEach((listener) => listener())
}

function unregisterOpenModal(id: string) {
  modalStack = modalStack.filter((entry) => entry.id !== id)
  modalStackListeners.forEach((listener) => listener())
}

function getTopmostModalId(): string | undefined {
  if (modalStack.length === 0) return undefined
  // `modalStack` is in insertion/registration order (oldest first — see
  // `registerOpenModal`'s `[...filtered, newEntry]`). Use `>=` (not `>`) so
  // that when two entries share the same zIndex, the later-registered one
  // wins the tie — satisfying D-04's "topmost/last-mounted" requirement for
  // the common default-zIndex case, not just the distinct-zIndex case.
  return modalStack.reduce((top, entry) => (entry.zIndex >= top.zIndex ? entry : top)).id
}

function subscribeToModalStack(listener: () => void) {
  modalStackListeners.add(listener)
  return () => modalStackListeners.delete(listener)
}

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
  "bg-background-subtle border border-border-strong rounded-xl w-full overflow-clip flex flex-col",
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
>(({ className, id, ...props }, ref) => {
  const contextId = React.useContext(ModalTitleContext)
  return (
    <h2
      ref={ref}
      id={id ?? contextId}
      className={cn("text-20 font-semibold text-foreground text-balance", className)}
      {...props}
    />
  )
})
ModalTitle.displayName = "ModalTitle"

// Modal Description
const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-13 text-muted-foreground mt-1", className)}
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
  /** Id of the element that describes the dialog, forwarded to the dialog container so consumers do not need to nest their own dialog (GH #304). */
  "aria-describedby"?: string
}

const Modal = ({
  open,
  onClose,
  children,
  size,
  className,
  maxHeight,
  zIndex = 50,
  "aria-describedby": ariaDescribedBy,
}: ModalProps) => {
  // Two-phase state: `mounted` controls whether the DOM exists, `visible`
  // controls the CSS transition. When closing, we drop `visible` first,
  // wait for the transition to play, then unmount.
  const [mounted, setMounted] = React.useState(open)
  const [visible, setVisible] = React.useState(false)
  const mouseDownOnBackdrop = React.useRef(false)

  // titleId doubles as this Modal instance's modal-stack registry key.
  // These are separate namespaces (DOM id/aria-labelledby attribute space
  // vs. an internal string key), so reusing one generated string for both
  // is safe and avoids a second useId() call.
  const titleId = React.useId()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const backdropRef = React.useRef<HTMLDivElement>(null)

  const topmostId = React.useSyncExternalStore(
    subscribeToModalStack,
    getTopmostModalId,
    () => undefined
  )
  const isTopmost = mounted && topmostId === titleId

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      // Mount first, then flip to visible on the next frame so the browser
      // sees the transition from the initial closed state.
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const id = setTimeout(() => setMounted(false), TRANSITION_MS)
    return () => clearTimeout(id)
  }, [open])

  // Handle escape key — only the topmost simultaneously-open Modal responds
  // (D-04). Without the isTopmost guard, every open Modal would independently
  // call its own onClose on a single Escape press.
  React.useEffect(() => {
    if (!open || !isTopmost) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, isTopmost, onClose])

  // Register/unregister this Modal instance in the module-scope modal stack
  // while mounted, so getTopmostModalId() can determine which Modal is
  // topmost across every simultaneously-open instance.
  React.useEffect(() => {
    if (!mounted) return
    registerOpenModal(titleId, zIndex)
    return () => unregisterOpenModal(titleId)
  }, [mounted, titleId, zIndex])

  // regression for #304: aria-modal alone does not keep every screen reader
  // out of the page behind the dialog, so the topmost Modal marks its body
  // siblings inert. inert (not aria-hidden) also drops them from the tab
  // order, which closes the Shift+Tab leak when the container itself holds
  // focus. Tied to isTopmost so a lower Modal never inerts the one stacked on
  // it. One-shot on purpose: portals that open from inside the dialog (Radix
  // dropdown-menu, SearchableItemSelect, MultiSelectDropdown) mount into body
  // later and must stay usable. setAttribute rather than the .inert property
  // so jsdom and every inert-capable browser behave the same; where inert is
  // unsupported the attribute is ignored and nothing else changes. Declared
  // before the focus-restore effect because React runs cleanups in
  // declaration order and a browser refuses to focus an element inside an
  // inert subtree.
  React.useEffect(() => {
    if (!mounted || !isTopmost) return
    const root = backdropRef.current
    if (!root || typeof document === "undefined" || !document.body) return
    const inerted = Array.from(document.body.children).filter(
      (child): child is Element =>
        child !== root && !child.contains(root) && !child.hasAttribute("inert")
    )
    inerted.forEach((el) => el.setAttribute("inert", ""))
    return () => {
      inerted.forEach((el) => el.removeAttribute("inert"))
    }
  }, [mounted, isTopmost])

  // Capture whatever had focus right before *this* Modal opened, and
  // restore it on close — independent of isTopmost, so this Modal restores
  // focus to its own trigger regardless of any other Modal that stacked on
  // top in the meantime.
  React.useEffect(() => {
    if (!mounted) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [mounted])

  // Install the focus trap only while this Modal is the topmost open one.
  React.useEffect(() => {
    if (!mounted || !isTopmost) return
    const container = containerRef.current
    if (!container) return

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))

    const focusables = getFocusable()
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      container.focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const currentFocusable = getFocusable()
      if (currentFocusable.length === 0) return
      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleTab)
    return () => document.removeEventListener("keydown", handleTab)
  }, [mounted, isTopmost])

  // Prevent body scroll when open (including iOS Safari)
  React.useEffect(() => {
    if (!mounted) return
    const scrollY = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.left = ""
      document.body.style.right = ""
      document.body.style.overflow = ""
      window.scrollTo(0, scrollY)
    }
  }, [mounted])

  // Reset mousedown tracking when modal closes
  React.useEffect(() => {
    if (!open) {
      mouseDownOnBackdrop.current = false
    }
  }, [open])

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
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

  if (typeof document === "undefined") return null
  if (!mounted) return null

  return createPortal(
    <ModalTitleContext.Provider value={titleId}>
      {/* regression for #304: the 150ms fade and scale are decorative; under
          prefers-reduced-motion both are removed with Tailwind's motion-reduce
          variant. TRANSITION_MS still delays unmount so focus restore timing
          is unchanged for every consumer. */}
      <div
        ref={backdropRef}
        className={cn(
          "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-opacity duration-150 motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ zIndex }}
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            "w-full flex items-center justify-center transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:scale-100",
            visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}
        >
          <ModalContainer
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            size={size}
            className={className}
            maxHeight={maxHeight}
          >
            {children}
          </ModalContainer>
        </div>
      </div>
    </ModalTitleContext.Provider>,
    document.body
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
