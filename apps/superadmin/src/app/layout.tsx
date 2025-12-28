import type { Metadata } from 'next'
import { ClerkProvider } from '@startkit/auth'
import { validateEnv } from '@startkit/config'
import '@startkit/ui/globals.css'
import './globals.css'

// Validate environment variables on server startup
if (typeof window === 'undefined') {
  validateEnv()
}

export const metadata: Metadata = {
  title: {
    default: 'StartKit Superadmin',
    template: '%s | Superadmin',
  },
  description: 'StartKit Platform Administration Dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
