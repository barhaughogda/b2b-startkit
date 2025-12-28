/**
 * @startkit/ui
 *
 * Shared UI component library based on shadcn/ui.
 * All components follow mobile-first responsive design.
 *
 * @ai-context This package provides:
 * - Primitive components (Button, Input, Card, etc.)
 * - Layout components (AppShell, Sidebar, Header)
 * - Utility functions (cn for class merging)
 *
 * Usage in products:
 * ```tsx
 * import { Button, Card } from '@startkit/ui'
 * import { AppShell } from '@startkit/ui/layouts/app-shell'
 * ```
 */

// Utilities
export { cn } from './lib/utils'

// Primitive components
export { Button, buttonVariants } from './components/button'

// Re-export types
export type { ButtonProps } from './components/button'
