import { getActivityLogs, getActionTypes } from './data'
import { ActivityLogContent } from './components'

interface PageProps {
  searchParams: Promise<{
    search?: string
    action?: string
    superadmin?: string
    page?: string
  }>
}

/**
 * Activity Log Page
 */
export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1

  const result = await getActivityLogs({
    search: params.search,
    action: params.action,
    superadminOnly: params.superadmin === 'true',
    page,
    limit: 50,
  })

  const actionTypes = getActionTypes()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          Platform-wide audit trail and event history
        </p>
      </div>

      <ActivityLogContent
        logs={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        actionTypes={actionTypes}
        filters={{
          search: params.search,
          action: params.action,
          superadminOnly: params.superadmin === 'true',
        }}
      />
    </div>
  )
}
