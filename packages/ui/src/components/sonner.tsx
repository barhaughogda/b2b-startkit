'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, toast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Toast notification component using Sonner
 *
 * Add <Toaster /> to your root layout to enable toasts.
 *
 * @example
 * // In layout.tsx
 * import { Toaster } from '@startkit/ui'
 * <Toaster />
 *
 * // To show a toast
 * import { toast } from '@startkit/ui'
 * toast.success('Operation completed!')
 * toast.error('Something went wrong')
 */
const Toaster = ({ ...props }: ToasterProps) => {
  let theme: 'light' | 'dark' | 'system' = 'system'

  // Only use next-themes if available (graceful fallback)
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { theme: nextTheme } = useTheme()
    if (nextTheme === 'light' || nextTheme === 'dark') {
      theme = nextTheme
    }
  } catch {
    // next-themes not available, use system theme
  }

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
