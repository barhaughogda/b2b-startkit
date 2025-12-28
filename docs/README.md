# B2B StartKit Documentation

Welcome to the B2B StartKit documentation. This is your guide to building and scaling B2B SaaS products.

## Quick Links

- [Getting Started](./guides/getting-started.md)
- [Creating a New Product](./guides/creating-new-product.md)
- [Architecture Overview](./guides/architecture.md)
- [Architecture Decision Records](./adr/)

## Package Documentation

| Package | Description |
|---------|-------------|
| [@startkit/auth](../packages/auth/) | Clerk authentication integration |
| [@startkit/billing](../packages/billing/) | Stripe billing and subscriptions |
| [@startkit/database](../packages/database/) | Drizzle ORM and Supabase |
| [@startkit/rbac](../packages/rbac/) | Role-based access control |
| [@startkit/ui](../packages/ui/) | shadcn-based UI components |
| [@startkit/config](../packages/config/) | Shared types and configuration |

## For AI Assistants

See the [AI Context](./ai-context/) folder for:
- System boundaries and conventions
- "Do not touch" zones
- Development patterns

## Architecture Decision Records

All significant architectural decisions are documented in the [ADR folder](./adr/). Each ADR explains:
- The context and problem
- The decision made
- Consequences and trade-offs
