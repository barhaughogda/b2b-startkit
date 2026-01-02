---
description: "Defines critical vs safe areas in the StartKit monorepo and how the control plane works."
alwaysApply: true
---

# System Boundaries for AI Assistants

This document defines the boundaries of the B2B StartKit system to help AI assistants understand what can and cannot be modified.

## Safety Levels

### CRITICAL - Requires Human Review
These areas affect security, billing, or data isolation. Changes here must be reviewed carefully:

- `packages/config/src/env.ts` (foundation)
- `packages/database/src/` (RLS + tenant isolation)
- `packages/auth/src/` (Clerk integration + sessions)
- `packages/rbac/src/` (permissions + roles)
- `packages/billing/src/` (Stripe + subscriptions)
- `infra/scripts/` (marked with `@ai-no-modify`)
- `apps/superadmin/src/` (control plane)

### SAFE - Can Be Modified Freely
- UI components (`packages/ui/src/components/`)
- Analytics (`packages/analytics/src/`)
- Product-specific code (`apps/*/src/` excluding protected webhooks)
- Documentation (`docs/`)
- MCP servers (`infra/mcp-servers/src/`)

## Multi-Tenancy Rules

- Every tenant-scoped query must be tenant-scoped.
- Prefer `withTenant()` wrapper.
- Never bypass RLS for user requests.

For the full reference, see:
- `docs/ai-context/system-boundaries.md`
