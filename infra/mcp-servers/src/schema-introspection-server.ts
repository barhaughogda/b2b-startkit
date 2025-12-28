#!/usr/bin/env node
/**
 * MCP Server: Schema Introspection Server
 *
 * Provides tools for AI assistants to understand the database schema,
 * RLS policies, and tenant isolation patterns in B2B StartKit.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// ============================================
// Schema Registry - Comprehensive schema information
// ============================================

interface Column {
  name: string
  type: string
  nullable: boolean
  default?: string
  description: string
}

interface Relation {
  name: string
  type: 'one-to-many' | 'many-to-one' | 'one-to-one'
  targetTable: string
  foreignKey: string
  description: string
}

interface Index {
  name: string
  columns: string[]
  unique: boolean
}

interface TableInfo {
  name: string
  description: string
  tenantScoped: boolean
  aiContext: string[]
  columns: Column[]
  relations: Relation[]
  indexes: Index[]
}

const TABLES: Record<string, TableInfo> = {
  users: {
    name: 'users',
    description: 'User accounts synced from Clerk',
    tenantScoped: false,
    aiContext: [
      'Users exist independently of organizations',
      'A user can belong to multiple organizations',
      'clerkId is the source of truth for identity',
      'isSuperadmin flag grants global admin access',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'clerk_id', type: 'text', nullable: false, description: 'Unique Clerk user ID' },
      { name: 'email', type: 'text', nullable: false, description: 'User email address' },
      { name: 'name', type: 'text', nullable: true, description: 'Display name' },
      { name: 'avatar_url', type: 'text', nullable: true, description: 'Profile picture URL' },
      { name: 'is_superadmin', type: 'boolean', nullable: false, default: 'false', description: 'Global admin flag' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [],
    indexes: [
      { name: 'users_clerk_id_idx', columns: ['clerk_id'], unique: true },
      { name: 'users_email_idx', columns: ['email'], unique: false },
    ],
  },
  organizations: {
    name: 'organizations',
    description: 'Tenant organizations synced from Clerk',
    tenantScoped: false,
    aiContext: [
      'This is the PRIMARY tenant identifier',
      'All tenant-scoped tables reference organization_id',
      'Synced from Clerk via webhooks',
      'Settings stored as JSONB for flexibility',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key - used as organization_id in other tables' },
      { name: 'clerk_org_id', type: 'text', nullable: false, description: 'Unique Clerk organization ID' },
      { name: 'name', type: 'text', nullable: false, description: 'Organization name' },
      { name: 'slug', type: 'text', nullable: false, description: 'URL-friendly slug' },
      { name: 'settings', type: 'jsonb', nullable: true, default: '{}', description: 'Organization settings (timezone, locale, etc.)' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [
      { name: 'members', type: 'one-to-many', targetTable: 'organization_members', foreignKey: 'organization_id', description: 'Organization members' },
      { name: 'subscription', type: 'one-to-one', targetTable: 'subscriptions', foreignKey: 'organization_id', description: 'Billing subscription' },
    ],
    indexes: [
      { name: 'organizations_clerk_org_id_idx', columns: ['clerk_org_id'], unique: true },
      { name: 'organizations_slug_idx', columns: ['slug'], unique: true },
    ],
  },
  organization_members: {
    name: 'organization_members',
    description: 'Junction table linking users to organizations with roles',
    tenantScoped: true,
    aiContext: [
      'Links users to organizations',
      'Role can be: owner, admin, member',
      'customPermissions allows per-user overrides',
      'Synced from Clerk via webhooks',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'organization_id', type: 'uuid', nullable: false, description: 'FK to organizations.id' },
      { name: 'user_id', type: 'uuid', nullable: false, description: 'FK to users.id' },
      { name: 'role', type: 'organization_role', nullable: false, default: 'member', description: 'Role: owner, admin, member' },
      { name: 'custom_permissions', type: 'jsonb', nullable: true, default: '[]', description: 'Custom permission overrides (string array)' },
      { name: 'joined_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'When user joined org' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [
      { name: 'organization', type: 'many-to-one', targetTable: 'organizations', foreignKey: 'organization_id', description: 'Parent organization' },
      { name: 'user', type: 'many-to-one', targetTable: 'users', foreignKey: 'user_id', description: 'Member user' },
    ],
    indexes: [
      { name: 'org_members_org_id_idx', columns: ['organization_id'], unique: false },
      { name: 'org_members_user_id_idx', columns: ['user_id'], unique: false },
    ],
  },
  subscriptions: {
    name: 'subscriptions',
    description: 'Stripe subscription data cached for quick access',
    tenantScoped: true,
    aiContext: [
      'One subscription per organization',
      'Stripe is the source of truth - this is a cache',
      'Updated via Stripe webhooks',
      'Status aligned with Stripe statuses',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'organization_id', type: 'uuid', nullable: false, description: 'FK to organizations.id (unique)' },
      { name: 'stripe_customer_id', type: 'text', nullable: false, description: 'Stripe customer ID' },
      { name: 'stripe_subscription_id', type: 'text', nullable: true, description: 'Stripe subscription ID (null for free tier)' },
      { name: 'stripe_price_id', type: 'text', nullable: true, description: 'Current Stripe price ID' },
      { name: 'status', type: 'subscription_status', nullable: false, default: 'trialing', description: 'trialing, active, past_due, canceled, etc.' },
      { name: 'plan', type: 'plan_tier', nullable: false, default: 'free', description: 'free, starter, pro, enterprise' },
      { name: 'current_period_start', type: 'timestamptz', nullable: true, description: 'Billing period start' },
      { name: 'current_period_end', type: 'timestamptz', nullable: true, description: 'Billing period end' },
      { name: 'cancel_at_period_end', type: 'timestamptz', nullable: true, description: 'Scheduled cancellation date' },
      { name: 'canceled_at', type: 'timestamptz', nullable: true, description: 'When subscription was canceled' },
      { name: 'usage_limits', type: 'jsonb', nullable: true, default: '{}', description: 'Plan limits (apiCallsPerMonth, storageGb, etc.)' },
      { name: 'seat_count', type: 'integer', nullable: false, default: '1', description: 'Current seat count' },
      { name: 'max_seats', type: 'integer', nullable: true, description: 'Maximum seats allowed by plan' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [
      { name: 'organization', type: 'one-to-one', targetTable: 'organizations', foreignKey: 'organization_id', description: 'Owning organization' },
    ],
    indexes: [
      { name: 'subscriptions_org_id_idx', columns: ['organization_id'], unique: true },
      { name: 'subscriptions_stripe_customer_idx', columns: ['stripe_customer_id'], unique: true },
      { name: 'subscriptions_stripe_sub_idx', columns: ['stripe_subscription_id'], unique: true },
    ],
  },
  audit_logs: {
    name: 'audit_logs',
    description: 'Immutable audit log for compliance and security',
    tenantScoped: true,
    aiContext: [
      'NEVER delete or modify audit logs',
      'Denormalizes user_email for when user is deleted',
      'Tracks who, what, when for all actions',
      'Required for B2B compliance',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'organization_id', type: 'uuid', nullable: true, description: 'FK to organizations.id (set null on delete)' },
      { name: 'user_id', type: 'uuid', nullable: true, description: 'FK to users.id (set null on delete)' },
      { name: 'user_email', type: 'text', nullable: true, description: 'Denormalized email for audit persistence' },
      { name: 'action', type: 'text', nullable: false, description: 'Action type (e.g., user.created, project.deleted)' },
      { name: 'resource_type', type: 'text', nullable: false, description: 'Resource type (e.g., user, project, subscription)' },
      { name: 'resource_id', type: 'text', nullable: true, description: 'ID of affected resource' },
      { name: 'metadata', type: 'jsonb', nullable: true, default: '{}', description: 'Before/after state, reason, etc.' },
      { name: 'ip_address', type: 'inet', nullable: true, description: 'Client IP address' },
      { name: 'user_agent', type: 'text', nullable: true, description: 'Client user agent' },
      { name: 'is_superadmin_action', type: 'timestamptz', nullable: true, description: 'Set if action by superadmin' },
      { name: 'impersonated_user_id', type: 'uuid', nullable: true, description: 'User being impersonated (if any)' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Immutable timestamp' },
    ],
    relations: [
      { name: 'organization', type: 'many-to-one', targetTable: 'organizations', foreignKey: 'organization_id', description: 'Parent organization' },
      { name: 'user', type: 'many-to-one', targetTable: 'users', foreignKey: 'user_id', description: 'Actor user' },
    ],
    indexes: [
      { name: 'audit_logs_org_id_idx', columns: ['organization_id'], unique: false },
      { name: 'audit_logs_user_id_idx', columns: ['user_id'], unique: false },
      { name: 'audit_logs_action_idx', columns: ['action'], unique: false },
      { name: 'audit_logs_resource_idx', columns: ['resource_type', 'resource_id'], unique: false },
      { name: 'audit_logs_created_at_idx', columns: ['created_at'], unique: false },
    ],
  },
  feature_flag_definitions: {
    name: 'feature_flag_definitions',
    description: 'Global feature flag definitions (not tenant-scoped)',
    tenantScoped: false,
    aiContext: [
      'Master list of all available feature flags',
      'defaultEnabled is the baseline for all orgs',
      'minimumPlan restricts flag to certain tiers',
      'Readable by all authenticated users',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'key', type: 'text', nullable: false, description: 'Unique flag key (e.g., ai_assistant)' },
      { name: 'name', type: 'text', nullable: false, description: 'Human-readable name' },
      { name: 'description', type: 'text', nullable: true, description: 'What this flag controls' },
      { name: 'default_enabled', type: 'boolean', nullable: false, default: 'false', description: 'Default state for all orgs' },
      { name: 'minimum_plan', type: 'text', nullable: true, description: 'Minimum plan to enable (null = all)' },
      { name: 'category', type: 'text', nullable: true, description: 'Grouping (billing, features, beta)' },
      { name: 'metadata', type: 'jsonb', nullable: true, default: '{}', description: 'Additional configuration' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [],
    indexes: [
      { name: 'feature_flag_defs_key_idx', columns: ['key'], unique: true },
    ],
  },
  organization_feature_flags: {
    name: 'organization_feature_flags',
    description: 'Per-organization feature flag overrides',
    tenantScoped: true,
    aiContext: [
      'Overrides default flag state for specific orgs',
      'If no override exists, default from definitions is used',
      'Supports gradual rollout via conditions',
      'Tracks who set the override and why',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'organization_id', type: 'uuid', nullable: false, description: 'FK to organizations.id' },
      { name: 'flag_key', type: 'text', nullable: false, description: 'References feature_flag_definitions.key' },
      { name: 'enabled', type: 'boolean', nullable: false, description: 'Override enabled state' },
      { name: 'conditions', type: 'jsonb', nullable: true, default: '{}', description: 'Rollout conditions (percentage, userIds, roles)' },
      { name: 'set_by', type: 'text', nullable: true, description: 'Who set this override (user ID or "system")' },
      { name: 'reason', type: 'text', nullable: true, description: 'Why this override was set' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
      { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Last update timestamp' },
    ],
    relations: [
      { name: 'organization', type: 'many-to-one', targetTable: 'organizations', foreignKey: 'organization_id', description: 'Owning organization' },
    ],
    indexes: [
      { name: 'org_feature_flags_org_idx', columns: ['organization_id'], unique: false },
      { name: 'org_feature_flags_key_idx', columns: ['flag_key'], unique: false },
      { name: 'org_feature_flags_unique', columns: ['organization_id', 'flag_key'], unique: true },
    ],
  },
  usage_records: {
    name: 'usage_records',
    description: 'Usage tracking for metered billing',
    tenantScoped: true,
    aiContext: [
      'Tracks usage for metered/usage-based billing',
      'Aggregated and reported to Stripe',
      'Usage records are immutable after creation',
      'Metrics: api_calls, tokens, storage_gb, etc.',
    ],
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default: 'random', description: 'Primary key' },
      { name: 'organization_id', type: 'uuid', nullable: false, description: 'FK to organizations.id' },
      { name: 'metric', type: 'text', nullable: false, description: 'Metric name (api_calls, tokens, storage_gb)' },
      { name: 'value', type: 'integer', nullable: false, description: 'Usage value' },
      { name: 'period_start', type: 'timestamptz', nullable: false, description: 'Usage period start' },
      { name: 'period_end', type: 'timestamptz', nullable: false, description: 'Usage period end' },
      { name: 'reported_to_stripe', type: 'timestamptz', nullable: true, description: 'When reported to Stripe' },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', description: 'Created timestamp' },
    ],
    relations: [
      { name: 'organization', type: 'many-to-one', targetTable: 'organizations', foreignKey: 'organization_id', description: 'Owning organization' },
    ],
    indexes: [
      { name: 'usage_records_org_id_idx', columns: ['organization_id'], unique: false },
      { name: 'usage_records_metric_idx', columns: ['metric'], unique: false },
      { name: 'usage_records_period_idx', columns: ['period_start', 'period_end'], unique: false },
    ],
  },
}

// ============================================
// RLS Policy Information
// ============================================

interface RLSPolicy {
  table: string
  name: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  using?: string
  withCheck?: string
  description: string
}

const RLS_POLICIES: RLSPolicy[] = [
  // Users
  {
    table: 'users',
    name: 'users_select_own',
    operation: 'SELECT',
    using: 'id = app.current_user_id() OR app.is_superadmin()',
    description: 'Users can only read their own record, superadmins can read all',
  },
  {
    table: 'users',
    name: 'users_update_own',
    operation: 'UPDATE',
    using: 'id = app.current_user_id() OR app.is_superadmin()',
    description: 'Users can only update their own record',
  },
  {
    table: 'users',
    name: 'users_insert_superadmin',
    operation: 'INSERT',
    withCheck: 'app.is_superadmin()',
    description: 'Only superadmins can insert users (via webhooks)',
  },
  {
    table: 'users',
    name: 'users_delete_superadmin',
    operation: 'DELETE',
    using: 'app.is_superadmin()',
    description: 'Only superadmins can delete users',
  },

  // Organizations
  {
    table: 'organizations',
    name: 'organizations_select_member',
    operation: 'SELECT',
    using: 'id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id()) OR app.is_superadmin()',
    description: 'Members can read their organization',
  },
  {
    table: 'organizations',
    name: 'organizations_update_admin',
    operation: 'UPDATE',
    using: 'id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id() AND role IN (\'owner\', \'admin\')) OR app.is_superadmin()',
    description: 'Only owners/admins can update organization',
  },

  // Organization Members
  {
    table: 'organization_members',
    name: 'organization_members_select_member',
    operation: 'SELECT',
    using: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id()) OR app.is_superadmin()',
    description: 'Members can read their org\'s members',
  },
  {
    table: 'organization_members',
    name: 'organization_members_insert_admin',
    operation: 'INSERT',
    withCheck: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id() AND role IN (\'owner\', \'admin\')) OR app.is_superadmin()',
    description: 'Only admins can add members',
  },

  // Subscriptions
  {
    table: 'subscriptions',
    name: 'subscriptions_select_admin',
    operation: 'SELECT',
    using: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id() AND role IN (\'owner\', \'admin\')) OR app.is_superadmin()',
    description: 'Only org admins can read subscription data',
  },

  // Audit Logs
  {
    table: 'audit_logs',
    name: 'audit_logs_select_admin',
    operation: 'SELECT',
    using: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id() AND role IN (\'owner\', \'admin\')) OR app.is_superadmin()',
    description: 'Only admins can read audit logs',
  },
  {
    table: 'audit_logs',
    name: 'audit_logs_insert_superadmin',
    operation: 'INSERT',
    withCheck: 'app.is_superadmin()',
    description: 'Only system (superadmin) can insert audit logs',
  },

  // Feature Flags
  {
    table: 'organization_feature_flags',
    name: 'org_feature_flags_select_member',
    operation: 'SELECT',
    using: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id()) OR app.is_superadmin()',
    description: 'Members can read their org\'s feature flags',
  },

  // Usage Records
  {
    table: 'usage_records',
    name: 'usage_records_select_member',
    operation: 'SELECT',
    using: 'organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = app.current_user_id()) OR app.is_superadmin()',
    description: 'Members can read their org\'s usage',
  },
]

// ============================================
// MCP Server Implementation
// ============================================

const server = new Server(
  {
    name: 'startkit-schema-introspection',
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
        name: 'list_tables',
        description: 'List all database tables with their descriptions and tenant-scoping information.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter tables: "all", "tenant-scoped", "global"',
              enum: ['all', 'tenant-scoped', 'global'],
            },
          },
          required: [],
        },
      },
      {
        name: 'describe_table',
        description: 'Get detailed information about a table including columns, relations, indexes, and AI context.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to describe',
              enum: Object.keys(TABLES),
            },
          },
          required: ['table'],
        },
      },
      {
        name: 'show_rls_policies',
        description: 'Show Row-Level Security policies for a table or all tables. These are the security rules that enforce multi-tenancy.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name (optional - shows all if not specified)',
            },
          },
          required: [],
        },
      },
      {
        name: 'validate_query',
        description: 'Check if a query pattern follows tenant isolation rules. Helps catch multi-tenancy security issues.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query or query pattern to validate (can be Drizzle code or SQL)',
            },
            table: {
              type: 'string',
              description: 'Primary table being queried',
            },
          },
          required: ['query', 'table'],
        },
      },
      {
        name: 'get_schema_patterns',
        description: 'Get recommended patterns for common database operations with proper tenant isolation.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'What operation do you want to perform?',
              enum: ['select', 'insert', 'update', 'delete', 'join', 'aggregate'],
            },
            table: {
              type: 'string',
              description: 'Table to operate on',
            },
          },
          required: ['operation'],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'list_tables': {
      const filter = (args as { filter?: string }).filter || 'all'

      let tables = Object.values(TABLES)
      if (filter === 'tenant-scoped') {
        tables = tables.filter(t => t.tenantScoped)
      } else if (filter === 'global') {
        tables = tables.filter(t => !t.tenantScoped)
      }

      const output = tables.map(t => {
        const scope = t.tenantScoped ? '🔒 Tenant-scoped' : '🌐 Global'
        return `**${t.name}** ${scope}\n  ${t.description}`
      }).join('\n\n')

      return {
        content: [
          {
            type: 'text',
            text: `# Database Tables (${filter})\n\n${output}\n\n---\n\n**Legend:**\n- 🔒 Tenant-scoped: Data isolated by organization_id, RLS enforced\n- 🌐 Global: Shared across all tenants`,
          },
        ],
      }
    }

    case 'describe_table': {
      const tableName = (args as { table: string }).table
      const table = TABLES[tableName]

      if (!table) {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown table: ${tableName}. Available tables: ${Object.keys(TABLES).join(', ')}`,
            },
          ],
        }
      }

      const columnsText = table.columns.map(c => {
        const nullable = c.nullable ? 'NULL' : 'NOT NULL'
        const def = c.default ? ` DEFAULT ${c.default}` : ''
        return `| ${c.name} | ${c.type} | ${nullable}${def} | ${c.description} |`
      }).join('\n')

      const relationsText = table.relations.length
        ? table.relations.map(r => `- **${r.name}** (${r.type}) → ${r.targetTable}.${r.foreignKey}: ${r.description}`).join('\n')
        : 'None'

      const indexesText = table.indexes.map(i => {
        const unique = i.unique ? 'UNIQUE ' : ''
        return `- ${unique}${i.name}(${i.columns.join(', ')})`
      }).join('\n')

      return {
        content: [
          {
            type: 'text',
            text: `# Table: ${table.name}

**Description:** ${table.description}
**Tenant-scoped:** ${table.tenantScoped ? 'Yes (has organization_id, RLS enforced)' : 'No (global table)'}

## Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
${columnsText}

## Relations

${relationsText}

## Indexes

${indexesText}

## AI Context

${table.aiContext.map(ctx => `⚠️ ${ctx}`).join('\n')}`,
          },
        ],
      }
    }

    case 'show_rls_policies': {
      const tableName = (args as { table?: string }).table

      let policies = RLS_POLICIES
      if (tableName) {
        policies = policies.filter(p => p.table === tableName)
      }

      if (policies.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: tableName
                ? `No RLS policies found for table: ${tableName}`
                : 'No RLS policies found',
            },
          ],
        }
      }

      // Group by table
      const byTable: Record<string, RLSPolicy[]> = {}
      for (const p of policies) {
        if (!byTable[p.table]) byTable[p.table] = []
        byTable[p.table].push(p)
      }

      const output = Object.entries(byTable).map(([table, tablePolicies]) => {
        const policyText = tablePolicies.map(p => {
          let clause = ''
          if (p.using) clause = `USING: ${p.using}`
          if (p.withCheck) clause = `WITH CHECK: ${p.withCheck}`
          return `- **${p.name}** (${p.operation})\n  ${clause}\n  *${p.description}*`
        }).join('\n\n')

        return `## ${table}\n\n${policyText}`
      }).join('\n\n---\n\n')

      return {
        content: [
          {
            type: 'text',
            text: `# Row-Level Security Policies

${output}

---

## Helper Functions

- \`app.current_org_id()\` - Returns current organization ID from session
- \`app.current_user_id()\` - Returns current user ID from session  
- \`app.is_superadmin()\` - Returns true if current user is superadmin

These must be set via \`setTenantContext()\` before queries.`,
          },
        ],
      }
    }

    case 'validate_query': {
      const { query, table } = args as { query: string; table: string }
      const tableInfo = TABLES[table]

      const issues: string[] = []
      const warnings: string[] = []
      const suggestions: string[] = []

      // Check if table is tenant-scoped
      if (tableInfo?.tenantScoped) {
        // Check for organization_id filter
        if (!query.toLowerCase().includes('organizationid') &&
            !query.toLowerCase().includes('organization_id') &&
            !query.toLowerCase().includes('withtenant')) {
          issues.push('❌ CRITICAL: Query on tenant-scoped table without organization_id filter')
          suggestions.push('Use withTenant() wrapper or add .where(eq(table.organizationId, ctx.organizationId))')
        }

        // Check for superadminDb
        if (query.toLowerCase().includes('superadmindb')) {
          warnings.push('⚠️ Using superadminDb bypasses RLS - ensure this is intentional (webhooks, admin actions)')
        }
      }

      // Check for raw SQL
      if (query.toLowerCase().includes('sql`') || query.toLowerCase().includes('raw')) {
        warnings.push('⚠️ Raw SQL detected - ensure RLS bypass is intentional')
        suggestions.push('Prefer Drizzle ORM methods for automatic RLS enforcement')
      }

      // Check for missing LIMIT on SELECT
      if (query.toLowerCase().includes('select') &&
          query.toLowerCase().includes('findmany') &&
          !query.toLowerCase().includes('limit')) {
        warnings.push('⚠️ No LIMIT on findMany() - consider adding pagination for large datasets')
      }

      const status = issues.length > 0 ? '❌ INVALID' : warnings.length > 0 ? '⚠️ REVIEW' : '✅ OK'

      return {
        content: [
          {
            type: 'text',
            text: `# Query Validation: ${status}

**Table:** ${table}
**Tenant-scoped:** ${tableInfo?.tenantScoped ? 'Yes' : 'No'}

## Issues
${issues.length ? issues.join('\n') : '✅ None'}

## Warnings
${warnings.length ? warnings.join('\n') : '✅ None'}

## Suggestions
${suggestions.length ? suggestions.join('\n') : 'None'}`,
          },
        ],
      }
    }

    case 'get_schema_patterns': {
      const { operation, table } = args as { operation: string; table?: string }
      const tableInfo = table ? TABLES[table] : null
      const isTenantScoped = tableInfo?.tenantScoped ?? true

      const patterns: Record<string, string> = {
        select: isTenantScoped
          ? `// Tenant-scoped SELECT
import { db, withTenant } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

// Option 1: Use withTenant wrapper (recommended)
const results = await withTenant(ctx.organizationId, async () => {
  return db.query.${table || 'tableName'}.findMany({
    where: eq(${table || 'tableName'}.organizationId, ctx.organizationId),
    limit: 50,
  })
})

// Option 2: Direct query with explicit filter
const results = await db.query.${table || 'tableName'}.findMany({
  where: eq(${table || 'tableName'}.organizationId, ctx.organizationId),
})`
          : `// Global table SELECT
import { db } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'

const results = await db.query.${table || 'tableName'}.findMany({
  limit: 50,
})`,

        insert: isTenantScoped
          ? `// Tenant-scoped INSERT
import { db } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'

// ALWAYS include organizationId
await db.insert(${table || 'tableName'}).values({
  organizationId: ctx.organizationId, // REQUIRED
  // ... other fields
})`
          : `// Global table INSERT (usually superadmin only)
import { superadminDb } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'

await superadminDb.insert(${table || 'tableName'}).values({
  // ... fields
})`,

        update: isTenantScoped
          ? `// Tenant-scoped UPDATE
import { db } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

// ALWAYS include organizationId in WHERE
await db.update(${table || 'tableName'})
  .set({ /* fields */ })
  .where(and(
    eq(${table || 'tableName'}.id, resourceId),
    eq(${table || 'tableName'}.organizationId, ctx.organizationId)
  ))`
          : `// Global table UPDATE
