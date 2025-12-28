'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@startkit/ui'
import { RefreshCw, Building2 } from 'lucide-react'

interface OrgSyncCardProps {
  clerkOrgId: string
}

/**
 * Card displayed when user has an organization in Clerk but it's not synced to the database
 */
export function OrgSyncCard({ clerkOrgId }: OrgSyncCardProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSyncOrganization = async () => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/sync-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkOrgId }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the page to re-evaluate auth context
        router.refresh()
      } else {
        setError(data.error || 'Failed to sync organization')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Sync org error:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Building2 className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Organization Not Synced</CardTitle>
          <CardDescription>
            Your organization exists in Clerk but hasn't been synced to the database yet.
            Click below to sync it now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSyncOrganization}
            disabled={isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Organization
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            This usually happens when the webhook hasn't fired yet.
            Syncing will create the organization in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
