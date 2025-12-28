'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { Card, CardContent, Button } from '@startkit/ui'

interface AccountSetupCardProps {
  errorMessage: string | null
}

export function AccountSetupCard({ errorMessage }: AccountSetupCardProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncError(null)

    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setSyncSuccess(true)
        // Refresh the page to reload with auth context
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } else {
        setSyncError(data.error || 'Failed to sync account')
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Network error')
    } finally {
      setIsSyncing(false)
    }
  }

  if (syncSuccess) {
    return (
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-lg font-semibold mb-2">Account synced!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Redirecting to dashboard...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md">
      <CardContent className="pt-6 text-center">
        {errorMessage ? (
          <>
            <div className="text-amber-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Account Setup Required</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your account hasn&apos;t been synced to the database yet. 
              Click the button below to sync your account.
            </p>
            {syncError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded mb-4">
                {syncError}
              </div>
            )}
            <details className="text-left mb-4">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Technical details
              </summary>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                {errorMessage}
              </pre>
            </details>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Setting up your account...</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please wait while we finish setting up your account. This usually takes a few seconds.
            </p>
            {syncError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded mb-4">
                {syncError}
              </div>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              If this takes longer than a minute, click the button below to manually sync.
            </p>
          </>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Syncing...
              </>
            ) : (
              'Sync Account'
            )}
          </Button>
          
          <SignOutButton redirectUrl="/">
            <Button variant="outline" className="w-full">
              Sign Out
            </Button>
          </SignOutButton>
        </div>
      </CardContent>
    </Card>
  )
}
