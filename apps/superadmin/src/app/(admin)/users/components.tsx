'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Button,
  Checkbox,
  Label,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@startkit/ui'
import { Search, Users, ChevronLeft, ChevronRight, ExternalLink, Shield, UserCog } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useTransition } from 'react'
import type { UserListItem } from './data'

interface UsersContentProps {
  users: UserListItem[]
  total: number
  page: number
  totalPages: number
  filters: {
    search?: string
    superadminOnly?: boolean
  }
}

export function UsersContent({
  users,
  total,
  page,
  totalPages,
  filters,
}: UsersContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
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
      router.push(`/users?${params.toString()}`)
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
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            {/* Superadmin filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="superadmin"
                checked={filters.superadminOnly}
                onCheckedChange={(checked) =>
                  updateFilters({ superadmin: checked ? 'true' : undefined })
                }
              />
              <Label htmlFor="superadmin" className="text-sm cursor-pointer">
                Superadmins only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Users
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {total.toLocaleString()} total users
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organizations</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback>
                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                href={`/users/${user.id}`}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {user.name || 'Unknown'}
                              </Link>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{user.organizationCount}</span>
                        </TableCell>
                        <TableCell>
                          {user.isSuperadmin ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              <Shield className="h-3 w-3 mr-1" />
                              Superadmin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={`/users/${user.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            {!user.isSuperadmin && (
                              <Button variant="ghost" size="sm" title="Impersonate user">
                                <UserCog className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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
