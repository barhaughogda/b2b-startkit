import { getCustomers } from './data'
import { CustomersContent } from './components'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

/**
 * Customers List Page
 */
export default async function CustomersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1

  const result = await getCustomers({
    search: params.search,
    status: params.status,
    page,
    limit: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage shared customers across products
        </p>
      </div>

      <CustomersContent
        customers={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        filters={{
          search: params.search,
          status: params.status,
        }}
      />
    </div>
  )
}
