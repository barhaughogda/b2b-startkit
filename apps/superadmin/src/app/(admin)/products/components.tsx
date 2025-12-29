'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
} from '@startkit/ui'
import { 
  Search, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Plus,
  Key,
  Globe,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useTransition } from 'react'
import type { ProductListItem } from './data'

interface ProductsContentProps {
  products: ProductListItem[]
  total: number
  page: number
  totalPages: number
  filters: {
    search?: string
    env?: string
    status?: string
  }
}

export function ProductsContent({
  products,
  total,
  page,
  totalPages,
  filters,
}: ProductsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(filters.search || '')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
      router.push(`/products?${params.toString()}`)
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
                  placeholder="Search by name..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            {/* Environment filter */}
            <Select
              value={filters.env || 'all'}
              onValueChange={(value) => updateFilters({ env: value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All environments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
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
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
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
              <Package className="h-5 w-5 text-primary" />
              Products
            </CardTitle>
            <CardDescription>
              {total.toLocaleString()} registered products
            </CardDescription>
          </div>
          <CreateProductDialog 
            open={showCreateDialog} 
            onOpenChange={setShowCreateDialog} 
          />
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No products found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Register First Product
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keys</TableHead>
                      <TableHead>Orgs</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/products/${product.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {product.displayName}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">{product.name}</p>
                              <a 
                                href={product.baseUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EnvBadge env={product.env} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Key className="h-3 w-3 text-muted-foreground" />
                            <span>{product.activeKeyCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>{product.orgCount}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(product.createdAt, { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/products/${product.id}`}>
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

function EnvBadge({ env }: { env: string }) {
  const defaultConfig = { variant: 'outline' as const, className: 'border-blue-500/50 text-blue-400' }
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
    development: { variant: 'outline', className: 'border-blue-500/50 text-blue-400' },
    staging: { variant: 'outline', className: 'border-amber-500/50 text-amber-400' },
    production: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  }

  const config = variants[env] ?? defaultConfig

  return (
    <Badge variant={config.variant} className={config.className}>
      {env}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const defaultConfig = { variant: 'secondary' as const, className: 'text-muted-foreground' }
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    inactive: { variant: 'secondary', className: 'text-muted-foreground' },
    archived: { variant: 'destructive', className: '' },
  }

  const config = statusConfig[status] ?? defaultConfig

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  )
}

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      displayName: formData.get('displayName') as string,
      description: formData.get('description') as string,
      baseUrl: formData.get('baseUrl') as string,
      env: formData.get('env') as string,
    }

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create product')
      }

      const product = await response.json()
      onOpenChange(false)
      router.push(`/products/${product.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Register Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Register New Product</DialogTitle>
            <DialogDescription>
              Add a new product to the platform. You can generate signing keys after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Product Name (slug)</Label>
              <Input
                id="name"
                name="name"
                placeholder="taskmaster"
                pattern="^[a-z0-9-]+$"
                title="Lowercase letters, numbers, and hyphens only"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase, no spaces. Used as identifier.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="TaskMaster"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Project management for teams"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                placeholder="https://taskmaster.example.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="env">Environment</Label>
              <Select name="env" defaultValue="development">
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
