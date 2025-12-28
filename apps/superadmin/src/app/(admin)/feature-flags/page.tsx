import { getFeatureFlagSummaries, getFeatureFlags, getAvailableFlagKeys } from './data'
import { FeatureFlagsContent } from './components'

/**
 * Feature Flags Page
 */
export default async function FeatureFlagsPage() {
  const [summaries, flags, availableKeys] = await Promise.all([
    getFeatureFlagSummaries(),
    getFeatureFlags(),
    getAvailableFlagKeys(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground">
          Manage feature availability across organizations
        </p>
      </div>

      <FeatureFlagsContent
        summaries={summaries}
        flags={flags}
        availableKeys={availableKeys}
      />
    </div>
  )
}
