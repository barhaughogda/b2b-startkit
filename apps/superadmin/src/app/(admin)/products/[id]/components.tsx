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
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@startkit/ui'
import {
  ArrowLeft,
  Package,
  Globe,
  Key,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Building2,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { ProductDetail, ProductKeyItem } from '../data'

interface ProductDetailContentProps {
  product: ProductDetail
}

export function ProductDetailContent({ product }: ProductDetailContentProps) {
  const router = useRouter()
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{product.displayName}</h1>
              <EnvBadge env={product.env} />
              <StatusBadge status={product.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <span className="text-sm">{product.name}</span>
              <a
                href={product.baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Globe className="h-3 w-3" />
                {product.baseUrl}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{product.activeKeyCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Linked Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{product.orgCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-lg font-medium">
                {formatDistanceToNow(product.createdAt, { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{product.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Signing Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Signing Keys
            </CardTitle>
            <CardDescription>
              Keys for authenticating server-to-server requests
            </CardDescription>
          </div>
          <CreateKeyDialog
            productId={product.id}
            open={showCreateKeyDialog}
            onOpenChange={setShowCreateKeyDialog}
            onCreated={() => router.refresh()}
          />
        </CardHeader>
        <CardContent>
          {product.keys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No signing keys</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a key to enable secure communication
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateKeyDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Key
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key ID</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.keys.map((key) => (
                    <KeyRow key={key.id} productKey={key} productId={product.id} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function KeyRow({ productKey, productId }: { productKey: ProductKeyItem; productId: string }) {
  const router = useRouter()
  const [isRevoking, setIsRevoking] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)

  const isExpired = productKey.expiresAt && new Date(productKey.expiresAt) < new Date()
  const isRevoked = !!productKey.revokedAt
  const isInactive = !productKey.isActive || isRevoked || isExpired

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      const response = await fetch(`/api/admin/products/${productId}/keys/${productKey.id}/revoke`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to revoke key')
      }
      setShowRevokeDialog(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to revoke key:', error)
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <TableRow className={isInactive ? 'opacity-50' : ''}>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">{productKey.kid}</code>
      </TableCell>
      <TableCell>{productKey.label || '—'}</TableCell>
      <TableCell>
        {isRevoked ? (
          <Badge variant="destructive">Revoked</Badge>
        ) : isExpired ? (
          <Badge variant="destructive">Expired</Badge>
        ) : productKey.isActive ? (
          <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDistanceToNow(productKey.createdAt, { addSuffix: true })}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {productKey.lastUsedAt
          ? formatDistanceToNow(productKey.lastUsedAt, { addSuffix: true })
          : 'Never'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {productKey.expiresAt ? format(productKey.expiresAt, 'PP') : 'Never'}
      </TableCell>
      <TableCell>
        {!isInactive && (
          <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revoke Signing Key</DialogTitle>
                <DialogDescription>
                  Are you sure you want to revoke this key? This action cannot be undone.
                  Any requests using this key will fail.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium">Key ID</p>
                  <code className="text-xs">{productKey.kid}</code>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRevoke} disabled={isRevoking}>
                  {isRevoking ? 'Revoking...' : 'Revoke Key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </TableCell>
    </TableRow>
  )
}

interface CreateKeyDialogProps {
  productId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateKeyDialog({ productId, open, onOpenChange, onCreated }: CreateKeyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<{ kid: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      label: formData.get('label') as string,
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create key')
      }

      const result = await response.json()
      setCreatedKey({ kid: result.key.kid, secret: result.secret })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setCreatedKey(null)
    setCopied(false)
    setError(null)
    onOpenChange(false)
    if (createdKey) {
      onCreated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                Key Created Successfully
              </DialogTitle>
              <DialogDescription>
                Copy the secret now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  This is the only time you will see this secret. Copy it now and store it securely.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Key ID</Label>
                <code className="block bg-muted p-3 rounded-md text-sm">{createdKey.kid}</code>
              </div>

              <div className="space-y-2">
                <Label>Secret</Label>
                <div className="relative">
                  <code className="block bg-muted p-3 pr-12 rounded-md text-sm break-all font-mono">
                    {createdKey.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                I have copied the secret
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Signing Key</DialogTitle>
              <DialogDescription>
                Generate a new signing key for server-to-server authentication.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="e.g., Production Key"
                />
                <p className="text-xs text-muted-foreground">
                  A human-readable name to identify this key
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Key'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
