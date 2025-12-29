import { LucideIcon } from 'lucide-react';

/**
 * Navigation item interface for menu items
 */
export interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Display title of the navigation item */
  title: string;
  /** URL path for navigation */
  url: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional badge text (e.g., notification count) */
  badge?: string;
  /** Whether this item is currently active */
  isActive?: boolean;
  /** Whether this item can be collapsed/expanded */
  isCollapsible?: boolean;
  /** Sub-items for collapsible navigation items */
  items?: NavigationItem[];
}

/**
 * Quick action item interface for action buttons
 */
export interface QuickActionItem {
  /** Unique identifier for the quick action */
  id: string;
  /** Display title of the quick action */
  title: string;
  /** URL path for the action */
  url: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional description for accessibility */
  description?: string;
}

/**
 * User menu item interface for avatar dropdown
 */
export interface UserMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display title of the menu item */
  title: string;
  /** URL path for navigation */
  url: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Whether this item is a separator */
  isSeparator?: boolean;
  /** Optional click handler for custom actions */
  onClick?: () => void;
}

/**
 * Navigation header props interface
 */
export interface NavigationHeaderProps {
  /** Current page title for breadcrumb */
  pageTitle: string;
  /** Current page path for breadcrumb */
  pagePath: string;
  /** Optional breadcrumb items (if different from default) */
  breadcrumbItems?: BreadcrumbItem[];
  /** Whether to show the home button */
  showHomeButton?: boolean;
  /** Whether to show the search bar */
  showSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Whether to show notifications */
  showNotifications?: boolean;
  /** Notification count */
  notificationCount?: number;
  /** Custom className for the header */
  className?: string;
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  /** Display text for the breadcrumb item */
  label: string;
  /** URL path for the breadcrumb item */
  href?: string;
  /** Whether this is the current page (no link) */
  isCurrentPage?: boolean;
}

/**
 * Provider navigation context interface
 */
export interface ProviderNavigationContext {
  /** Current pathname */
  pathname: string;
  /** Navigation handler function */
  handleNavigation: (path: string) => void;
  /** Avatar menu toggle handler */
  handleAvatarMenuToggle: () => void;
  /** Logout handler */
  handleLogout: () => void;
  /** Quick action handler */
  handleQuickAction: (action: string) => void;
  /** Whether avatar menu is open */
  isAvatarMenuOpen: boolean;
  /** Currently hovered navigation item */
  hoveredItem: string | null;
  /** Set hovered item handler */
  setHoveredItem: (item: string | null) => void;
}

/**
 * Navigation configuration interface
 */
export interface NavigationConfig {
  /** Main navigation items */
  items: NavigationItem[];
  /** Quick action items */
  quickActions: QuickActionItem[];
  /** User menu items */
  userMenuItems: UserMenuItem[];
  /** Default breadcrumb configuration */
  defaultBreadcrumb: BreadcrumbItem[];
}

/**
 * Navigation state interface
 */
export interface NavigationState {
  /** Whether sidebar is collapsed */
  isCollapsed: boolean;
  /** Whether mobile menu is open */
  isMobileMenuOpen: boolean;
  /** Currently active navigation item */
  activeItem: string | null;
  /** Search query */
  searchQuery: string;
}

/**
 * Navigation actions interface
 */
export interface NavigationActions {
  /** Toggle sidebar collapse */
  toggleSidebar: () => void;
  /** Toggle mobile menu */
  toggleMobileMenu: () => void;
  /** Set active navigation item */
  setActiveItem: (item: string | null) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Navigate to a specific path */
  navigate: (path: string) => void;
}
