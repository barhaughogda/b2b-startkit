import { Card, CardContent, CardHeader, CardTitle } from '@startkit/ui'
import { Flag } from 'lucide-react'

/**
 * Feature Flags Admin Page
 * 
 * Manage feature flags for this product
 */
export default function FeatureFlagsAdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground">
          Manage feature availability across organizations
        </p>
      </div>

      {/* Coming soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Feature flag management interface coming soon. This will allow you to:
          </p>
          <ul className="mt-4 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Enable/disable features per organization</li>
            <li>Configure A/B tests</li>
            <li>Set feature rollout percentages</li>
            <li>View feature usage statistics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
