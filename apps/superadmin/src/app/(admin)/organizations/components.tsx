'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@startkit/ui'
import { Search, Building2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useTransition } from 'react'
import type { OrganizationListItem } from './data'

interface OrganizationsContentProps {
  organizations: OrganizationListItem[]
  total: number
  page: number
  totalPages: number
  filters: {
    search?: string
    plan?: string
    status?: string
  }
}

export function OrganizationsContent({
  organizations,
  total,
  page,
  totalPages,
  filters,
}: OrganizationsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    // Reset to page 1 when filtering
    if (!updates.page) {
      params.delete('page')
    }
    
    startTransition(() => {
      router.push(`/organizations?${params.toString()}`)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchValue || undefined })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or slug..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            {/* Plan filter */}
            <Select
              value={filters.plan || 'all'}
              onValueChange={(value) => updateFilters({ plan: value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilters({ status: value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organizations
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {total.toLocaleString()} total organizations
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No organizations found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/organizations/${org.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {org.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={org.subscription?.plan || 'free'} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={org.subscription?.status || 'none'} />
                        </TableCell>
                        <TableCell>{org.memberCount}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(org.createdAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/organizations/${org.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isPending}
                      onClick={() => updateFilters({ page: String(page - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || isPending}
                      onClick={() => updateFilters({ page: String(page + 1) })}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    free: 'secondary',
    starter: 'outline',
    pro: 'default',
    enterprise: 'default',
  }

  return (
    <Badge variant={variants[plan] || 'secondary'} className="capitalize">
      {plan}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    trialing: { variant: 'outline', className: 'border-amber-500/50 text-amber-400' },
    past_due: { variant: 'outline', className: 'border-orange-500/50 text-orange-400' },
    canceled: { variant: 'destructive', className: '' },
    none: { variant: 'secondary', className: 'text-muted-foreground' },
  }

  const config = statusConfig[status] || statusConfig.none

  return (
    <Badge variant={config.variant} className={config.className}>
      {status === 'none' ? 'No subscription' : status.replace('_', ' ')}
    </Badge>
  )
}
