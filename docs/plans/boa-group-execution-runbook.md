# BOA Group Execution Runbook (Chronological)

This is the **single step-by-step checklist** to execute BOA Group’s monorepo operating setup **and** complete the Zenthea → StartKit migration + HIPAA readiness work.

## How to use this document
- Work **top to bottom**.
- Every step has: **Owner**, **Depends on**, **Acceptance**.
- Where detailed implementation exists elsewhere, this runbook links to it, but keeps the “next action” here.

## Owner legend
- **Agent**: AI implements in-repo code/config changes.
- **Human**: requires AWS/Clerk/Stripe/DNS access, contracts/BAAs, or approvals.
- **Agent + Human**: pairing (Agent prepares; Human executes in consoles / provides keys / approves).

---

## Phase 0 — BOA Group monorepo operating system (thin slice, fast)

### 0.1 Confirm monorepo boundaries (one-time)
- [x] **Decide app profiles** (PHI vs non-PHI) (Owner: Human, Depends on: none)
  - **Acceptance**:
    - Written rule: any app that can view patient data is **PHI** (AWS-only profile).
    - Marketing sites are **non-PHI** (may use Vercel/CDN/analytics with strict PHI exclusion).
  - **Notes**:
    - `apps/zenthea` is PHI by default (treat entire app as PHI unless proven otherwise).

- [x] **Decide naming convention for future experiments** (Owner: Human, Depends on: none)
  - **Acceptance**:
    - Use a **vertical-first slug** for app folder names: `apps/<vertical>-<appname>`
    - Keep the **human label** (can include spaces) for docs/branding, e.g. “SMB Medical Clinics — Zenthea”.
  - **Example**:
    - Label: “SMB Medical Clinics — Zenthea”
    - Folder slug: `apps/smb-medical-clinics-zenthea`

### 0.2 Set up git worktrees for parallel agents (recommended)
- [x] **Create worktrees folder (sibling to repo)** (Owner: Agent + Human, Depends on: none)
  - **Acceptance**:
    - Worktrees live in a sibling directory, e.g. `../boa-group-platform-worktrees/<name>`
    - One Cursor window per worktree.
  - **Why**: avoids nested checkouts that cause noisy indexing and “wrong checkout” edits.

- [x] **Create 2–3 standard worktrees** (Owner: Agent + Human, Depends on: 0.2)
  - **Acceptance**:
    - Example: `agent/claude-1`, `agent/claude-2`, `feature/<topic>`
    - Each worktree can run `pnpm -w` commands without confusion.
  - **Created**:
    - `feature/zenthea-appointments` → `../boa-group-platform-worktrees/zenthea-appointments`
    - `feature/zenthea-encounters` → `../boa-group-platform-worktrees/zenthea-encounters`
    - `feature/zenthea-patient` → `../boa-group-platform-worktrees/zenthea-patient`

### 0.3 Install/standardize Cursor workflow helpers (Claude Code later)
- [x] **Port `.cursor/commands/*` into monorepo root** (Owner: Agent + Human, Depends on: 0.2)
  - **Acceptance**:
    - Root `.cursor/commands/` contains your prompting accelerators (e.g. `pr.md`, `fix.md`, `merge.md`, `review.md`).
    - Files are committed so all worktrees get them automatically.

- [x] **Port `.cursor/rules/*` into monorepo root (dedupe with `.cursorrules`)** (Owner: Agent + Human, Depends on: 0.3)
  - **Acceptance**:
    - Root `.cursor/rules/` exists (workflow playbooks).
    - No contradictory duplication of the existing root `.cursorrules`.
  - **Imported from**:
    - `/Users/oystein/Desktop/Dev/Zenthea/.cursor/rules`

### 0.4 Optional: rename repo on disk / GitHub
- [x] **Rename repo folder + remote name (optional)** (Owner: Human, Depends on: none)
  - **Acceptance**:
    - A `boa-group-platform` folder name is available without changing package namespaces (`@startkit/*` stays).
  - **Note**: avoid mass-renaming internal packages/import paths; it creates churn and complicates spin-outs.
  - **Implementation note**:
    - We used a **symlink alias**: `/Users/oystein/Desktop/Dev/boa-group-platform -> b2b-startkit` to avoid breaking existing git worktrees.