import { superadminDb } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

await superadminDb.update(${table || 'tableName'})
  .set({ /* fields */ })
  .where(eq(${table || 'tableName'}.id, resourceId))`,

        delete: isTenantScoped
          ? `// Tenant-scoped DELETE (prefer soft delete)
import { db } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq, and } from 'drizzle-orm'

// ALWAYS include organizationId in WHERE
await db.delete(${table || 'tableName'})
  .where(and(
    eq(${table || 'tableName'}.id, resourceId),
    eq(${table || 'tableName'}.organizationId, ctx.organizationId)
  ))`
          : `// Global table DELETE (superadmin only)
import { superadminDb } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

await superadminDb.delete(${table || 'tableName'})
  .where(eq(${table || 'tableName'}.id, resourceId))`,

        join: `// JOIN with tenant isolation
import { db } from '@startkit/database'
import { ${table || 'projects'}, organizations } from '@startkit/database/schema'
import { eq } from 'drizzle-orm'

// Relations handle JOINs safely
const results = await db.query.${table || 'projects'}.findMany({
  where: eq(${table || 'projects'}.organizationId, ctx.organizationId),
  with: {
    organization: true, // Safe - references already-filtered row
  },
})`,

        aggregate: `// Aggregate with tenant isolation
import { db } from '@startkit/database'
import { ${table || 'tableName'} } from '@startkit/database/schema'
import { eq, sql } from 'drizzle-orm'

const result = await db
  .select({
    count: sql<number>\`count(*)\`,
    // sum: sql<number>\`sum(amount)\`,
  })
  .from(${table || 'tableName'})
  .where(eq(${table || 'tableName'}.organizationId, ctx.organizationId))`,
      }

      return {
        content: [
          {
            type: 'text',
            text: `# Schema Pattern: ${operation.toUpperCase()}

${table ? `**Table:** ${table} (${isTenantScoped ? 'tenant-scoped' : 'global'})` : '**Generic pattern**'}

\`\`\`typescript
${patterns[operation] || 'Unknown operation'}
\`\`\`

## Key Points

${isTenantScoped ? `
- ⚠️ ALWAYS include \`organizationId\` in queries
- Use \`withTenant()\` wrapper for automatic context
- RLS will reject queries without proper tenant context
- Never use \`superadminDb\` for regular user operations
` : `
- This is a global table - no tenant filtering needed
- Most operations require superadmin privileges
- Use \`superadminDb\` for write operations
`}`,
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
  console.error('StartKit Schema Introspection MCP Server running')
}

main().catch(console.error)
