import { getOrganizations } from './data'
import { OrganizationsContent } from './components'

interface PageProps {
  searchParams: Promise<{
    search?: string
    plan?: string
    status?: string
    page?: string
  }>
}

/**
 * Organizations List Page
 */
export default async function OrganizationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1
  
  const result = await getOrganizations({
    search: params.search,
    plan: params.plan,
    status: params.status,
    page,
    limit: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">
          Manage all organizations on the platform
        </p>
      </div>

      <OrganizationsContent
        organizations={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        filters={{
          search: params.search,
          plan: params.plan,
          status: params.status,
        }}
      />
    </div>
  )
}
