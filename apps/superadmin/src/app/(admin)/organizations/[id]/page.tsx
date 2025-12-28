import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrganizationById } from '../data'
import { OrganizationDetailContent } from './components'
import { Button } from '@startkit/ui'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Organization Detail Page
 */
export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params
  const organization = await getOrganizationById(id)

  if (!organization) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
        <p className="text-muted-foreground">
          Organization details and management
        </p>
      </div>

      <OrganizationDetailContent organization={organization} />
    </div>
  )
}
