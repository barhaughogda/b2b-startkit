/**
 * Layout Components
 *
 * Pre-built layout components for B2B SaaS applications.
 * These components provide consistent structure across products.
 *
 * @example
 * import {
 *   SidebarProvider,
 *   Sidebar,
 *   Header,
 *   PageHeader,
 *   EmptyState,
 *   ErrorBoundary
 * } from '@startkit/ui/layouts'
 */

// Sidebar components
export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  SidebarCollapseToggle,
  SidebarTrigger,
  SidebarInset,
  SidebarSeparator,
  useSidebar,
} from './sidebar'

export type {
  SidebarProviderProps,
  SidebarProps,
  SidebarHeaderProps,
  SidebarContentProps,
  SidebarNavProps,
  SidebarNavItemProps,
  SidebarFooterProps,
  SidebarCollapseToggleProps,
  SidebarTriggerProps,
  SidebarInsetProps,
  SidebarSeparatorProps,
} from './sidebar'

// Header components
export {
  Header,
  HeaderLeft,
  HeaderCenter,
  HeaderRight,
  HeaderTitle,
  HeaderSeparator,
  headerVariants,
} from './header'

export type {
  HeaderProps,
  HeaderLeftProps,
  HeaderCenterProps,
  HeaderRightProps,
  HeaderTitleProps,
  HeaderSeparatorProps,
} from './header'

// Page header components
export {
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  PageHeaderBack,
  pageHeaderVariants,
} from './page-header'

export type {
  PageHeaderProps,
  PageHeaderContentProps,
  PageHeaderTitleProps,
  PageHeaderDescriptionProps,
  PageHeaderActionsProps,
  PageHeaderBackProps,
} from './page-header'

// Empty state components
export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
  EmptyStatePreset,
  EmptySearchResults,
  emptyStateVariants,
} from './empty-state'

export type {
  EmptyStateProps,
  EmptyStateIconProps,
  EmptyStateTitleProps,
  EmptyStateDescriptionProps,
  EmptyStateActionProps,
  EmptyStatePresetProps,
  EmptySearchResultsProps,
} from './empty-state'

// Error boundary components
export {
  ErrorBoundary,
  DefaultErrorFallback,
  ErrorCard,
  ErrorCardIcon,
  ErrorCardTitle,
  ErrorCardDescription,
  ErrorCardAction,
  ErrorCardDetails,
  useErrorHandler,
} from './error-boundary'

export type {
  ErrorBoundaryProps,
  DefaultErrorFallbackProps,
  ErrorCardProps,
  ErrorCardIconProps,
  ErrorCardTitleProps,
  ErrorCardDescriptionProps,
  ErrorCardActionProps,
  ErrorCardDetailsProps,
} from './error-boundary'
