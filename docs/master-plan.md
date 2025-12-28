# B2B SaaS/AaaS StartKit - Master Plan

> **Document Purpose**: This is the original master plan that guided the development of the B2B StartKit. It captures the vision, architecture decisions, and requirements from the initial planning phase. Use this as a reference for understanding the "why" behind architectural choices.
>
> **Last Updated**: December 28, 2025

---

## Table of Contents

1. [High-Level System Architecture](#part-1-high-level-system-architecture)
2. [Module Breakdown](#part-2-module-breakdown)
3. [Data Model Concepts](#part-3-data-model-concepts)
4. [Auth + Authorization Flow](#part-4-auth--authorization-flow)
5. [Stripe and Billing Lifecycle](#part-5-stripe-and-billing-lifecycle)
6. [Folder and Project Structure](#part-6-folder-and-project-structure)
7. [Mono-repo Strategy](#part-7-mono-repo-strategy)
8. [Golden Path for New Product Creation](#part-8-golden-path-for-new-product-creation)
9. [MCP & AI-First Workflow](#part-9-mcp--ai-first-workflow)
10. [Exit Criteria](#part-10-exit-criteria)
11. [Cross-Check: Built vs Planned](#part-11-cross-check-whats-built-vs-original-plan)

---

## Part 1: High-Level System Architecture

### Stack Decision (Deviation from Original)

| Original Proposal | Adopted Stack |
|-------------------|---------------|
| Next.js + **Convex** + Clerk + Stripe + Vercel | Next.js + **Supabase (Postgres)** + **Drizzle ORM** + Clerk + Stripe + Vercel |

**Rationale for Change** (documented in [ADR-001](./adr/001-database-choice.md)):
- Native Row-Level Security (RLS) for multi-tenancy at database level
- Complex SQL queries for billing, audit logs, and analytics
- AI assistants understand SQL better than proprietary query languages
- Lower vendor lock-in (Postgres is portable)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  Next.js App    │───▶│  @startkit/ui (shadcn components)   │ │
│  │  (App Router)   │    └─────────────────────────────────────┘ │
│  └────────┬────────┘                                            │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Authentication Layer                        │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  @startkit/auth │───▶│  Clerk (External Service)           │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Authorization Layer                         │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  @startkit/rbac │───▶│  Feature Flags                      │ │
│  │  (Permissions)  │    │  (Plan-based + Custom)              │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  Drizzle ORM    │───▶│  Supabase (Postgres)                │ │
│  └─────────────────┘    │  + Row-Level Security (RLS)         │ │
│                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Billing Layer                             │
│  ┌──────────────────┐   ┌─────────────────────────────────────┐ │
│  │ @startkit/billing│──▶│  Stripe (External Service)          │ │
│  └──────────────────┘   └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Module Breakdown

### Core Packages (Required)

| Package | Purpose | Criticality |
|---------|---------|-------------|
| `@startkit/config` | Environment validation, shared types | Foundation |
| `@startkit/database` | Drizzle ORM, RLS, tenant isolation | Critical |
| `@startkit/auth` | Clerk integration, session handling, superadmin | Critical |
| `@startkit/rbac` | Permissions, roles, feature flags | Critical |
| `@startkit/billing` | Stripe subscriptions, usage tracking | Critical |
| `@startkit/ui` | shadcn components, layouts | High |
| `@startkit/analytics` | PostHog integration | Medium |

### Apps

| App | Purpose |
|-----|---------|
| `web-template` | Base template for new products |
| `superadmin` | Internal admin dashboard |
| `[product-*]` | Individual SaaS products (created from template) |

### Package Dependencies

```
@startkit/config (foundation)
  ├─ @startkit/database
  │   ├─ @startkit/auth
  │   ├─ @startkit/rbac
  │   └─ @startkit/billing
  └─ @startkit/ui
      └─ @startkit/analytics
```

---

## Part 3: Data Model Concepts

### Core Entities

```
┌─────────────────────────────────────────────────────────────────┐
│                         User                                     │
│  - id (PK)                                                      │
│  - clerkId (UK)                                                 │
│  - email (UK)                                                   │
│  - isSuperadmin                                                 │
│  - impersonatedBy (FK → User)                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ belongs to (via OrganizationMember)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Organization                                │
│  - id (PK)                                                      │
│  - clerkOrgId (UK)                                              │
│  - name                                                         │
│  - slug (UK)                                                    │
│  - createdAt                                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         │ has one
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Subscription                                │
│  - id (PK)                                                      │
│  - organizationId (FK)                                          │
│  - stripeCustomerId                                             │
│  - stripeSubscriptionId                                         │
│  - status (trialing, active, past_due, canceled)                │
│  - plan (free, pro, enterprise)                                 │
│  - periodEnd                                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   OrganizationMember                             │
│  - userId (FK)                                                  │
│  - organizationId (FK)                                          │
│  - role (owner, admin, member, viewer)                          │
│  - customPermissions (JSON)                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FeatureFlag                                 │
│  - id (PK)                                                      │
│  - organizationId (FK)                                          │
│  - key                                                          │
│  - enabled                                                      │
│  - metadata (JSON)                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       AuditLog                                   │
│  - id (PK)                                                      │
│  - organizationId (FK)                                          │
│  - userId (FK)                                                  │
│  - action                                                       │
│  - resourceType                                                 │
│  - resourceId                                                   │
│  - metadata (JSON)                                              │
│  - createdAt                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Model

Every tenant-scoped table has `organization_id` column with RLS policies:

```sql
-- RLS policy pattern
CREATE POLICY tenant_isolation ON [table]
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

---

## Part 4: Auth + Authorization Flow

### Authentication Flow

```
User                 App              Clerk           Webhook          Database
  │                   │                 │               │                 │
  │──Visit /sign-in──▶│                 │               │                 │
  │                   │──Redirect──────▶│               │                 │
  │──Authenticate────────────────────▶│               │                 │
  │                   │◀──Session───────│               │                 │
  │                   │                 │──user.created─▶│                 │
  │                   │                 │               │──Create record──▶│
  │                   │◀────────────────────────────────│◀────────────────│
  │◀──Authenticated───│                 │               │                 │
```

### Authorization Flow

```
User         API Route        @startkit/auth    @startkit/rbac    Database (RLS)
  │               │                  │                 │                 │
  │──Request─────▶│                  │                 │                 │
  │               │──getServerAuth()─▶│                 │                 │
  │               │◀─user, org, role─│                 │                 │
  │               │──can(ctx, action)────────────────▶│                 │
  │               │◀───────────────────true/false─────│                 │
  │               │                  │                 │                 │
  │               │ [if permitted]   │                 │                 │
  │               │──Query with tenant context────────────────────────▶│
  │               │◀──────────────────────────────────Filtered results──│
  │◀──Response────│                  │                 │                 │
```

### Superadmin Impersonation

```
Superadmin       API            Database         AuditLog
    │              │                │                │
    │──Impersonate─▶│                │                │
    │              │──Verify SA─────▶│                │
    │              │◀───────────────│                │
    │              │──Verify target──▶│                │
    │              │◀─(not SA)──────│                │
    │              │──Set impersonatedBy─▶│           │
    │              │──Log start──────────────────────▶│
    │◀─Session(1hr)─│                │                │
```

---

## Part 5: Stripe and Billing Lifecycle

### Subscription States

```
                    ┌─────────────┐
                    │   Sign up   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
         ┌─────────│    Free     │
         │         └──────┬──────┘
         │                │ Start trial
         │                ▼
         │         ┌─────────────┐
         │         │  Trialing   │─────────┐
         │         └──────┬──────┘         │
         │                │                │ Trial expired
         │    Payment     │                │
         │    successful  ▼                ▼
         │         ┌─────────────┐  ┌─────────────┐
         │         │   Active    │  │  Canceled   │
         │         └──────┬──────┘  └──────▲──────┘
         │                │                │
         │  ┌─────────────┼────────────────┤
         │  │             │                │
         │  │ Payment     │ User           │ Grace period
         │  │ failed      │ cancels        │ expired
         │  │             │                │
         │  ▼             ▼                │
         │  ┌─────────────┐                │
         │  │  Past Due   │────────────────┘
         │  └─────────────┘
         │        │
         │        │ Payment retry success
         │        └───────────────────────▶ Active
         │
         └──────────────────────────────▶ Resubscribe
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription in DB |
| `customer.subscription.updated` | Sync status changes |
| `customer.subscription.deleted` | Mark as canceled |
| `invoice.paid` | Update billing history |
| `invoice.payment_failed` | Trigger grace period |

### Pricing Models Supported

1. **Per-seat pricing**: Track seats in subscription metadata
2. **Usage-based pricing**: Report usage to Stripe metered billing
3. **Hybrid**: Flat base + per-seat + usage overages

---

## Part 6: Folder and Project Structure

```
b2b-startkit/
├── apps/
│   ├── web-template/           # Base template for products
│   │   ├── src/app/           # Next.js App Router
│   │   │   ├── (app)/         # Authenticated routes
│   │   │   │   ├── dashboard/ # Dashboard page
│   │   │   │   ├── billing/   # Billing management
│   │   │   │   ├── team/      # Team management
│   │   │   │   └── settings/  # Settings page
│   │   │   ├── (auth)/        # Sign-in/sign-up
│   │   │   └── api/           # API routes + webhooks
│   │   ├── src/components/    # Product-specific components
│   │   └── src/config/        # Product configuration
│   │
│   └── superadmin/            # Internal admin dashboard
│       └── src/app/
│           ├── (admin)/       # Admin routes
│           │   ├── dashboard/ # Overview stats
│           │   ├── users/     # User management
│           │   ├── organizations/ # Org management
│           │   ├── subscriptions/ # Billing overview
│           │   └── feature-flags/ # Flag management
│           └── api/           # Admin API routes
│
├── packages/
│   ├── config/                # @startkit/config
│   │   └── src/
│   │       ├── env.ts         # Environment validation (Zod)
│   │       └── types.ts       # Shared type definitions
│   │
│   ├── database/              # @startkit/database
│   │   └── src/
│   │       ├── schema/        # Drizzle schema definitions
│   │       ├── migrations/    # SQL migrations
│   │       ├── tenant.ts      # Tenant context (withTenant)
│   │       └── client.ts      # Database client
│   │
│   ├── auth/                  # @startkit/auth
│   │   └── src/
│   │       ├── server.ts      # Server-side auth utilities
│   │       ├── webhooks.ts    # Clerk webhook handlers
│   │       ├── middleware.ts  # Auth middleware
│   │       └── hooks/         # Client hooks
│   │
│   ├── rbac/                  # @startkit/rbac
│   │   └── src/
│   │       ├── permissions.ts # Permission checking (can())
│   │       ├── roles.ts       # Role definitions
│   │       └── flags.ts       # Feature flag logic
│   │
│   ├── billing/               # @startkit/billing
│   │   └── src/
│   │       ├── subscriptions.ts # Subscription management
│   │       ├── webhooks.ts    # Stripe webhook handlers
│   │       ├── usage.ts       # Usage tracking
│   │       └── pricing.ts     # Plan definitions
│   │
│   ├── ui/                    # @startkit/ui
│   │   └── src/
│   │       ├── components/    # shadcn components
│   │       └── layouts/       # App shell, sidebar, etc.
│   │
│   └── analytics/             # @startkit/analytics
│       └── src/
│           ├── client.ts      # PostHog client
│           ├── provider.tsx   # React provider
│           └── hooks/         # useAnalytics hook
│
├── infra/
│   ├── scripts/               # Automation scripts
│   │   ├── create-product.ts  # New product scaffolding
│   │   └── setup-stripe.ts    # Stripe products/prices setup
│   │
│   └── mcp-servers/           # AI integration servers
│       └── src/
│           ├── repo-knowledge-server.ts
│           ├── schema-introspection-server.ts
│           └── billing-rules-server.ts
│
├── docs/
│   ├── guides/                # User documentation
│   │   ├── getting-started.md
│   │   ├── creating-new-product.md
│   │   ├── billing-integration.md
│   │   └── rbac.md
│   │
│   ├── adr/                   # Architecture Decision Records
│   │   ├── 001-database-choice.md
│   │   ├── 002-auth-clerk.md
│   │   └── ...
│   │
│   └── ai-context/            # AI assistant context
│       ├── conventions.md
│       ├── do-not-touch.md
│       └── system-boundaries.md
│
├── e2e/                       # Playwright E2E tests
├── test-utils/                # Shared test utilities
├── turbo.json                 # Turborepo config
└── pnpm-workspace.yaml        # pnpm workspaces
```

---

## Part 7: Mono-repo Strategy

### Decision: Turborepo + pnpm workspaces

**Rationale:**
- Fast incremental builds with caching
- Clear package boundaries
- Good monorepo DX without Lerna complexity

### Package Evolution Strategy

1. **Semantic versioning** for shared packages
2. **Breaking changes** require major version bump
3. **Products reference packages** via workspace protocol (`"@startkit/ui": "workspace:*"`)

### When to Split Out

A product should leave the monorepo when:
- It has diverged significantly from the template
- It needs different deployment cadence
- Team ownership has separated

---

## Part 8: Golden Path for New Product Creation

### Step-by-Step (Automated via CLI)

```bash
# 1. Create product
pnpm create:product --name=my-product --display-name="My Product"

# 2. Set up Clerk (manual - external service)
# - Create new Clerk application
# - Configure webhooks to point to /api/webhooks/clerk
# - Copy keys to .env.local:
#   - CLERK_SECRET_KEY
#   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# 3. Set up Stripe (can be automated)
pnpm setup:stripe --product=my-product
# - Creates products (Free, Pro, Enterprise)
# - Creates prices (monthly/yearly)
# - Outputs price IDs for .env.local

# 4. Set up Supabase
# - Use shared Supabase for dev (DATABASE_URL in .env.local)
# - Create separate project for production

# 5. Configure environment
# - Copy generated .env.template to .env.local
# - Fill in service credentials

# 6. Deploy
vercel --prod
```

### What's Customized vs Shared

| Customized per Product | Shared Across Products |
|------------------------|------------------------|
| Product name/branding | UI components |
| Feature flags | Auth/RBAC logic |
| Clerk app | Billing logic |
| Product-specific routes | Database schema |
| Business logic | MCP servers |
| Environment variables | Test utilities |

### Default Decisions (Do NOT Revisit)

- Use Clerk for auth (not custom auth)
- Use Stripe for billing (not custom payments)
- Use Supabase/Postgres (not other DBs)
- Use shadcn for components (not custom design system)
- Use Drizzle for ORM (not Prisma)
- Use Turborepo for monorepo (not Nx/Lerna)

---

## Part 9: MCP & AI-First Workflow

### MCP Servers

| Server | Purpose | Tools |
|--------|---------|-------|
| Repo Knowledge | Explain codebase | `list_packages`, `explain_package`, `find_files` |
| Schema Introspection | Database understanding | `list_tables`, `describe_table`, `show_rls_policies` |
| Billing Rules | Billing logic | `list_plans`, `explain_plan`, `validate_billing_change` |

### AI Guardrails

Documented in `docs/ai-context/do-not-touch.md`:

**Never Do:**
- Bypass RLS policies
- Skip permission checks
- Hardcode tenant IDs or price IDs
- Expose secrets in code
- Use service role key for user requests
- Modify applied migrations

**Always Do:**
- Use `withTenant()` for tenant-scoped queries
- Check permissions before mutations
- Verify webhook signatures
- Log destructive actions
- Validate environment variables via `@startkit/config`

### Files Marked @ai-no-modify

- `packages/config/src/env.ts`
- `packages/database/src/tenant.ts`
- `packages/database/src/migrations/sql/0001_enable_rls.sql`
- `packages/auth/src/server.ts`
- `packages/auth/src/webhooks.ts`
- `packages/rbac/src/permissions.ts`
- `packages/billing/src/webhooks.ts`
- `infra/scripts/create-product.ts`
- `infra/scripts/setup-stripe.ts`

---

## Part 10: Exit Criteria

### v0.5 - Skeleton Ready

- [x] Mono-repo structure with Turborepo
- [x] All package folders exist with basic exports
- [x] Build pipeline works across all packages
- [x] One product can be created from template (manual)

### v1.0 - Production Ready

- [x] @startkit/config complete (env validation)
- [x] @startkit/database with RLS (tenant isolation)
- [x] Authentication flow complete (Clerk integration)
- [x] Role-based access control working
- [x] Stripe billing integration complete
- [x] UI components complete (shadcn)
- [x] web-template app pages complete
- [ ] One real product launched and accepting payments

### v1.5 - Factory Ready

- [x] `create-product` CLI automated
- [x] MCP servers operational
- [x] Documentation complete
- [x] Analytics integration (PostHog)
- [x] Superadmin dashboard complete
- [ ] Three or more products running
- [x] Shared packages stable

### v2.0 - Scale Ready

- [x] Usage-based billing core (needs Redis for scale)
- [ ] AI agent framework (@startkit/ai) complete
- [x] Audit logging for enterprise
- [x] Feature flag system mature
- [ ] Five or more products running

---

## Part 11: Cross-Check: What's Built vs Original Plan

### Authentication and Identity

| Requirement | Status | Notes |
|-------------|--------|-------|
| Clerk-based auth | ✅ Complete | `packages/auth/` |
| Email + password, magic link, OAuth | ✅ Complete | Handled by Clerk |
| Secure session handling | ✅ Complete | Clerk + middleware |
| Organization support (B2B-first) | ✅ Complete | Full org switching |

### User and Organization Management

| Requirement | Status | Notes |
|-------------|--------|-------|
| Users belong to organizations | ✅ Complete | Organization members table |
| Organization roles (owner, admin, member, viewer) | ✅ Complete | Full hierarchy |
| Invitation flows | ✅ Complete | Via Clerk invitations |
| Role-based access control | ✅ Complete | `@startkit/rbac` |

### Superadmin System

| Requirement | Status | Notes |
|-------------|--------|-------|
| Global superadmin role | ✅ Complete | `isSuperadmin` flag |
| Impersonate users | ✅ Complete | 1hr max, audit logged |
| Access to all orgs/users/billing | ✅ Complete | `apps/superadmin/` |
| Safeguards against misuse | ✅ Complete | Can't impersonate superadmins |

### Authorization Model

| Requirement | Status | Notes |
|-------------|--------|-------|
| Flexible permissions | ✅ Complete | `can()` function |
| Permissions decoupled from roles | ✅ Complete | Custom permission overrides |
| Feature flags per org/plan/user | ✅ Complete | Full flag system |

### Billing and Monetization

| Requirement | Status | Notes |
|-------------|--------|-------|
| Stripe subscriptions | ✅ Complete | Full lifecycle |
| Per-seat pricing | ✅ Complete | Seat tracking |
| Usage-based pricing | 🟡 Mostly | Needs Redis for scale |
| Free trial handling | ✅ Complete | Trial state in subscriptions |
| Grace periods | ✅ Complete | `past_due` state handling |
| Webhooks architecture | ✅ Complete | All handlers implemented |

### Landing Page and Marketing

| Requirement | Status | Notes |
|-------------|--------|-------|
| High-conversion B2B landing | ✅ Complete | Hero, features, pricing, FAQ |
| SEO-first architecture | ✅ Complete | Next.js App Router SSR |
| CMS strategy | ⬜ Not Done | Static for now (acceptable) |

### App Shell and UX

| Requirement | Status | Notes |
|-------------|--------|-------|
| Authenticated app layout | ✅ Complete | `AppShell` component |
| Navigation patterns | ✅ Complete | Sidebar + header |
| Empty/loading/error states | ✅ Complete | Components in `@startkit/ui` |
| Design system (shadcn) | ✅ Complete | 24+ components |

### Non-Negotiable Architectural Concerns

| Requirement | Status | Notes |
|-------------|--------|-------|
| Multi-tenancy model | ✅ Complete | RLS + tenant context |
| Data isolation guarantees | ✅ Complete | RLS isolation tests pass |
| Naming conventions | ✅ Complete | `docs/ai-context/conventions.md` |
| Environment management | ✅ Complete | Zod validation |
| Secrets handling | ✅ Complete | Never exposed |
| Audit logging | ✅ Complete | Full audit log table |
| Observability | 🟡 Basic | Logging + PostHog, metrics TBD |
| Feature flags | ✅ Complete | Full system |
| Migration strategy | ✅ Complete | Drizzle migrations |

### SaaS Factory Extensions

| Requirement | Status | Notes |
|-------------|--------|-------|
| Mono-repo strategy | ✅ Complete | Turborepo + pnpm |
| Golden path CLI | ✅ Complete | `create-product` script |
| Automated bootstrapping | ✅ Complete | CLI + `setup-stripe` |
| MCP servers | ✅ Complete | 3 servers implemented |
| AI-first workflow | ✅ Complete | `.cursorrules` + `docs/ai-context/` |
| Internal platform mindset | ✅ Complete | ADRs, conventions, docs |
| Exit criteria defined | ✅ Complete | Version milestones |

---

## Summary

### Overall Completion: ~92%

The starter kit is **functionally complete** for launching B2B SaaS products.

### What Remains

**Critical Path to Production:**
1. Deploy first product and verify end-to-end flow
2. Set up production Redis for usage tracking at scale
3. Add metrics/monitoring beyond PostHog

**Nice to Have (v2.0):**
1. `@startkit/ai` package for AaaS products
2. "Extend trial" superadmin action (minor feature)
3. Pending invitations UI (currently uses Clerk native)

### Key Achievements

- **Stack deviation was correct** - Supabase/Postgres with RLS is more appropriate than Convex for B2B multi-tenancy
- **All core packages implemented** with tests
- **Documentation is production-ready** including AI context
- **Factory is operational** - can create new products with one command
- **Superadmin dashboard exists** with impersonation, org/user management

---

## Related Documents

- [Getting Started Guide](./guides/getting-started.md)
- [Creating New Products](./guides/creating-new-product.md)
- [RBAC Guide](./guides/rbac.md)
- [Billing Integration](./guides/billing-integration.md)
- [Architecture Decision Records](./adr/)
- [AI Context](./ai-context/)
