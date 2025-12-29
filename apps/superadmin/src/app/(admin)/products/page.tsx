import { getProducts } from './data'
import { ProductsContent } from './components'

interface PageProps {
  searchParams: Promise<{
    search?: string
    env?: string
    status?: string
    page?: string
  }>
}

/**
 * Products Registry Page
 */
export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = params.page ? parseInt(params.page, 10) : 1

  const result = await getProducts({
    search: params.search,
    env: params.env,
    status: params.status,
    page,
    limit: 20,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage products registered in the platform
        </p>
      </div>

      <ProductsContent
        products={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        filters={{
          search: params.search,
          env: params.env,
          status: params.status,
        }}
      />
    </div>
  )
}
