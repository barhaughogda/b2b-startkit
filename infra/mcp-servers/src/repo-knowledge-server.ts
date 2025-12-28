#!/usr/bin/env node
/**
 * MCP Server: Repo Knowledge Server
 *
 * Provides tools for AI assistants to understand the B2B StartKit codebase structure,
 * package relationships, and how to navigate the mono-repo.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// Package Registry - Metadata about all @startkit/* packages
// ============================================

interface PackageInfo {
  name: string
  path: string
  description: string
  purpose: string
  dependencies: string[]
  exports: string[]
  keyFiles: string[]
  aiContext: string[]
}

const PACKAGES: Record<string, PackageInfo> = {
  config: {
    name: '@startkit/config',
    path: 'packages/config',
    description: 'Shared configuration, environment validation, and type definitions',
    purpose: 'Foundation package - all other packages import from here for env vars and shared types',
    dependencies: [],
    exports: ['env', 'PlanTier', 'PlanConfig', 'SubscriptionStatus', 'UsageMetric', 'ProductConfig'],
    keyFiles: ['src/env.ts', 'src/types.ts', 'src/index.ts'],
    aiContext: [
      'This is the FIRST package to load - it validates env vars on startup',
      'Never import env vars directly from process.env - use `env` from @startkit/config',
      'All plan tiers (free, starter, pro, enterprise) are defined here',
    ],
  },
  database: {
    name: '@startkit/database',
    path: 'packages/database',
    description: 'Database client, schema definitions, and multi-tenant RLS',
    purpose: 'Provides Drizzle ORM setup with Supabase, schema definitions, and tenant isolation via RLS',
    dependencies: ['@startkit/config'],
    exports: [
      'db', 'superadminDb', 'withTenant', 'setTenantContext',
      'users', 'organizations', 'organizationMembers', 'subscriptions',
      'auditLogs', 'featureFlagDefinitions', 'organizationFeatureFlags',
    ],
    keyFiles: [
      'src/client.ts',
      'src/tenant.ts',
      'src/schema/index.ts',
      'src/migrations/sql/0001_enable_rls.sql',
    ],
    aiContext: [
      'CRITICAL: Always use withTenant() wrapper for tenant-scoped queries',
      'superadminDb bypasses RLS - use only for webhooks and admin operations',
      'All tenant tables have organization_id column and RLS policies',
      'RLS helper functions: app.current_org_id(), app.current_user_id(), app.is_superadmin()',
    ],
  },
  auth: {
    name: '@startkit/auth',
    path: 'packages/auth',
    description: 'Authentication via Clerk, session handling, organization switching',
    purpose: 'Wraps Clerk for auth, provides server-side auth guards, and handles impersonation',
    dependencies: ['@startkit/config', '@startkit/database'],
    exports: [
      'getServerAuth', 'requireAuth', 'requireOrganization', 'requireRole',
      'useAuth', 'useOrganization', 'ImpersonationBanner',
    ],
    keyFiles: [
      'src/server.ts',
      'src/client.ts',
      'src/webhooks.ts',
      'src/hooks/use-auth.ts',
      'src/hooks/use-organization.ts',
    ],
    aiContext: [
      'Clerk is the source of truth for user identity',
      'Users and orgs are synced to our DB via webhooks',
      'Impersonation has 1-hour timeout and audit logging',
      'Use requireAuth() in server actions, useAuth() in client components',
    ],
  },
  rbac: {
    name: '@startkit/rbac',
    path: 'packages/rbac',
    description: 'Role-based access control and feature flags',
    purpose: 'Permission checking with can()/authorize(), role hierarchy, and feature flag system',
    dependencies: ['@startkit/config', '@startkit/database'],
    exports: [
      'can', 'authorize', 'getRolePermissions', 'hasFeature',
      'Role', 'Permission', 'Resource', 'FeatureFlag',
    ],
    keyFiles: [
      'src/permissions.ts',
      'src/roles.ts',
      'src/flags.ts',
      'src/feature-flags-db.ts',
    ],
    aiContext: [
      'Always check permissions before mutations: if (!can(user, "create", "project")) throw',
      'Role hierarchy: owner > admin > member > viewer',
      'Feature flags can be plan-based (pro features) or per-org overrides',
      'Use FeatureFlag component to wrap UI that requires specific flags',
    ],
  },
  billing: {
    name: '@startkit/billing',
    path: 'packages/billing',
    description: 'Stripe integration for subscriptions and usage-based billing',
    purpose: 'Checkout sessions, subscription management, usage tracking, and webhook handling',
    dependencies: ['@startkit/config', '@startkit/database'],
    exports: [
      'createCheckoutSession', 'createBillingPortalSession', 'getSubscription',
      'cancelSubscription', 'resumeSubscription', 'changeSubscription',
      'trackUsage', 'getUsage', 'defaultPlans', 'getPlanConfig',
    ],
    keyFiles: [
      'src/subscriptions.ts',
      'src/pricing.ts',
      'src/usage.ts',
      'src/webhooks.ts',
    ],
    aiContext: [
      'Stripe is the source of truth for subscription state',
      'Our DB caches subscription data - webhook updates sync it',
      'Usage tracking uses in-memory cache, synced hourly to DB',
      'Plan tiers: free (0), starter ($29), pro ($99), enterprise ($299)',
    ],
  },
  analytics: {
    name: '@startkit/analytics',
    path: 'packages/analytics',
    description: 'PostHog integration for product analytics',
    purpose: 'Event tracking, user identification, and analytics hooks',
    dependencies: ['@startkit/config'],
    exports: [
      'track', 'identify', 'setOrganization', 'AnalyticsProvider', 'useAnalytics',
    ],
    keyFiles: [
      'src/client.ts',
      'src/server.ts',
      'src/events.ts',
      'src/hooks/use-analytics.ts',
      'src/provider.tsx',
    ],
    aiContext: [
      'Use AnalyticsProvider at the app root',
      'Call identify() after sign-in, setOrganization() on org switch',
      'Track key events: auth, billing, feature usage',
      'Server-side tracking for webhooks, client-side for UI events',
    ],
  },
  ui: {
    name: '@startkit/ui',
    path: 'packages/ui',
    description: 'React component library based on shadcn/ui',
    purpose: 'Reusable UI components, layout patterns, and form utilities',
    dependencies: [],
    exports: [
      'Button', 'Card', 'Dialog', 'Input', 'Select', 'Table', 'DataTable',
      'Sidebar', 'Header', 'PageHeader', 'EmptyState', 'StatCard',
      'Form', 'FormField', 'FeatureFlag',
    ],
    keyFiles: [
      'src/index.ts',
      'src/components/',
      'src/layouts/',
      'src/lib/utils.ts',
    ],
    aiContext: [
      'Always check @startkit/ui before creating new components',
      'Follow shadcn patterns for new primitives',
      'Product-specific components go in apps/[product]/src/components/',
      'Use cn() from lib/utils for conditional classes',
    ],
  },
}

// ============================================
// File Finder Utilities
// ============================================

function findFilesWithPattern(
  dir: string,
  pattern: RegExp,
  maxDepth: number = 5
): string[] {
  const results: string[] = []
  const rootDir = findRepoRoot()

  function walk(currentDir: string, depth: number) {
    if (depth > maxDepth) return

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

        const fullPath = path.join(currentDir, entry.name)
        const relativePath = path.relative(rootDir, fullPath)

        if (entry.isDirectory()) {
          walk(fullPath, depth + 1)
        } else if (pattern.test(entry.name)) {
          results.push(relativePath)
        }
      }
    } catch (e) {
      // Ignore permission errors
    }
  }

  walk(path.join(rootDir, dir), 0)
  return results
}

function findRepoRoot(): string {
  // Look for the repo root by finding package.json with workspaces
  let current = process.cwd()
  while (current !== '/') {
    const pkgPath = path.join(current, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === 'b2b-startkit') {
          return current
        }
      } catch { }
    }
    current = path.dirname(current)
  }
  // Fallback to cwd
  return process.cwd()
}

function getImportsFromFile(filePath: string): string[] {
  const rootDir = findRepoRoot()
  const fullPath = path.join(rootDir, filePath)

  if (!fs.existsSync(fullPath)) {
    return []
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const imports: string[] = []

  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]+\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

// ============================================
// MCP Server Implementation
// ============================================

const server = new Server(
  {
    name: 'startkit-repo-knowledge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_packages',
        description: 'List all @startkit/* packages with their descriptions and purposes. Use this to understand the mono-repo structure.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'explain_package',
        description: 'Get detailed information about a specific @startkit/* package including its exports, dependencies, key files, and AI context.',
        inputSchema: {
          type: 'object',
          properties: {
            package: {
              type: 'string',
              description: 'Package name (e.g., "database", "auth", "billing") - without the @startkit/ prefix',
              enum: Object.keys(PACKAGES),
            },
          },
          required: ['package'],
        },
      },
      {
        name: 'find_files',
        description: 'Search for files by purpose or pattern. Helps locate where specific functionality is implemented.',
        inputSchema: {
          type: 'object',
          properties: {
            purpose: {
              type: 'string',
              description: 'What are you looking for? Examples: "webhook handlers", "RLS policies", "authentication", "database schemas"',
            },
            directory: {
              type: 'string',
              description: 'Directory to search in (e.g., "packages/auth", "apps/web-template"). Defaults to entire repo.',
            },
            pattern: {
              type: 'string',
              description: 'Optional file name pattern (regex). E.g., "webhook", ".sql", "schema"',
            },
          },
          required: ['purpose'],
        },
      },
      {
        name: 'get_imports',
        description: 'Show what a file imports and depends on. Useful for understanding module relationships.',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'File path relative to repo root (e.g., "packages/billing/src/subscriptions.ts")',
            },
          },
          required: ['file'],
        },
      },
      {
        name: 'get_package_dependency_graph',
        description: 'Show the dependency graph between @startkit/* packages. Helps understand build order and import paths.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'list_packages': {
      const packageList = Object.values(PACKAGES).map(pkg => ({
        name: pkg.name,
        path: pkg.path,
        description: pkg.description,
        purpose: pkg.purpose,
      }))

      return {
        content: [
          {
            type: 'text',
            text: `# @startkit/* Packages\n\n${packageList.map(pkg =>
              `## ${pkg.name}\n**Path:** ${pkg.path}\n**Description:** ${pkg.description}\n**Purpose:** ${pkg.purpose}`
            ).join('\n\n')}`,
          },
        ],
      }
    }

    case 'explain_package': {
      const packageName = (args as { package: string }).package
      const pkg = PACKAGES[packageName]

      if (!pkg) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown package: ${packageName}. Available packages: ${Object.keys(PACKAGES).join(', ')}`,
            },
          ],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `# ${pkg.name}

**Path:** \`${pkg.path}\`
**Description:** ${pkg.description}
**Purpose:** ${pkg.purpose}

## Dependencies
${pkg.dependencies.length ? pkg.dependencies.map(d => `- @startkit/${d}`).join('\n') : '- None (foundation package)'}

## Key Exports
\`\`\`typescript
import { ${pkg.exports.slice(0, 5).join(', ')}${pkg.exports.length > 5 ? ', ...' : ''} } from '${pkg.name}'
\`\`\`

All exports: ${pkg.exports.join(', ')}

## Key Files
${pkg.keyFiles.map(f => `- \`${pkg.path}/${f}\``).join('\n')}

## AI Context (Important!)
${pkg.aiContext.map(ctx => `⚠️ ${ctx}`).join('\n')}`,
          },
        ],
      }
    }

    case 'find_files': {
      const { purpose, directory, pattern } = args as {
        purpose: string
        directory?: string
        pattern?: string
      }

      // Map purposes to likely file patterns and locations
      const purposeMap: Record<string, { dirs: string[]; patterns: RegExp[] }> = {
        webhook: {
          dirs: ['packages/auth', 'packages/billing', 'apps/web-template/src/app/api'],
          patterns: [/webhook/i],
        },
        authentication: {
          dirs: ['packages/auth/src'],
          patterns: [/auth|middleware|session/i],
        },
        'database schemas': {
          dirs: ['packages/database/src/schema'],
          patterns: [/.ts$/],
        },
        'rls policies': {
          dirs: ['packages/database/src/migrations'],
          patterns: [/.sql$/],
        },
        billing: {
          dirs: ['packages/billing/src', 'apps/web-template/src/app/(app)/billing'],
          patterns: [/billing|subscription|stripe|checkout/i],
        },
        permissions: {
          dirs: ['packages/rbac/src'],
          patterns: [/permission|role|can/i],
        },
        components: {
          dirs: ['packages/ui/src/components', 'packages/ui/src/layouts'],
          patterns: [/.tsx$/],
        },
      }

      // Find matching files
      let searchDirs = directory ? [directory] : ['packages', 'apps']
      let searchPatterns = pattern ? [new RegExp(pattern)] : []

      // Augment with purpose-based search
      const purposeLower = purpose.toLowerCase()
      for (const [key, config] of Object.entries(purposeMap)) {
        if (purposeLower.includes(key)) {
          if (!directory) searchDirs = config.dirs
          searchPatterns = [...searchPatterns, ...config.patterns]
        }
      }

      if (searchPatterns.length === 0) {
        searchPatterns = [/.ts$|.tsx$/]
      }

      const files: string[] = []
      for (const dir of searchDirs) {
        for (const pat of searchPatterns) {
          files.push(...findFilesWithPattern(dir, pat))
        }
      }

      const uniqueFiles = [...new Set(files)].slice(0, 20)

      return {
        content: [
          {
            type: 'text',
            text: `# Files for: "${purpose}"

Found ${uniqueFiles.length} matching files:

${uniqueFiles.map(f => `- \`${f}\``).join('\n')}

${uniqueFiles.length === 20 ? '\n*(Results limited to 20 files)*' : ''}`,
          },
        ],
      }
    }

    case 'get_imports': {
      const { file } = args as { file: string }
      const imports = getImportsFromFile(file)

      const startkitImports = imports.filter(i => i.startsWith('@startkit/'))
      const externalImports = imports.filter(i => !i.startsWith('.') && !i.startsWith('@startkit/'))
      const localImports = imports.filter(i => i.startsWith('.'))

      return {
        content: [
          {
            type: 'text',
            text: `# Imports in ${file}

## @startkit/* packages
${startkitImports.length ? startkitImports.map(i => `- ${i}`).join('\n') : '- None'}

## External dependencies
${externalImports.length ? externalImports.map(i => `- ${i}`).join('\n') : '- None'}

## Local imports
${localImports.length ? localImports.map(i => `- ${i}`).join('\n') : '- None'}`,
          },
        ],
      }
    }

    case 'get_package_dependency_graph': {
      const graph = Object.entries(PACKAGES).map(([name, pkg]) => ({
        name: pkg.name,
        dependsOn: pkg.dependencies.map(d => `@startkit/${d}`),
      }))

      // Build a simple text visualization
      const lines: string[] = ['# Package Dependency Graph', '']

      // Show in dependency order (topologically sorted-ish)
      const order = ['config', 'database', 'auth', 'rbac', 'billing', 'analytics', 'ui']
      for (const pkgName of order) {
        const pkg = PACKAGES[pkgName]
        const deps = pkg.dependencies.length
          ? ` → depends on: ${pkg.dependencies.map(d => `@startkit/${d}`).join(', ')}`
          : ' (no @startkit dependencies)'
        lines.push(`${pkg.name}${deps}`)
      }

      lines.push('')
      lines.push('## Build Order (recommended)')
      lines.push('1. @startkit/config')
      lines.push('2. @startkit/database')
      lines.push('3. @startkit/auth, @startkit/rbac (can parallelize)')
      lines.push('4. @startkit/billing')
      lines.push('5. @startkit/analytics, @startkit/ui (can parallelize)')

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('StartKit Repo Knowledge MCP Server running')
}

main().catch(console.error)
