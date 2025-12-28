import { getUsers } from './data'
import { UsersContent } from './components'

interface PageProps {
  searchParams: Promise<{
    search?: string
    superadmin?: string
    page?: string
  }>
}

/**
 * Users List Page
 */
export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1

  const result = await getUsers({
    search: params.search,
    superadminOnly: params.superadmin === 'true',
    page,
    limit: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage all users on the platform
        </p>
      </div>

      <UsersContent
        users={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        filters={{
          search: params.search,
          superadminOnly: params.superadmin === 'true',
        }}
      />
    </div>
  )
}
