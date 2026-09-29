/**
 * LootList+ Design System
 *
 * Central export for all design tokens and utilities.
 */

export * from './tokens';

// COLOR-05 (D-12/D-13): QUALITY_COLORS and BRAND_COLORS. Prefer importing
// from '@/lib/design-system/quality-colors' directly in consumers -- this
// re-export exists for discoverability only, so importing the index does
// not pull the whole design-system module into a client bundle.
export * from './quality-colors';

// Re-export commonly used items for convenience
export {
  primitiveColors,
  semanticColors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  animation,
  components,
  zIndex,
  breakpoints,
} from './tokens';
