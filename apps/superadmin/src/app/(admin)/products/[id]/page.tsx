import { notFound } from 'next/navigation'
import { getProductById } from '../data'
import { ProductDetailContent } from './components'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Product Detail Page
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <ProductDetailContent product={product} />
    </div>
  )
}
