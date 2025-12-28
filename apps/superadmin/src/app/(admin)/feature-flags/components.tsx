'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@startkit/ui'
import { Flag, Check, X, Building2, ExternalLink, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { FeatureFlagItem, FeatureFlagSummary } from './data'

interface FeatureFlagsContentProps {
  summaries: FeatureFlagSummary[]
  flags: FeatureFlagItem[]
  availableKeys: string[]
}

export function FeatureFlagsContent({
  summaries,
  flags,
  availableKeys,
}: FeatureFlagsContentProps) {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableKeys.length}</div>
            <p className="text-xs text-muted-foreground">Available feature flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
            <Check className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.length}</div>
            <p className="text-xs text-muted-foreground">Organization-specific flags</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <Flag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flags.filter((f) => f.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently enabled flags</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary by Flag</TabsTrigger>
          <TabsTrigger value="all">All Configurations</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flag Summary</CardTitle>
              <CardDescription>
                Overview of each flag and how many organizations have it enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {availableKeys.map((key) => {
                  const summary = summaries.find((s) => s.key === key)
                  return (
                    <FlagSummaryRow
                      key={key}
                      flagKey={key}
                      enabledCount={summary?.enabledCount || 0}
                      totalOrgs={summary?.totalOrgs || 0}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Configurations Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                All Flag Configurations
              </CardTitle>
              <CardDescription>
                Individual feature flag settings per organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {flags.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No feature flags configured yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Flags are set per organization from their detail page
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Flag</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flags.map((flag) => (
                        <TableRow key={flag.id}>
                          <TableCell>
                            <code className="text-sm bg-secondary px-2 py-1 rounded">
                              {flag.key}
                            </code>
                          </TableCell>
                          <TableCell>
                            {flag.organizationName ? (
                              <Link
                                href={`/organizations/${flag.organizationId}`}
                                className="flex items-center gap-2 hover:text-primary transition-colors"
                              >
                                <Building2 className="h-4 w-4" />
                                {flag.organizationName}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Global</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {flag.isEnabled ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <X className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(flag.updatedAt, { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {flag.organizationId && (
                              <Link href={`/organizations/${flag.organizationId}`}>
                                <Button variant="ghost" size="sm">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-4 py-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Managing Feature Flags</p>
            <p className="mt-1">
              Feature flags can be toggled per organization from their detail page.
              Flags follow a hierarchical system where plan-level defaults can be
              overridden per organization.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface FlagSummaryRowProps {
  flagKey: string
  enabledCount: number
  totalOrgs: number
}

function FlagSummaryRow({ flagKey, enabledCount, totalOrgs }: FlagSummaryRowProps) {
  const percentage = totalOrgs > 0 ? (enabledCount / totalOrgs) * 100 : 0

  const flagDescriptions: Record<string, string> = {
    beta_features: 'Access to beta features before general release',
    advanced_analytics: 'Enhanced analytics and reporting dashboards',
    custom_branding: 'Custom branding and white-label options',
    api_access: 'Full API access for integrations',
    sso_enabled: 'Single sign-on integration (SAML/OIDC)',
    audit_logs: 'Detailed audit logging and compliance reports',
    priority_support: 'Priority customer support queue',
    custom_domains: 'Custom domain configuration for the app',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <code className="text-sm font-medium bg-secondary px-2 py-1 rounded">
            {flagKey}
          </code>
          <p className="text-sm text-muted-foreground mt-1">
            {flagDescriptions[flagKey] || 'Custom feature flag'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-medium">
            {enabledCount}
            <span className="text-muted-foreground text-sm">/{totalOrgs}</span>
          </span>
          <p className="text-xs text-muted-foreground">organizations</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
