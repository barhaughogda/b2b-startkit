'use client'

import type { ReactNode } from 'react'
import type { NavigationHeaderProps } from '@/types/navigation'
import { ProviderNavigationLayout } from '@/components/navigation/ProviderNavigationLayout'

type ProviderLayoutProps = {
  children: ReactNode
} & Partial<NavigationHeaderProps>

/**
 * ProviderLayout
 *
 * Thin wrapper around Provider navigation chrome used by `/app/provider/*` routes.
 */
export function ProviderLayout({
  children,
  pageTitle = 'Provider Portal',
  pagePath = '/provider',
  showSearch = false,
  showNotifications = false,
}: ProviderLayoutProps) {
  return (
    <ProviderNavigationLayout
      pageTitle={pageTitle}
      pagePath={pagePath}
      showSearch={showSearch}
      showNotifications={showNotifications}
    >
      {children}
    </ProviderNavigationLayout>
  )
}

