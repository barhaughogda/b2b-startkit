---
description: "Protected areas that require explicit human approval before modification."
alwaysApply: true
---

# DO NOT TOUCH Zones

AI assistants must not modify protected areas without explicit human approval.

## Protected patterns
- Any file containing `@ai-no-modify`

## Protected files/directories (non-exhaustive)
- `packages/config/src/env.ts`
- `packages/database/src/migrations/sql/0001_enable_rls.sql`
- `packages/database/src/tenant.ts`
- `packages/auth/src/server.ts`
- `packages/auth/src/webhooks.ts`
- `packages/auth/src/middleware.ts`
- `packages/rbac/src/permissions.ts`
- `packages/rbac/src/roles.ts`
- `packages/billing/src/webhooks.ts`
- `packages/billing/src/subscriptions.ts`
- `packages/billing/src/stripe.ts`
- `apps/superadmin/src/lib/event-signature.ts`
- `apps/superadmin/src/app/api/control-plane/events/route.ts`
- `infra/scripts/*`

When a change is needed:
- Explain why
- Show current code + proposed change
- Call out security implications
- Wait for explicit approval

Full list: `docs/ai-context/do-not-touch.md`
