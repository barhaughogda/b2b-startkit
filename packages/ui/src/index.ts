/**
 * @startkit/ui
 *
 * Shared UI component library based on shadcn/ui.
 * All components follow mobile-first responsive design.
 *
 * @ai-context This package provides:
 * - Primitive components (Button, Input, Card, etc.)
 * - Layout components (Sidebar, Header, PageHeader, EmptyState, ErrorBoundary)
 * - Utility functions (cn for class merging)
 *
 * Usage in products:
 * ```tsx
 * import { Button, Card, Input } from '@startkit/ui'
 * import { Sidebar, Header, PageHeader } from '@startkit/ui'
 * // Or import from layouts directly
 * import { SidebarProvider, Sidebar } from '@startkit/ui/layouts'
 * ```
 */

// Utilities
export { cn } from './lib/utils'

// Layout components
export {
  // Sidebar
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
  // Header
  Header,
  HeaderLeft,
  HeaderCenter,
  HeaderRight,
  HeaderTitle,
  HeaderSeparator,
  headerVariants,
  // Page Header
  PageHeader,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
  PageHeaderBack,
  pageHeaderVariants,
  // Empty State
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
  EmptyStatePreset,
  EmptySearchResults,
  emptyStateVariants,
  // Error Boundary
  ErrorBoundary,
  DefaultErrorFallback,
  ErrorCard,
  ErrorCardIcon,
  ErrorCardTitle,
  ErrorCardDescription,
  ErrorCardAction,
  ErrorCardDetails,
  useErrorHandler,
} from './layouts'

// Primitive components
export { Button, buttonVariants } from './components/button'
export { FeatureFlag, FeatureFlagGate } from './components/feature-flag'

// Card components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/card'

// Form components
export { Input } from './components/input'
export { Label } from './components/label'
export { Textarea } from './components/textarea'
export { Checkbox } from './components/checkbox'
export { Switch } from './components/switch'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/select'

// Dialog/Modal components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog'

// Dropdown Menu components
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu'

// Avatar components
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar'

// Badge component
export { Badge, badgeVariants } from './components/badge'

// Alert components
export { Alert, AlertTitle, AlertDescription } from './components/alert'

// Skeleton component
export { Skeleton } from './components/skeleton'

// Tabs components
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'

// Table components
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/table'

// Pagination components
export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './components/pagination'

// Toast/Notification components
export { Toaster, toast } from './components/sonner'

// Re-export types - Primitive components
export type { ButtonProps } from './components/button'
export type { FeatureFlagProps, FeatureFlagGateProps } from './components/feature-flag'
export type { InputProps } from './components/input'
export type { LabelProps } from './components/label'
export type { TextareaProps } from './components/textarea'
export type { BadgeProps } from './components/badge'

// Re-export types - Layout components
export type {
  // Sidebar
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
  // Header
  HeaderProps,
  HeaderLeftProps,
  HeaderCenterProps,
  HeaderRightProps,
  HeaderTitleProps,
  HeaderSeparatorProps,
  // Page Header
  PageHeaderProps,
  PageHeaderContentProps,
  PageHeaderTitleProps,
  PageHeaderDescriptionProps,
  PageHeaderActionsProps,
  PageHeaderBackProps,
  // Empty State
  EmptyStateProps,
  EmptyStateIconProps,
  EmptyStateTitleProps,
  EmptyStateDescriptionProps,
  EmptyStateActionProps,
  EmptyStatePresetProps,
  EmptySearchResultsProps,
  // Error Boundary
  ErrorBoundaryProps,
  DefaultErrorFallbackProps,
  ErrorCardProps,
  ErrorCardIconProps,
  ErrorCardTitleProps,
  ErrorCardDescriptionProps,
  ErrorCardActionProps,
  ErrorCardDetailsProps,
} from './layouts'
