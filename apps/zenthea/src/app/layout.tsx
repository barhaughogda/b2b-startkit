import type { Metadata } from 'next'
import { ClerkProvider } from '@startkit/auth'
import { Inter } from 'next/font/google'
import { validateZentheaEnv } from '@/lib/env'
import '@startkit/ui/globals.css'
import './globals.css'

// Validate Zenthea-specific environment variables on server startup
// This uses Zenthea's env validation (not @startkit/config's validateEnv)
// because Zenthea uses AWS Postgres, not Supabase
if (typeof window === 'undefined') {
  validateZentheaEnv()
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Zenthea',
    template: '%s | Zenthea',
  },
  description: 'HIPAA-compliant healthcare platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
