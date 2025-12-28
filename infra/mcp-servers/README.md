# StartKit MCP Servers

Model Context Protocol (MCP) servers for AI-assisted development of B2B StartKit projects.

These servers provide AI assistants (like Claude in Cursor) with deep knowledge about the codebase structure, database schema, and billing rules - enabling more accurate and context-aware code generation.

## Overview

| Server | Purpose | Key Tools |
|--------|---------|-----------|
| **Repo Knowledge** | Understand package structure and dependencies | `list_packages`, `explain_package`, `find_files`, `get_imports` |
| **Schema Introspection** | Database schema, RLS policies, tenant isolation | `list_tables`, `describe_table`, `show_rls_policies`, `validate_query` |
| **Billing Rules** | Pricing plans, subscription states, billing validation | `list_plans`, `get_billing_states`, `validate_billing_change` |

## Installation

```bash
cd infra/mcp-servers
pnpm install
```

## Configuration

### For Cursor IDE

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "startkit-repo": {
      "command": "node",
      "args": ["/path/to/b2b-startkit/infra/mcp-servers/dist/repo-knowledge-server.js"],
      "cwd": "/path/to/b2b-startkit"
    },
    "startkit-schema": {
      "command": "node", 
      "args": ["/path/to/b2b-startkit/infra/mcp-servers/dist/schema-introspection-server.js"],
      "cwd": "/path/to/b2b-startkit"
    },
    "startkit-billing": {
      "command": "node",
      "args": ["/path/to/b2b-startkit/infra/mcp-servers/dist/billing-rules-server.js"],
      "cwd": "/path/to/b2b-startkit"
    }
  }
}
```

### For Development (with tsx)

```json
{
  "mcpServers": {
    "startkit-repo": {
      "command": "npx",
      "args": ["tsx", "/path/to/b2b-startkit/infra/mcp-servers/src/repo-knowledge-server.ts"],
      "cwd": "/path/to/b2b-startkit"
    }
  }
}
```

## Building

```bash
pnpm build
```

This compiles TypeScript to `dist/` for production use.

## Servers

### 1. Repo Knowledge Server

Helps AI understand the mono-repo structure and package relationships.

**Tools:**

| Tool | Description |
|------|-------------|
| `list_packages` | List all @startkit/* packages with descriptions |
| `explain_package` | Deep dive into a specific package (exports, dependencies, AI context) |
| `find_files` | Search for files by purpose (e.g., "webhook handlers", "RLS policies") |
| `get_imports` | Show what a file depends on |
| `get_package_dependency_graph` | Visualize package dependencies |

**Example usage:**
```
AI: Use explain_package with package="database" to understand tenant isolation
```

### 2. Schema Introspection Server

Provides database schema knowledge and helps validate tenant isolation.

**Tools:**

| Tool | Description |
|------|-------------|
| `list_tables` | List all database tables (can filter by tenant-scoped/global) |
| `describe_table` | Get columns, relations, indexes, and AI context for a table |
| `show_rls_policies` | Show RLS policies that enforce multi-tenancy |
| `validate_query` | Check if a query follows tenant isolation rules |
| `get_schema_patterns` | Get code patterns for SELECT/INSERT/UPDATE/DELETE with proper isolation |

**Example usage:**
```
AI: Use validate_query with query="db.query.projects.findMany()" table="projects" to check tenant isolation
```

### 3. Billing Rules Server

Explains pricing, subscription states, and validates billing changes.

**Tools:**

| Tool | Description |
|------|-------------|
| `list_plans` | Show all pricing plans (summary, detailed, or comparison format) |
| `explain_plan` | Deep dive into a specific plan's features and limits |
| `get_billing_states` | Show subscription state machine and transitions |
| `validate_billing_change` | Check if a plan/seat change is valid |
| `get_billing_code_patterns` | Get code patterns for checkout, cancel, upgrade, etc. |
| `explain_proration` | Understand how proration works for plan changes |

**Example usage:**
```
AI: Use validate_billing_change with currentPlan="starter" targetPlan="free" currentStatus="active" currentSeats=8 to check downgrade validity
```

## How AI Assistants Use These

When you ask Claude (via Cursor) about the codebase, it can use these tools to:

1. **Understand context before writing code:**
   - "What packages should I import for database queries?" → Uses `explain_package`
   - "Where are webhook handlers?" → Uses `find_files`

2. **Write correct, secure code:**
   - Validates tenant isolation with `validate_query`
   - Gets correct patterns with `get_schema_patterns`

3. **Handle billing correctly:**
   - Validates plan changes before implementing
   - Gets correct code patterns for Stripe integration

## Extending

To add new knowledge to these servers:

1. **Add package info:** Edit `PACKAGES` in `repo-knowledge-server.ts`
2. **Add table info:** Edit `TABLES` in `schema-introspection-server.ts`
3. **Add billing rules:** Edit `PLANS`, `STATE_TRANSITIONS`, or `VALIDATION_RULES` in `billing-rules-server.ts`

## Troubleshooting

### Server not responding
- Ensure you've run `pnpm build` (for production) or use tsx for development
- Check the cwd points to the repo root

### Tools not showing
- Restart Cursor after changing `mcp.json`
- Check server logs in Cursor's output panel

### Stale data
- MCP servers read static data embedded in the code
- Rebuild servers after updating package/schema/billing information