**References**
- `docs/plans/boa-group-monorepo-operating-plan.md`

---

## Phase 1 — Zenthea migration + HIPAA readiness (execute in order)

> This phase is executed from the Zenthea runbook, but listed here so you can operate from one document.
> If a step is already done in `zenthea-migration-hipaa.md`, mark it done here too for clarity.

### 1.0 Compliance + vendor gating (do first)
- [ ] **T00 — Confirm BAAs and PHI boundaries across vendors** (Owner: Human, Depends on: none)
  - **Acceptance**:
    - Vendor inventory completed + PHI boundaries documented.
    - BAA requirements confirmed and requests initiated.
    - Decision recorded: allowed tooling for PHI (logs/APM/analytics, email/SMS, AI vendors).
  - **Reference**:
    - `docs/plans/zenthea-baa-questionnaire.md`
    - `docs/plans/zenthea-baa-required-list.md`
    - `docs/plans/zenthea-vendor-inventory.md`

### 1.1 Monorepo landing zone (already completed)
- [x] **T01 — Zenthea app-local env validation plan** (Owner: Agent)
- [x] **T02 — Scaffold `apps/zenthea`** (Owner: Agent)
- [x] **T03 — Import Zenthea code** (Owner: Agent)
- [x] **T04 — Zenthea participates in Turbo tasks** (Owner: Agent)

### 1.2 AWS staging target for PHI workloads (already mostly completed)
- [x] **T05 — AWS staging compute (ECS/Fargate + ALB)** (Owner: Agent + Human)
- [x] **T06 — Configure staging DNS + SSL** (Owner: Human)
- [ ] **T06b — DNS control + rollback hostnames** (Owner: Human, Depends on: T05)
  - **Acceptance**:
    - `legacy.zenthea.ai` points to old Vercel/Convex deployment (rollback).
    - `staging.zenthea.ai` points to AWS staging.

### 1.3 Auth + tenant identity (must exist before DB migration is meaningful)
- [x] **T07 — Create/configure Clerk apps (dev/staging/prod) + org strategy** (Owner: Human + Agent, Depends on: T00)
  - **Acceptance**:
    - Clerk keys exist for environments.
    - Orgs enabled and strategy confirmed.
  - **Reference**: `docs/plans/zenthea-clerk-org-strategy.md`

- [x] **T08 — Implement Clerk auth in `apps/zenthea` (replace NextAuth)** (Owner: Agent, Depends on: T07)
  - **Acceptance**: sign-in works; organization context is available server-side.
  - **Status**: Fully migrated. 265 files updated. NextAuth removed.

- [x] **T09 — Tenant mapping spec: Zenthea `tenantId` → Clerk org → DB `organization_id`** (Owner: Agent + Human, Depends on: T08)
  - **Acceptance**: one canonical mapping decision is made and documented.
  - **Reference**: `docs/plans/zenthea-tenant-mapping-spec.md`

### 1.4 Database foundation (AWS Postgres + RLS)
- [x] **T10 — Provision AWS Postgres (RDS/Aurora) for staging** (Owner: Human, Depends on: T00)
  - **Acceptance**: DB exists; networking/SGs correct; credentials stored safely.
  - **Status**: Completed. RDS instance live. Secure Bastion created for SSM tunneling.

- [x] **T11 — Apply StartKit migrations + RLS to AWS Postgres** (Owner: Agent + Human, Depends on: T10)
  - **Acceptance**: schema migrations applied and `db:apply-rls` applied successfully.
  - **Status**: Completed. Core and Zenthea schemas migrated. RLS enabled on all product tables.

- [x] **T12 — Convex→Postgres schema mapping plan** (Owner: Agent, Depends on: T09 + T11)
  - **Acceptance**: prioritized mapping list from `convex/schema.ts` to relational tables with `organization_id`.
  - **Status**: Completed. Schema implemented in `apps/zenthea/src/lib/db/schema.ts` and applied to staging.

### 1.5 Feature migration off Convex (repeatable slices)
- [x] **T13 — Migrate first vertical slice (Patients / Appointments / Messages)** (Owner: Agent, Depends on: T12)
  - **Acceptance**: slice works in staging using Postgres with tenant isolation + permission checks + tests.
  - **Status**: Completed. Patients, Appointments, Clinics, Medical Records, Messages, and Notifications slices migrated to Postgres. Created services, API routes, and refactored hooks to use SWR + Postgres.

