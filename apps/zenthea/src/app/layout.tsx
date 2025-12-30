import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './(styles)/tokens.css'
import './globals.css'
import { ZentheaThemeProvider } from '@/lib/theme-context'
import { Toaster } from 'sonner'
import StyledJsxRegistry from './registry'
import { Providers } from './providers'
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget'
import { ClerkProvider } from '@clerk/nextjs'
import { zentheaEnv } from '@/lib/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Zenthea - Healthcare Management Platform',
  description: 'Modern healthcare management platform with AI-powered features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={zentheaEnv.client.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={zentheaEnv.client.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={zentheaEnv.client.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      <html lang="en">
        <body className={inter.className}>
          <StyledJsxRegistry>
            <ZentheaThemeProvider>
              <Providers>
                {children}
                <Toaster />
                {/* ElevenLabs AI Agent Widget - Only visible on clinic routes after login */}
                <ElevenLabsWidget />
              </Providers>
            </ZentheaThemeProvider>
          </StyledJsxRegistry>
        </body>
      </html>
    </ClerkProvider>
  )
}
