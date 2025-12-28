import { getActiveKillSwitches, getSuspendedOrganizations, getEmergencyStats } from './data'
import { EmergencyContent } from './components'

/**
 * Emergency Controls Page
 *
 * Provides kill switch and organization suspension controls for superadmins.
 * All actions are logged to the audit log.
 */
export default async function EmergencyPage() {
  const [activeKillSwitches, suspendedOrgs, stats] = await Promise.all([
    getActiveKillSwitches(),
    getSuspendedOrganizations(),
    getEmergencyStats(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emergency Controls</h1>
        <p className="text-muted-foreground">
          Kill switches and emergency suspension controls
        </p>
      </div>

      <EmergencyContent
        activeKillSwitches={activeKillSwitches}
        suspendedOrgs={suspendedOrgs}
        stats={stats}
      />
    </div>
  )
}
