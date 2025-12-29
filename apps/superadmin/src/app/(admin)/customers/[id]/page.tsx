import { notFound } from 'next/navigation'
import { getCustomerById, getUnlinkedProductOrgs } from '../data'
import { CustomerDetailContent } from './components'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Customer Detail Page
 */
export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params
  const customer = await getCustomerById(id)

  if (!customer) {
    notFound()
  }

  const unlinkedOrgs = await getUnlinkedProductOrgs()

  return (
    <div className="space-y-8">
      <CustomerDetailContent customer={customer} unlinkedOrgs={unlinkedOrgs} />
    </div>
  )
}
