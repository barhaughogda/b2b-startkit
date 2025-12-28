# B2B StartKit

A production-grade B2B SaaS/AaaS mono-repo starter kit for building multiple products.

## Features

- **Authentication**: Clerk-based auth with organizations, SSO-ready
- **Billing**: Stripe subscriptions with per-seat and usage-based pricing
- **Multi-tenancy**: Row-Level Security (RLS) for data isolation
- **RBAC**: Flexible role-based access control with feature flags
- **UI System**: shadcn/ui components with mobile-first responsive design
- **Type Safety**: End-to-end TypeScript with Drizzle ORM
- **AI-Native**: MCP servers and conventions for AI-assisted development

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres) + Drizzle ORM |
| Auth | Clerk |
| Billing | Stripe |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Accounts: Clerk, Supabase, Stripe

### Installation

```bash
# Clone the repository
git clone https://github.com/barhaughogda/b2b-startkit.git
cd b2b-startkit

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web-template/.env.example apps/web-template/.env.local
# Edit .env.local with your credentials

# Start development
pnpm dev
```

### Creating a New Product

```bash
pnpm create:product --name=my-product --display-name="My Product"
```

Then follow the printed instructions to set up external services.

## Project Structure

```
b2b-startkit/
├── apps/
│   ├── web-template/    # Base template for new products
│   └── [products]/      # Your SaaS products
├── packages/
│   ├── auth/            # @startkit/auth - Clerk integration
│   ├── billing/         # @startkit/billing - Stripe integration
│   ├── database/        # @startkit/database - Drizzle + Supabase
│   ├── rbac/            # @startkit/rbac - Permissions
│   ├── ui/              # @startkit/ui - Components
│   └── config/          # @startkit/config - Shared types
├── infra/
│   ├── scripts/         # Automation scripts
│   └── env-templates/   # Environment templates
└── docs/
    ├── adr/             # Architecture Decision Records
    └── ai-context/      # AI assistant context
```

## Documentation

- [Getting Started Guide](./docs/guides/getting-started.md)
- [Creating New Products](./docs/guides/creating-new-product.md)
- [Architecture Overview](./docs/guides/architecture.md)
- [ADRs](./docs/adr/)

## Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages

# Database
pnpm --filter @startkit/database db:generate  # Generate migrations
pnpm --filter @startkit/database db:migrate   # Apply migrations
pnpm --filter @startkit/database db:studio    # Open Drizzle Studio

# Product Management
pnpm create:product --name=my-app --display-name="My App"
```

## Environment Variables

See `infra/env-templates/` for required environment variables.

Key services:
- **Clerk**: Authentication and organizations
- **Supabase**: Database and real-time
- **Stripe**: Subscriptions and billing

## License

MIT