- [x] **T14 — Seed fresh demo data (Postgres) + remove Convex seeding dependency** (Owner: Agent, Depends on: T13)
  - **Status**: Completed. Created `apps/zenthea/src/lib/db/seed.ts` using Faker. Seeded 10 demo patients for organization `ad217e4b-fa2d-4a9b-82c3-6a0d49240b2c`.

- [x] **T15 — Repeat slices until Convex is removed** (Owner: Agent, Depends on: T13; repeating)
  - **Status**: Completed. All core clinical and communication slices migrated. Convex usage eliminated for these domains.

### 1.6 RBAC + audit logging hardening
- [x] **T16 — Implement RBAC + minimum-necessary access per spec** (Owner: Agent, Depends on: T08 + T13)
  - **Status**: Completed. Stabilized localhost and pushed stable version to staging.zenthea.ai. Fixed CSP violations, build failures, and cross-platform Docker issues.

### 1.7 Billing/subscriptions (StartKit Stripe)
- [x] **T17 — Stripe account + products/prices + webhook endpoints (staging)** (Owner: Human, Depends on: T00)
  - **Status**: Completed. Provisioned 3 plans (Free, Pro with AI at $350/user, Enterprise) using `apps/zenthea/scripts/setup-stripe.ts`. Price IDs added to `.env.local`.
- [x] **T18 — Replace Zenthea billing with StartKit Stripe subscriptions** (Owner: Agent, Depends on: T17)
  - **Status**: Completed. Implemented `SubscriptionService` with usage tracking (5 providers/500 patients limits). Created `/api/webhooks/stripe` and `/api/subscription/usage` routes. Updated Subscription Page UI to show real-time metrics.

### 1.8 Production cutover (AWS-only PHI)
- [ ] **T19 — AWS production environment + smoke tests** (Owner: Agent + Human, Depends on: T15 + T16)
- [ ] **T20 — Cutover `app.zenthea.ai` to AWS + rollback drill** (Owner: Human, Depends on: T19 + T06b)

**Primary reference**
- `docs/plans/zenthea-migration-hipaa.md` (source-of-truth details)

---

## Phase 2 — Creating a new vertical (repeatable process)

Use this when you decide to start the next experiment.

- [ ] **Create new app folder** (Owner: Human + Agent, Depends on: Phase 0)
  - **Acceptance**:
    - App created under `apps/zenthea-<codename>` (PHI) or `apps/vertical-<codename>` (non-PHI/unknown).
    - App has its own `env.template` and deployment target defined.

- [ ] **Decide PHI posture early** (Owner: Human, Depends on: app creation)
  - **Acceptance**:
    - If PHI: AWS-only, PHI-safe vendor/tooling, separate DB project, strict logging/redaction.
    - If non-PHI: allowed to use Vercel/CDN/analytics, but keep explicit “no PHI” constraints.

- [ ] **Keep carve-out constraints** (Owner: Human + Agent, Depends on: app creation)
  - **Acceptance**:
    - No cross-app imports.
    - Product tables live in the app.
    - Per-app env/secrets/deploy/DB boundaries.

---

## Phase 3 — Spin-out checklist (when a vertical “wins”)

This is the “exit readiness” path: separating code + accounts cleanly.

- [ ] **Create a new repo and migrate the app** (Owner: Human + Agent)
- [ ] **Provision new AWS account / environments** (Owner: Human)
- [ ] **Provision new DB + keys; migrate data if needed** (Owner: Human + Agent)
- [ ] **Create new auth tenant (Clerk) and migration plan** (Owner: Human + Agent)
- [ ] **Create new Stripe account (or Connect strategy) and migrate customers** (Owner: Human + Agent)
- [ ] **Run a security/compliance review and evidence collection** (Owner: Human)

---

## Notes (don’t screw this up)
- **Don’t optimize the monorepo forever**. Phase 0 is a thin slice to reduce friction; then resume Zenthea work.
- **Don’t “HIPAA-ify” marketing sites**. Keep PHI rules app-scoped.
- **RLS + tenant context are the primary security boundary** for app data; don’t bypass.

