/**
 * LootList+ Design System Tokens
 *
 * This file contains all design tokens extracted from Figma designs.
 * These tokens should be the single source of truth for the design system.
 *
 * Usage:
 * - Import tokens directly for JS/TS usage
 * - CSS variables are generated in globals.css from these values
 * - Tailwind config references these through CSS variables
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

/**
 * Primitive Colors
 * Raw color values - do not use directly in components
 */
export const primitiveColors = {
  // Neutrals (Dark Mode Scale)
  neutral: {
    0: '#000000',
    50: '#09090c',    // Deepest background
    100: '#0d0e11',   // Sidebar background
    150: '#141519',   // Elevated surfaces (cards, inputs)
    200: '#1a1a1a',   // Borders, subtle backgrounds
    250: '#222224',   // Dividers
    300: '#383838',   // Strong borders
    400: '#666666',   // Disabled text
    500: '#a1a1a1',   // Secondary text
    600: '#cccccc',   // Tertiary text
    900: '#f5f5f5',   // Primary text (light mode)
    950: '#fafafa',   // Background (light mode)
    1000: '#ffffff',  // Pure white
  },

  // Brand Orange (Accent)
  orange: {
    50: 'rgba(255, 128, 0, 0.1)',
    100: 'rgba(255, 128, 0, 0.2)',
    200: 'rgba(255, 128, 0, 0.3)',
    500: '#ff8000',   // Primary accent
    600: '#e67300',   // Hover state
    700: '#cc6600',   // Active state
  },

  // Status Colors
  green: {
    50: 'rgba(34, 197, 94, 0.1)',
    100: 'rgba(34, 197, 94, 0.2)',
    500: '#22c55e',   // Success
    600: '#16a34a',   // Success hover
  },

  yellow: {
    50: 'rgba(234, 179, 8, 0.1)',
    100: 'rgba(234, 179, 8, 0.2)',
    500: '#eab308',   // Warning
    600: '#ca8a04',   // Warning hover
  },

  red: {
    50: 'rgba(239, 68, 68, 0.1)',
    100: 'rgba(239, 68, 68, 0.2)',
    500: '#ef4444',   // Error/Destructive
    600: '#dc2626',   // Error hover
    700: '#b91c1c',   // Error active
  },

  blue: {
    50: 'rgba(59, 130, 246, 0.1)',
    100: 'rgba(59, 130, 246, 0.2)',
    500: '#3b82f6',   // Info
    600: '#2563eb',   // Info hover
  },

  // Discord
  discord: {
    500: '#5865F2',
  },

  // WoW Class Colors
  wowClass: {
    warrior: '#C79C6E',
    paladin: '#F58CBA',
    hunter: '#ABD473',
    rogue: '#FFF569',
    priest: '#FFFFFF',
    deathKnight: '#C41E3A',
    shaman: '#0070DE',
    mage: '#69CCF0',
    warlock: '#9482C9',
    monk: '#00FF96',
    druid: '#FF7D0A',
    demonHunter: '#A330C9',
    evoker: '#33937F',
  },
} as const;

/**
 * Semantic Colors
 * Purpose-based colors - use these in components
 */
export const semanticColors = {
  dark: {
    // Backgrounds (layered from deep to elevated)
    background: {
      base: primitiveColors.neutral[50],        // #09090c - Main content area
      subtle: primitiveColors.neutral[100],     // #0d0e11 - Sidebar, secondary areas
      elevated: primitiveColors.neutral[150],   // #141519 - Cards, inputs, modals
      hover: primitiveColors.neutral[200],      // #1a1a1a - Hover states
    },

    // Borders
    border: {
      subtle: primitiveColors.neutral[200],     // #1a1a1a - Default borders
      default: primitiveColors.neutral[250],    // #222224 - Dividers
      strong: primitiveColors.neutral[300],     // #383838 - Emphasized borders
      interactive: 'rgba(255, 255, 255, 0.1)',  // Subtle interactive borders
    },

    // Text
    text: {
      primary: primitiveColors.neutral[1000],   // #ffffff
      secondary: primitiveColors.neutral[500],  // #a1a1a1
      tertiary: primitiveColors.neutral[400],   // #666666
      disabled: primitiveColors.neutral[400],   // #666666
      inverse: primitiveColors.neutral[50],     // #09090c
    },

    // Accent (Orange)
    accent: {
      default: primitiveColors.orange[500],     // #ff8000
      hover: primitiveColors.orange[600],       // #e67300
      active: primitiveColors.orange[700],      // #cc6600
      subtle: primitiveColors.orange[100],      // rgba(255, 128, 0, 0.2)
      subtleBorder: primitiveColors.orange[100],
    },

    // Status
    success: {
      default: primitiveColors.green[500],
      subtle: primitiveColors.green[100],
      text: primitiveColors.green[500],
    },
    warning: {
      default: primitiveColors.yellow[500],
      subtle: primitiveColors.yellow[100],
      text: primitiveColors.yellow[500],
    },
    error: {
      default: primitiveColors.red[500],
      subtle: primitiveColors.red[100],
      text: primitiveColors.red[500],
    },
    info: {
      default: primitiveColors.blue[500],
      subtle: primitiveColors.blue[100],
      text: primitiveColors.blue[500],
    },
  },

  light: {
    // Backgrounds
    background: {
      base: '#faf8f5',                          // Warm off-white
      subtle: '#f5f2ed',                        // Slightly darker warm
      elevated: primitiveColors.neutral[1000],  // #ffffff - Cards
      hover: '#f0ede8',                         // Hover states
    },

    // Borders
    border: {
      subtle: '#e8e4de',                        // Light warm border
      default: '#ddd8d0',                       // Default border
      strong: '#ccc7be',                        // Strong border
      interactive: 'rgba(0, 0, 0, 0.1)',
    },

    // Text
    text: {
      primary: primitiveColors.neutral[50],     // #09090c
      secondary: '#6b6560',                     // Warm gray
      tertiary: '#9a958e',                      // Light warm gray
      disabled: '#b5b0a8',
      inverse: primitiveColors.neutral[1000],   // #ffffff
    },

    // Accent (Orange - same across modes)
    accent: {
      default: primitiveColors.orange[500],
      hover: primitiveColors.orange[600],
      active: primitiveColors.orange[700],
      subtle: primitiveColors.orange[50],
      subtleBorder: primitiveColors.orange[100],
    },

    // Status (slightly adjusted for light backgrounds)
    success: {
      default: '#16a34a',
      subtle: primitiveColors.green[50],
      text: '#15803d',
    },
    warning: {
      default: '#ca8a04',
      subtle: primitiveColors.yellow[50],
      text: '#a16207',
    },
    error: {
      default: '#dc2626',
      subtle: primitiveColors.red[50],
      text: '#b91c1c',
    },
    info: {
      default: '#2563eb',
      subtle: primitiveColors.blue[50],
      text: '#1d4ed8',
    },
  },
} as const;

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

