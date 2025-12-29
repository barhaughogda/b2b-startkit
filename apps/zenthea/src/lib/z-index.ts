/**
 * Z-Index Management Constants
 * 
 * Centralized z-index values to ensure consistent layering across the application.
 * Cards use dynamic z-index values based on Date.now() + base values for proper stacking.
 */

// Card System Z-Index Values
export const CARD_Z_INDEX = {
  /** Base z-index for cards (must be higher than Tailwind's max z-50) */
  BASE: 999999,
  /** Z-index for focused/active cards */
  FOCUSED: 9999999,
  /** Z-index increment for new cards */
  NEW_CARD_INCREMENT: 1000,
  /** Z-index increment for expanded cards */
  EXPANDED_INCREMENT: 2000,
  /** Z-index increment for focused cards */
  FOCUS_INCREMENT: 3000,
  /** Z-index increment for maximized cards */
  MAXIMIZED_INCREMENT: 4000,
  /** Z-index for minimized cards (lower than base) */
  MINIMIZED_OFFSET: -1000,
} as const;

// Portal Component Z-Index Values
// These must be higher than the maximum possible card z-index
// Maximum card z-index: Date.now() + CARD_Z_INDEX.FOCUSED + CARD_Z_INDEX.MAXIMIZED_INCREMENT
// Using a fixed high value ensures portal components always appear above cards
export const PORTAL_Z_INDEX = {
  /** Base z-index for portal components (dialogs, sheets, popovers, etc.) */
  BASE: 99999999998,
  /** Z-index for portal content (highest layer) */
  CONTENT: 99999999999,
} as const;

// UI Component Z-Index Values
export const UI_Z_INDEX = {
  /** Control bar z-index (must be higher than cards) */
  CONTROL_BAR: PORTAL_Z_INDEX.BASE,
  /** Tooltip z-index */
  TOOLTIP: PORTAL_Z_INDEX.CONTENT,
  /** Dropdown menu z-index */
  DROPDOWN_MENU: PORTAL_Z_INDEX.CONTENT,
  /** Popover z-index */
  POPOVER: PORTAL_Z_INDEX.CONTENT,
  /** Select dropdown z-index */
  SELECT: PORTAL_Z_INDEX.CONTENT,
  /** Dialog overlay z-index */
  DIALOG_OVERLAY: PORTAL_Z_INDEX.BASE,
  /** Dialog content z-index */
  DIALOG_CONTENT: PORTAL_Z_INDEX.CONTENT,
  /** Sheet overlay z-index */
  SHEET_OVERLAY: PORTAL_Z_INDEX.BASE,
  /** Sheet content z-index */
  SHEET_CONTENT: PORTAL_Z_INDEX.CONTENT,
} as const;

/**
 * Calculate z-index for a new card
 */
export function getNewCardZIndex(): number {
  return Date.now() + CARD_Z_INDEX.FOCUSED + CARD_Z_INDEX.NEW_CARD_INCREMENT;
}

/**
 * Calculate z-index for an expanded card
 */
export function getExpandedCardZIndex(): number {
  return Date.now() + CARD_Z_INDEX.FOCUSED + CARD_Z_INDEX.EXPANDED_INCREMENT;
}

/**
 * Calculate z-index for a focused card
 */
export function getFocusedCardZIndex(): number {
  return Date.now() + CARD_Z_INDEX.FOCUSED + CARD_Z_INDEX.FOCUS_INCREMENT;
}

/**
 * Calculate z-index for a maximized card
 */
export function getMaximizedCardZIndex(): number {
  return Date.now() + CARD_Z_INDEX.FOCUSED + CARD_Z_INDEX.MAXIMIZED_INCREMENT;
}

/**
 * Calculate z-index for a minimized card
 */
export function getMinimizedCardZIndex(stackIndex: number): number {
  return CARD_Z_INDEX.BASE + stackIndex + CARD_Z_INDEX.MINIMIZED_OFFSET;
}

