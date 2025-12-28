import type { Metadata } from 'next'
import { ClerkProvider } from '@startkit/auth'
import { Inter } from 'next/font/google'
import '@startkit/ui/globals.css'
import './globals.css'

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
