import type { Metadata } from 'next'
import { ClerkProvider } from '@startkit/auth'
import { Inter } from 'next/font/google'
import { validateEnv } from '@startkit/config'
import '@startkit/ui/globals.css'
import './globals.css'

// Validate environment variables on server startup
// This will throw an error if required env vars are missing
if (typeof window === 'undefined') {
  validateEnv()
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'StartKit Product',
    template: '%s | StartKit',
  },
  description: 'A StartKit-powered B2B SaaS product',
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
