import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Typography Components - LootList+ Design System
 *
 * Font Size Scale (from Tailwind config):
 * - xs: 10px - Tiny labels, badges
 * - sm: 12px - Labels, captions, helper text
 * - base: 13px - Default body text
 * - md: 14px - Larger body text
 * - lg: 16px - Emphasized text, large body
 * - xl: 18px - Small headings (h4)
 * - 2xl: 20px - Medium headings (h3)
 * - 3xl: 24px - Section headings (h2)
 * - 4xl: 32px - Large headings
 * - 5xl: 42px - Page titles (h1)
 */

// =============================================================================
// HEADING COMPONENT
// =============================================================================

const headingVariants = cva('text-foreground text-balance', {
  variants: {
    level: {
      1: 'text-5xl font-bold leading-tight',      // 42px - Page titles
      2: 'text-3xl font-bold',                     // 24px - Section headers
      3: 'text-2xl font-semibold',                 // 20px - Subsections
      4: 'text-xl font-semibold',                  // 18px - Small sections
      5: 'text-lg font-medium',                    // 16px - Card titles
      6: 'text-base font-medium',                  // 13px - Mini headers
    },
  },
  defaultVariants: {
    level: 1,
  },
})

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /** Heading level (1-6), determines both element and styling */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  /** Override the rendered element (useful for SEO when visual style differs from semantic level) */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, as, children, ...props }, ref) => {
    const Tag = as || (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6')

    return (
      <Tag
        ref={ref}
        className={cn(headingVariants({ level }), className)}
        {...props}
      >
        {children}
      </Tag>
    )
  }
)
Heading.displayName = 'Heading'

// =============================================================================
// TEXT COMPONENT
// =============================================================================

const textVariants = cva('text-pretty', {
  variants: {
    size: {
      xs: 'text-xs',       // 10px
      sm: 'text-sm',       // 12px
      base: 'text-base',   // 13px
      md: 'text-md',       // 14px
      lg: 'text-lg',       // 16px
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    textColor: {
      default: 'text-foreground',
      secondary: 'text-foreground-secondary',
      muted: 'text-muted-foreground',
      accent: 'text-accent',
      success: 'text-success',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    size: 'base',
    weight: 'normal',
    textColor: 'default',
  },
})

export interface TextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof textVariants> {
  /** Render as a different element */
  as?: 'p' | 'span' | 'div' | 'label'
  /** Text color variant (renamed to avoid conflict with HTML color attribute) */
  color?: 'default' | 'secondary' | 'muted' | 'accent' | 'success' | 'destructive'
}

function Text({
  className,
  size,
  weight,
  color,
  as: Tag = 'p',
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(textVariants({ size, weight, textColor: color }), className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
Text.displayName = 'Text'

// =============================================================================
// LABEL TEXT (for form labels and section headers)
// =============================================================================

const labelTextVariants = cva(
  'font-medium uppercase tracking-wider text-foreground-secondary',
  {
    variants: {
      size: {
        xs: 'text-xs',   // 10px
        sm: 'text-sm',   // 12px
      },
    },
    defaultVariants: {
      size: 'xs',
    },
  }
)

export interface LabelTextProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof labelTextVariants> {}

const LabelText = React.forwardRef<HTMLSpanElement, LabelTextProps>(
  ({ className, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(labelTextVariants({ size }), className)}
      {...props}
    />
  )
)
LabelText.displayName = 'LabelText'

export { Heading, headingVariants, Text, textVariants, LabelText, labelTextVariants }
