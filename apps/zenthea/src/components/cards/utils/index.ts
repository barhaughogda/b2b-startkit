// Export all card utility classes and hooks
export { 
  CardDragHandler, 
  useCardDrag, 
  type DragState, 
  type DragConstraints 
} from './CardDragHandler';

export { 
  CardResizeHandler, 
  useCardResize, 
  type ResizeState, 
  type ResizeConstraints 
} from './CardResizeHandler';

export { 
  CardDropdownManager, 
  useCardDropdowns, 
  type DropdownState, 
  type DropdownPosition 
} from './CardDropdownManager';

export { 
  CardTabManager, 
  useCardTabs, 
  type TabState, 
  type TabConfig, 
  type TabName, 
  defaultTabConfigs 
} from './CardTabManager';

// Export card constants and utility functions
export {
  MIN_CARD_Y_POSITION,
  MAX_CARD_Y_POSITION,
  MIN_CARD_X_POSITION,
  MAX_CARD_X_POSITION,
  truncateText,
  getCardTypeName,
  getContextualInfo,
  getMinimizedCardText
} from './CardConstants';

// Export event handler hook
export { useCardEventHandlers } from './useCardEventHandlers';

// Export template constants
export {
  TEMPLATE_METADATA,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_COLORS,
  CATEGORY_BADGE_COLORS,
  TYPE_TO_CATEGORY,
  CATEGORY_TO_TYPES,
  getCategoryForType,
  getTemplateMetadata,
  getTemplatesByCategory,
  isValidCategory,
  getCategoryLabel,
  getCategoryDescription,
  getCategoryColors,
  getCategoryBadgeColors,
  type TemplateCategory,
  type TemplateMetadata
} from './TemplateConstants';
