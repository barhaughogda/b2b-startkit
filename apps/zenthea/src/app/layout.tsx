import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './(styles)/tokens.css'
import './globals.css'
import { ZentheaThemeProvider } from '@/lib/theme-context'
import { Toaster } from 'sonner'
import StyledJsxRegistry from './registry'
import { Providers } from './providers'
import { ElevenLabsWidget } from '@/components/ElevenLabsWidget'

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
  )
}