export const typography = {
  fontFamily: {
    primary: "'Poppins', sans-serif",
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  fontSize: {
    xs: '10px',       // Section labels, fine print
    sm: '12px',       // Small text, captions
    base: '13px',     // Body text, nav items
    md: '14px',       // Secondary text
    lg: '16px',       // Large body, button text
    xl: '18px',       // Subheadings
    '2xl': '20px',    // Section headings
    '3xl': '24px',    // Page headings
    '4xl': '32px',    // Large headings
    '5xl': '42px',    // Hero headings
  },

  lineHeight: {
    tight: 1,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',   // For uppercase labels
  },
} as const;

/**
 * Typography Presets
 * Pre-defined text styles for consistency
 */
export const textStyles = {
  // Headings
  heroHeading: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: '43px',
    letterSpacing: typography.letterSpacing.tight,
  },
  pageHeading: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.snug,
  },
  sectionHeading: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.snug,
  },

  // Body
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
  },
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
  },

  // UI Elements
  navItem: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
  },
  buttonSmall: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.tight,
  },
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.normal,
  },
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '10px',
  4: '12px',
  5: '14px',
  6: '16px',
  8: '20px',
  10: '24px',
  12: '30px',
  14: '36px',
  16: '40px',
  20: '60px',
} as const;

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',        // Cards, inputs, containers
  xl: '16px',
  '2xl': '20px',
  full: '9999px',    // Pill buttons (40px, 52px, 60px in practice)
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  glow: {
    accent: '0 0 20px rgba(255, 128, 0, 0.3)',
    success: '0 0 20px rgba(34, 197, 94, 0.3)',
    error: '0 0 20px rgba(239, 68, 68, 0.3)',
  },
} as const;

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

export const animation = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  easing: {
    default: 'ease',
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// =============================================================================
// COMPONENT TOKENS
// =============================================================================

export const components = {
  // Sidebar
  sidebar: {
    width: '208px',
    paddingX: spacing[3],     // 10px
    paddingY: spacing[14],    // 36px
    itemPaddingX: spacing[5], // 14px
    itemPaddingY: spacing[3], // 10px
    itemGap: spacing[4],      // 12px
    itemRadius: borderRadius.full,
    iconSize: '20px',
  },

  // Buttons
  button: {
    // Primary (White)
    primary: {
      paddingX: spacing[8],   // 20px
      paddingY: spacing[4],   // 12px
      radius: '52px',
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
    },
    // Secondary (Dark)
    secondary: {
      paddingX: spacing[8],
      paddingY: spacing[4],
      radius: '52px',
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
    },
    // Small
    small: {
      paddingX: spacing[6],   // 16px
      paddingY: spacing[2],   // 8px
      radius: '40px',
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.medium,
    },
    // Icon button
    icon: {
      size: '40px',
      radius: borderRadius.full,
    },
  },

  // Inputs
  input: {
    paddingX: spacing[5],     // 14px
    paddingY: spacing[2],     // 8px
    radius: borderRadius.lg,  // 12px
    fontSize: typography.fontSize.base,
  },

  // Cards
  card: {
    padding: spacing[6],      // 16px
    radius: borderRadius.lg,  // 12px
    gap: spacing[4],          // 12px
  },

  // Modals
  modal: {
    padding: spacing[10],     // 24px
    radius: borderRadius.lg,  // 12px
    maxWidth: '500px',
  },

  // Navigation items
  navItem: {
    paddingX: spacing[5],     // 14px
    paddingY: spacing[3],     // 10px
    radius: borderRadius.full,
    gap: spacing[4],          // 12px
    iconSize: '20px',
  },
} as const;

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

// =============================================================================
// BREAKPOINTS
// =============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;
