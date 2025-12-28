# B2B StartKit - Remaining Implementation Tasks

> **Purpose**: Comprehensive task list for completing the SaaS Factory implementation.
> Each section can be worked on independently by different agents.
> Tasks are organized by package/area with clear acceptance criteria.
> **Sections are ordered by dependency** - complete earlier sections before later ones.

---

## Status Legend

- ⬜ Not started
- 🟡 In progress
- ✅ Complete
- 🔒 Requires human review (DO NOT TOUCH zones)

---

## Overview: What's Built vs Remaining

### ✅ Completed
- Mono-repo structure (Turborepo + pnpm)
- Basic package scaffolding (@startkit/*)
- Database schema deployed to Supabase
- Clerk auth integration (basic)
- web-template app with pages
- GitHub repo connected

### ⬜ Remaining (This Document)
- Complete all package implementations
- RLS policies and tenant isolation
- Full billing integration
- Permission system
- UI component library
- Superadmin dashboard
- MCP servers
- Testing suite
- Documentation

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. @startkit/config (env validation, shared types)                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. @startkit/database (schema, RLS, tenant context)                │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. @startkit/auth (server utils, webhooks, org switching)          │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. @startkit/rbac (permissions, roles, feature flags)              │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Stripe Setup (create products/prices in Stripe dashboard)       │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. @startkit/billing (subscriptions, usage, webhooks)              │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌───────────────────────────────┬─────────────────────────────────────┐
│  7. @startkit/ui (components) │  ← Can parallelize with 6           │
└───────────────────────────────┴─────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. web-template (pages, API routes)                                │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  9. @startkit/analytics (tracking - needs pages to track)           │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  10. Superadmin Dashboard (depends on all packages)                 │
└─────────────────────────┬───────────────────────────────────────────┘
                          ▼
┌───────────────────────────────┬─────────────────────────────────────┐
│  11. Infrastructure & CLI     │  12. MCP Servers                    │
└───────────────────────────────┴─────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  13. Documentation (ongoing, finalize at end)                       │
└─────────────────────────────────────────────────────────────────────┘

Note: Testing follows TDD - write tests alongside each section, not at the end.
```

---

## 1. @startkit/config - Shared Configuration

**Location**: `packages/config/`
**Priority**: 🔴 Critical (all packages depend on this)
**Dependencies**: None - this is the foundation

> ⚠️ Complete this first! All other packages will `import { env } from '@startkit/config'`

### 1.1 Environment Validation
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create Zod schema for env vars | ✅ | Type-safe env access |
| Validate env on app startup | ✅ | Fail fast if missing |
| Create `env` export | ✅ | `import { env } from '@startkit/config'` |
| Separate client/server env vars | ✅ | Never expose secrets |

### 1.2 Shared Types
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Define Product configuration type | ✅ | Name, features, limits |
| Define Plan configuration type | ✅ | Pricing, features |
| Define common API response types | ✅ | Success, error formats |

### 1.3 Environment Templates
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Update env.template | ✅ | All required vars |
| Add comments explaining each var | ✅ | Clear documentation |
| Create .env.example | ✅ | Safe to commit |

---

## 2. @startkit/database - Database & Multi-Tenancy

**Location**: `packages/database/`
**Priority**: 🔴 Critical (security foundation)
**Dependencies**: @startkit/config

### 2.1 RLS Policies 🔒
> ⚠️ Security-critical - requires careful review

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create RLS policy for `users` table | ✅ | Users can only read their own record |
| Create RLS policy for `organizations` table | ✅ | Members can read their org |
| Create RLS policy for `organization_members` | ✅ | Members can read their org's members |
| Create RLS policy for `subscriptions` | ✅ | Only org admins can read |
| Create RLS policy for `audit_logs` | ✅ | Admins can read org logs |
| Create RLS policy for `feature_flags` | ✅ | Members can read org flags |
| Create superadmin bypass connection | ✅ | Service role key for superadmin |
| Write isolation tests | ✅ | Prove tenants can't see each other |

### 2.2 Tenant Context
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Implement `withTenant()` query wrapper | ✅ | All queries automatically scoped |
| Implement `setTenantContext()` for RLS | ✅ | Sets `app.current_org_id` in Postgres |
| Create tenant middleware for API routes | ✅ | Injects org context from Clerk |
| Add tenant context to tRPC (if using) | ⬜ | Context available in all procedures (N/A - not using tRPC) |

### 2.3 Migrations
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Set up Drizzle migration workflow | ✅ | `pnpm db:generate` creates migrations |
| Document migration process | ✅ | Clear guide in docs |
| Create seed script for development | ✅ | Realistic test data |

---

## 3. @startkit/auth - Authentication

**Location**: `packages/auth/`
**Priority**: 🔴 Critical
**Dependencies**: @startkit/config, @startkit/database

### 3.1 Server Utilities
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Complete `getServerAuth()` implementation | ✅ | Returns user + org context |
| Implement `requireAuth()` guard | ✅ | Throws/redirects if not authed |
| Implement `requireOrganization()` guard | ✅ | Throws if no org selected |
| Implement `requireRole()` guard | ✅ | Check role before proceeding |

### 3.2 Superadmin System 🔒
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Define superadmin detection logic | ✅ | Check `isSuperadmin` in DB |
| Implement impersonation session | ✅ | 1-hour max, audit logged |
| Create impersonation API routes | ✅ | Start/end impersonation |
| Add impersonation indicator UI | ✅ | Visible banner when impersonating |
| Block superadmin-to-superadmin impersonation | ✅ | Security requirement |

### 3.3 Organization Switching
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Implement org switch in `useOrganization` | ✅ | Updates context immediately |
| Persist last org to localStorage | ✅ | Returns to same org on reload |
| Handle org deletion gracefully | ✅ | Redirect to org selector |

### 3.4 Webhook Handlers 🔒
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Handle `user.created` webhook | ✅ | Creates user in DB |
| Handle `user.updated` webhook | ✅ | Syncs user data |
| Handle `user.deleted` webhook | ✅ | Soft deletes, audit log |
| Handle `organization.created` webhook | ✅ | Creates org in DB |
| Handle `organizationMembership.created` | ✅ | Adds member to DB |
| Handle `organizationMembership.deleted` | ✅ | Removes member |
| Add idempotency to all handlers | ✅ | Safe to replay |

---

## 4. @startkit/rbac - Permissions

**Location**: `packages/rbac/`
**Priority**: 🔴 Critical
**Dependencies**: @startkit/config, @startkit/database, @startkit/auth

### 4.1 Permission Engine
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Define base permission types | ✅ | CRUD + custom actions |
| Define resource types | ✅ | All entities in system |
| Implement `can(user, action, resource)` | ✅ | Returns boolean |
| Implement `authorize()` that throws | ✅ | Throws ForbiddenError |
| Add permission caching | ✅ | Don't recalculate every call |

### 4.2 Role System
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Define `owner` role permissions | ✅ | Full access to org |
| Define `admin` role permissions | ✅ | All except billing/delete org |
| Define `member` role permissions | ✅ | Read + limited write |
| Define `viewer` role permissions | ✅ | Read only |
| Implement role hierarchy | ✅ | Owner > Admin > Member > Viewer |
| Allow custom permission overrides | ✅ | Add/remove per user |

### 4.3 Feature Flags
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Implement `hasFeature(org, flag)` | ✅ | Checks org's flags |
| Implement plan-based default flags | ✅ | Pro plan gets X features |
| Create feature flag admin API | ✅ | CRUD for flags |
| Add feature flag UI component | ✅ | Wrap features in flag check |

---

## 5. Stripe Setup (Infrastructure Prerequisite)

**Location**: `infra/scripts/`
**Priority**: 🔴 Critical (must complete before Section 6)
**Dependencies**: None (external service setup)

> ⚠️ Complete this BEFORE implementing @startkit/billing. You need price IDs to implement checkout.

### 5.1 setup-stripe Script
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create products in Stripe | ✅ | Free, Pro, Enterprise |
| Create prices for products | ✅ | Monthly/yearly |
| Output price IDs | ✅ | For .env.local |
| Idempotent (safe to re-run) | ✅ | Skips existing |

---

## 6. @startkit/billing - Stripe Integration

**Location**: `packages/billing/`
**Priority**: 🟡 High (revenue critical)
**Dependencies**: @startkit/config, @startkit/database, @startkit/auth, @startkit/rbac, Section 5 (Stripe Setup)

### 6.1 Subscription Management
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Implement `createCheckoutSession()` | ✅ | Redirects to Stripe Checkout |
| Implement `createCustomerPortal()` | ✅ | Opens Stripe portal |
| Implement `getSubscription()` | ✅ | Returns current plan details |
| Implement `cancelSubscription()` | ✅ | Cancels at period end |
| Implement `resumeSubscription()` | ✅ | Resumes canceled sub |
| Implement `changeSubscription()` | ✅ | Upgrade/downgrade |

### 6.2 Usage Tracking
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Set up Upstash Redis connection | ⬜ | Real-time usage storage (TODO: Add Redis for production) |
| Implement `trackUsage(metric, value)` | ✅ | Increment usage counter |
| Implement `getUsage(metric, period)` | ✅ | Get current usage |
| Implement usage aggregation job | ✅ | Hourly sync to DB |
| Implement Stripe usage reporting | ✅ | Report at billing cycle |
| Add usage limit enforcement | ✅ | Block when over limit |

### 6.3 Webhook Handlers 🔒
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Handle `checkout.session.completed` | ✅ | Create subscription in DB |
| Handle `customer.subscription.updated` | ✅ | Sync status |
| Handle `customer.subscription.deleted` | ✅ | Mark canceled |
| Handle `invoice.paid` | ✅ | Update billing history |
| Handle `invoice.payment_failed` | ✅ | Trigger grace period |
| Add idempotency keys | ✅ | Safe to replay |
| Add webhook signature verification | ✅ | Security requirement |

### 6.4 Pricing Configuration
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create pricing plan config type | ✅ | Define plan structure |
| Create default plans (Free, Pro, Enterprise) | ✅ | In Stripe + config |
| Implement plan limits | ✅ | Seats, storage, API calls |
| Create pricing page component | ⬜ | Shows all plans (UI component - Section 7) |

---

## 7. @startkit/ui - Component Library

**Location**: `packages/ui/`
**Priority**: 🟡 High
**Dependencies**: @startkit/config (minimal - can parallelize with Sections 5-6)

> 💡 This section can be worked on in parallel with Sections 5-6

### 7.1 Core Components (shadcn)
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Add Card component | ✅ | For dashboard widgets |
| Add Dialog/Modal component | ✅ | For confirmations |
| Add Dropdown Menu | ✅ | For actions menus |
| Add Input component | ✅ | Form input |
| Add Label component | ✅ | Form labels |
| Add Select component | ✅ | Dropdown select |
| Add Textarea component | ✅ | Multi-line input |
| Add Checkbox component | ✅ | Boolean input |
| Add Switch/Toggle component | ✅ | On/off toggle |
| Add Avatar component | ✅ | User avatars |
| Add Badge component | ✅ | Status badges |
| Add Alert component | ✅ | Notifications |
| Add Toast/Sonner component | ✅ | Toast notifications |
| Add Skeleton component | ✅ | Loading states |
| Add Tabs component | ✅ | Tab navigation |
| Add Table component | ✅ | Data tables |
| Add Pagination component | ✅ | For tables |

### 7.2 Layout Components
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create responsive Sidebar | ✅ | Collapsible on mobile |
| Create Header component | ✅ | With user menu |
| Create PageHeader component | ✅ | Title + actions |
| Create EmptyState component | ✅ | No data placeholder |
| Create ErrorBoundary component | ✅ | Error UI |

### 7.3 Form Components
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Integrate React Hook Form | ✅ | Form state management |
| Create FormField wrapper | ✅ | Label + input + error |
| Create form validation patterns | ✅ | Zod integration |

### 7.4 Data Display
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create DataTable component | ✅ | Sorting, filtering |
| Create StatCard component | ✅ | Dashboard metrics |
| Create ActivityFeed component | ✅ | Audit log display |

---

## 8. web-template App Improvements

**Location**: `apps/web-template/`
**Priority**: 🟡 High
**Dependencies**: All @startkit/* packages (Sections 1-7)

### 8.1 Landing Page
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Add hero section with CTA | ✅ | Clear value proposition |
| Add features section | ✅ | Key features grid |
| Add pricing section | ✅ | Plan comparison |
| Add testimonials section | ✅ | Social proof |
| Add FAQ section | ✅ | Common questions |
| Add footer with links | ✅ | Legal, social, nav |
| Make fully responsive | ✅ | Mobile-first design |

### 8.2 Dashboard Page
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Add welcome message | ✅ | Personalized greeting |
| Add quick stats cards | ✅ | Key metrics |
| Add recent activity feed | ✅ | From audit logs |
| Add quick actions | ✅ | Common tasks |

### 8.3 Team Page
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| List all team members | ✅ | With roles |
| Add invite member modal | ✅ | Email invite |
| Add change role dropdown | ✅ | Admin only |
| Add remove member button | ✅ | With confirmation |
| Show pending invitations | ⬜ | With resend/cancel (Note: Uses Clerk invitations) |

### 8.4 Billing Page
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Show current plan | ✅ | Name, price, features |
| Show usage metrics | ✅ | If usage-based |
| Add upgrade button | ✅ | Opens checkout |
| Add manage subscription link | ✅ | Opens Stripe portal |
| Show billing history | ✅ | Past invoices |

### 8.5 Settings Page
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Organization settings section | ✅ | Name, slug, timezone |
| User profile section | ✅ | Name, email, avatar |
| Notification preferences | ✅ | Email settings |
| Danger zone (delete org) | ✅ | With confirmation |

### 8.6 API Routes (Server Actions)
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create team invite action | ✅ | Server action with audit log |
| Create team remove action | ✅ | Server action with auth check |
| Create team role update action | ✅ | Server action (owner only) |
| Create org settings action | ✅ | Server action with validation |
| Create billing actions | ✅ | Checkout, portal, cancel, resume |
| Add consistent error handling | ✅ | Standard ActionResult format |
| Add request validation | ✅ | Form validation + auth checks |

---

## 9. @startkit/analytics - Analytics

**Location**: `packages/analytics/` (create new)
**Priority**: 🟢 Medium
**Dependencies**: @startkit/config, web-template pages (Section 8)

> 💡 Analytics tracks UI events, so it's most useful after pages exist

### 9.1 PostHog Integration
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create package structure | ✅ | package.json, tsconfig |
| Add PostHog client setup | ✅ | Initialize on app load |
| Create `track()` helper | ✅ | Track custom events |
| Create `identify()` helper | ✅ | Identify users |
| Create `setOrganization()` helper | ✅ | Group by org |
| Add React provider | ✅ | Context for hooks |
| Create `useAnalytics` hook | ✅ | Client-side tracking |

### 9.2 Event Tracking
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Define core event schema | ✅ | Consistent event structure |
| Track auth events | ✅ | Sign in, sign out, sign up |
| Track billing events | ✅ | Subscribe, cancel, upgrade |
| Track feature usage events | ✅ | Key feature interactions |

---

## 10. Superadmin Dashboard (NEW APP)

**Location**: `apps/superadmin/` (create new)
**Priority**: 🟢 Medium
**Dependencies**: All packages working (Sections 1-9)

### 10.1 Setup
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Scaffold superadmin app | ✅ | Copy from web-template |
| Add superadmin-only middleware | ✅ | Blocks non-superadmins |
| Create separate Clerk app | ✅ | Or use same with role check |

### 10.2 Dashboard Views
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| All organizations list | ✅ | Search, filter, sort |
| Organization detail view | ✅ | Members, subscription, usage |
| All users list | ✅ | Search, filter |
| User detail view | ✅ | Orgs, activity |
| Subscription overview | ✅ | MRR, churn, growth |

### 10.3 Admin Actions
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Impersonate user button | ✅ | Opens user session |
| Toggle feature flags | ✅ | Per org |
| Force password reset | ✅ | Security action |
| Deactivate user | ✅ | With audit log |
| Extend trial | ⬜ | Manual override |

---

## 11. Infrastructure & Automation

**Location**: `infra/`
**Priority**: 🟢 Medium
**Dependencies**: web-template working (for create-product to copy from)

> Note: setup-stripe moved to Section 5 as it's a prerequisite for billing

### 11.1 create-product CLI
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Accept --name flag | ✅ | Kebab-case product name |
| Accept --display-name flag | ✅ | Human-readable name |
| Copy web-template to new folder | ✅ | All files copied |
| Update package.json in new app | ✅ | Correct name |
| Generate product config file | ✅ | Default configuration |
| Output setup instructions | ✅ | Next steps for user |
| Interactive mode | ✅ | Prompts if no flags |

---

## 12. MCP Servers (AI Integration)

**Location**: `infra/mcp-servers/` (create new)
**Priority**: 🟢 Medium (but valuable for AI workflow)
**Dependencies**: Schema and packages defined (Sections 1-6)

### 12.1 Repo Knowledge Server
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create MCP server structure | ⬜ | Standard MCP format |
| Implement `list_packages` tool | ⬜ | Returns all @startkit/* packages |
| Implement `explain_package` tool | ⬜ | Returns package purpose |
| Implement `find_files` tool | ⬜ | Search by purpose |
| Implement `get_imports` tool | ⬜ | Show dependencies |

### 12.2 Schema Introspection Server
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create MCP server structure | ⬜ | Standard MCP format |
| Implement `list_tables` tool | ⬜ | All DB tables |
| Implement `describe_table` tool | ⬜ | Columns, types, relations |
| Implement `show_rls_policies` tool | ⬜ | Security policies |
| Implement `validate_query` tool | ⬜ | Check tenant isolation |

### 12.3 Billing Rules Server
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create MCP server structure | ⬜ | Standard MCP format |
| Implement `list_plans` tool | ⬜ | All pricing plans |
| Implement `explain_plan` tool | ⬜ | Plan details, limits |
| Implement `get_billing_states` tool | ⬜ | State machine |
| Implement `validate_billing_change` tool | ⬜ | Check if change is valid |

---

## 13. Testing (TDD - Ongoing)

**Location**: Throughout repo
**Priority**: 🟡 High

> ⚠️ **TDD Approach**: Write tests ALONGSIDE each section, not at the end.
> When implementing Section N, write tests for Section N at the same time.

### 13.1 Test Infrastructure (Set up first!)
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Set up Vitest | ⬜ | Test runner configured |
| Set up Playwright | ⬜ | E2E runner configured |
| Create test utilities | ⬜ | Mock factories, helpers |

### 13.2 Unit Tests (write alongside each section)
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Test @startkit/config env validation | ⬜ | With Section 1 |
| Test @startkit/database tenant context | ⬜ | With Section 2 |
| Test @startkit/auth utilities | ⬜ | With Section 3 |
| Test @startkit/rbac permission engine | ⬜ | With Section 4 |
| Test @startkit/billing calculations | ⬜ | With Section 6 |

### 13.3 RLS Isolation Tests 🔒
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Test user can't read other user | ⬜ | Fails with RLS |
| Test org A can't read org B data | ⬜ | Complete isolation |
| Test member can't access admin data | ⬜ | Role-based RLS |
| Test superadmin can access all | ⬜ | Bypass works |

### 13.4 Integration Tests
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Test Clerk webhook handlers | ⬜ | Mock webhooks |
| Test Stripe webhook handlers | ⬜ | Mock webhooks |
| Test API routes | ⬜ | Happy + error paths |

### 13.5 E2E Tests
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Test signup flow | ⬜ | New user can sign up |
| Test signin flow | ⬜ | Existing user can sign in |
| Test billing flow | ⬜ | Can subscribe to plan |
| Test team invite flow | ⬜ | Can invite member |

---

## 14. Documentation

**Location**: `docs/`
**Priority**: 🟢 Medium (ongoing throughout development)

> 💡 Update documentation as you complete each section

### 14.1 Guides
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Getting Started guide | ⬜ | Clone → running in 10 min |
| Creating New Product guide | ⬜ | Step-by-step with CLI |
| Billing Integration guide | ⬜ | Stripe setup |
| RBAC guide | ⬜ | Adding roles, permissions |
| Database guide | ⬜ | Schema, migrations, RLS |

### 14.2 ADRs
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| ADR-001: Database (Supabase) | ✅ | Already created |
| ADR-002: Auth (Clerk) | ⬜ | Document decision |
| ADR-003: Billing (Stripe) | ⬜ | Document decision |
| ADR-004: Mono-repo (Turborepo) | ⬜ | Document decision |
| ADR-005: ORM (Drizzle) | ⬜ | Document decision |

### 14.3 AI Context
| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Update system-boundaries.md | ⬜ | Current state |
| Update do-not-touch.md | ⬜ | All protected areas |
| Create conventions.md | ⬜ | Coding standards |
| Update .cursorrules | ⬜ | AI coding rules |

---

## Version Milestones

### v0.5 - Skeleton Ready (ALMOST COMPLETE)
- [x] Mono-repo structure with Turborepo
- [x] All package folders exist with basic exports
- [x] Build pipeline works across all packages
- [x] One product can be created from template (manual)

### v1.0 - Production Ready
- [ ] @startkit/config complete (Section 1)
- [ ] @startkit/database with RLS (Section 2)
- [ ] Authentication flow complete (Section 3)
- [ ] Role-based access control working (Section 4)
- [ ] Stripe billing integration complete (Sections 5-6)
- [ ] UI components and web-template (Sections 7-8)
- [ ] One real product launched and accepting payments

### v1.5 - Factory Ready
- [ ] `create-product` CLI automated (Section 11)
- [ ] MCP servers operational (Section 12)
- [ ] Documentation complete (Section 14)
- [ ] Three or more products running
- [ ] Shared packages stable

### v2.0 - Scale Ready
- [ ] Usage-based billing working
- [ ] AI agent framework (@startkit/ai) complete
- [ ] Audit logging for enterprise
- [ ] Feature flag system mature
- [ ] Five or more products running

---

## How to Use This File

### For Solo Development
1. **Follow section order** - complete earlier sections before later ones
2. Start with Section 1 (@startkit/config)
3. Write tests alongside each section (TDD)
4. Mark tasks as ✅ when done
5. Commit with section reference: `feat(config): complete env validation`

### For Multi-Agent Development
1. Sections 1-4 must be sequential (dependencies)
2. Sections 5-7 can be parallelized (after 1-4 complete)
3. Section 8 requires Sections 1-7
4. Sections 9-14 can be parallelized (after 8 complete)

### Recommended Order (Updated)
1. **@startkit/config** - Foundation, all packages import from here
2. **@startkit/database** - RLS security foundation
3. **@startkit/auth** - User/org sync
4. **@startkit/rbac** - Permission engine
5. **Stripe Setup** - Create products/prices before coding billing
6. **@startkit/billing** - Revenue critical
7. **@startkit/ui** - Components (can parallelize with 5-6)
8. **web-template** - App pages
9. **@startkit/analytics** - Tracking (needs pages)
10. **Superadmin** - Admin dashboard
11. **Infrastructure** - CLI tools
12. **MCP Servers** - AI integration
13. **Testing** - TDD throughout, consolidate at end
14. **Documentation** - Ongoing, finalize at end

---

*Last updated: December 28, 2025*
