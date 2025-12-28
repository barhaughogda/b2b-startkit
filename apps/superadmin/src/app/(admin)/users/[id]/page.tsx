import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserById } from '../data'
import { UserDetailContent } from './components'
import { Button } from '@startkit/ui'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * User Detail Page
 */
export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getUserById(id)

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.name || user.email}</h1>
        <p className="text-muted-foreground">
          User details and management
        </p>
      </div>

      <UserDetailContent user={user} />
    </div>
  )
}
