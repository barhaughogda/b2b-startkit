'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@startkit/ui'
import {
  ArrowLeft,
  Users2,
  Globe,
  Package,
  Link as LinkIcon,
  Unlink,
  CreditCard,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { CustomerDetail, LinkedProductOrg } from '../data'

interface UnlinkedOrg {
  id: string
  productId: string
  productName: string
  productDisplayName: string
  externalOrgId: string
  name: string
  domain: string | null
  createdAt: Date
}

interface CustomerDetailContentProps {
  customer: CustomerDetail
  unlinkedOrgs: UnlinkedOrg[]
}

export function CustomerDetailContent({ customer, unlinkedOrgs }: CustomerDetailContentProps) {
  const router = useRouter()
  const [showLinkDialog, setShowLinkDialog] = useState(false)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
              <StatusBadge status={customer.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              {customer.primaryDomain && (
                <span className="text-sm flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {customer.primaryDomain}
                </span>
              )}
              {customer.stripeCustomerId && (
                <span className="text-sm flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {customer.stripeCustomerId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Linked Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{customer.linkedProductCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verified Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{customer.domains.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer Since
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              <span className="text-lg font-medium">
                {formatDistanceToNow(customer.createdAt, { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Product Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Linked Product Organizations
            </CardTitle>
            <CardDescription>
              Organizations from different products linked to this customer
            </CardDescription>
          </div>
          <LinkOrgDialog
            customerId={customer.id}
            unlinkedOrgs={unlinkedOrgs}
            open={showLinkDialog}
            onOpenChange={setShowLinkDialog}
            onLinked={() => router.refresh()}
          />
        </CardHeader>
        <CardContent>
          {customer.linkedOrgs.length === 0 ? (
            <div className="text-center py-8">
              <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No linked organizations</p>
              <p className="text-sm text-muted-foreground mt-1">
                Link product organizations to this customer
              </p>
              {unlinkedOrgs.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowLinkDialog(true)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Organization
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Link Method</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.linkedOrgs.map((org) => (
                    <LinkedOrgRow
                      key={org.linkId}
                      org={org}
                      onUnlinked={() => router.refresh()}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domains */}
      {customer.domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verified Domains</CardTitle>
            <CardDescription>
              Domains verified for this customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {customer.domains.map((domain) => (
                <Badge key={domain} variant="outline" className="text-sm">
                  <Globe className="h-3 w-3 mr-1" />
                  {domain}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function LinkedOrgRow({ 
  org, 
  onUnlinked 
}: { 
  org: LinkedProductOrg
  onUnlinked: () => void 
}) {
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)

  const handleUnlink = async () => {
    setIsUnlinking(true)
    try {
      const response = await fetch(`/api/admin/customers/links/${org.linkId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to unlink')
      }
      setShowUnlinkDialog(false)
      onUnlinked()
    } catch (error) {
      console.error('Failed to unlink:', error)
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/products/${org.productId}`}
          className="font-medium hover:text-primary transition-colors"
        >
          {org.productDisplayName}
        </Link>
        <p className="text-xs text-muted-foreground">{org.productName}</p>
      </TableCell>
      <TableCell>
        <span className="font-medium">{org.orgName}</span>
        <p className="text-xs text-muted-foreground">{org.externalOrgId}</p>
      </TableCell>
      <TableCell>
        {org.orgDomain ? (
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{org.orgDomain}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <LinkMethodBadge method={org.linkMethod} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDistanceToNow(org.linkedAt, { addSuffix: true })}
      </TableCell>
      <TableCell>
        <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Unlink className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink Organization</DialogTitle>
              <DialogDescription>
                Are you sure you want to unlink this organization from the customer?
                The organization data will remain in the product, but it won&apos;t be 
                associated with this customer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted p-3 rounded-md space-y-2">
                <p className="text-sm"><strong>Product:</strong> {org.productDisplayName}</p>
                <p className="text-sm"><strong>Organization:</strong> {org.orgName}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleUnlink} disabled={isUnlinking}>
                {isUnlinking ? 'Unlinking...' : 'Unlink'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  )
}

interface LinkOrgDialogProps {
  customerId: string
  unlinkedOrgs: UnlinkedOrg[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}

function LinkOrgDialog({ 
  customerId, 
  unlinkedOrgs, 
  open, 
  onOpenChange, 
  onLinked 
}: LinkOrgDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [linkMethod, setLinkMethod] = useState<string>('manual')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedOrgId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrgId: selectedOrgId,
          linkMethod,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to link organization')
      }

      onOpenChange(false)
      setSelectedOrgId('')
      onLinked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Group orgs by product
  const orgsByProduct = unlinkedOrgs.reduce((acc, org) => {
    if (!acc[org.productDisplayName]) {
      acc[org.productDisplayName] = []
    }
    acc[org.productDisplayName].push(org)
    return acc
  }, {} as Record<string, UnlinkedOrg[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={unlinkedOrgs.length === 0}>
          <LinkIcon className="h-4 w-4 mr-2" />
          Link Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link Product Organization</DialogTitle>
            <DialogDescription>
              Link a product organization to this customer for cross-product visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="org">Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orgsByProduct).map(([product, orgs]) => (
                    <div key={product}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {product}
                      </div>
                      {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex flex-col">
                            <span>{org.name}</span>
                            {org.domain && (
                              <span className="text-xs text-muted-foreground">{org.domain}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="linkMethod">Link Method</Label>
              <Select value={linkMethod} onValueChange={setLinkMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (Admin linked)</SelectItem>
                  <SelectItem value="domain_verified">Domain Verified</SelectItem>
                  <SelectItem value="sso">SSO Verified</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How this link was verified
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedOrgId}>
              {isSubmitting ? 'Linking...' : 'Link Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StatusBadge({ status }: { status: string }) {
  const defaultConfig = { variant: 'secondary' as const, className: 'text-muted-foreground' }
  const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
    active: { variant: 'default', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    churned: { variant: 'destructive', className: '' },
    suspended: { variant: 'outline', className: 'border-orange-500/50 text-orange-400' },
  }

  const config = statusConfig[status] ?? defaultConfig

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  )
}

function LinkMethodBadge({ method }: { method: string }) {
  const defaultConfig = { variant: 'secondary' as const, label: method }
  const methodConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    manual: { variant: 'secondary', label: 'Manual' },
    domain_verified: { variant: 'default', label: 'Domain Verified' },
    sso: { variant: 'default', label: 'SSO' },
    invited: { variant: 'outline', label: 'Invited' },
  }

  const config = methodConfig[method] ?? defaultConfig

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
