# Zenthea → StartKit Migration + HIPAA Readiness Plan (Convex/Vercel → AWS)

## Status
- **Draft v1** (created by AI, needs validation against Zenthea repo + vendor contracts)
- **Audience**: engineering + product owner
- **Progress**: Phase A - Monorepo import in progress
  - ✅ T01: Env validation plan (completed)
  - ✅ T02: Scaffold apps/zenthea (completed)
  - ✅ T03: Import Zenthea code (completed - 1,241 files imported)

## Goals
1. **Move Zenthea into this b2b-startkit monorepo** as an app under `apps/zenthea`.
2. **Adopt StartKit strengths** in Zenthea (Clerk org auth, RBAC, Stripe subscriptions, shared UI, superadmin/control plane where applicable).
3. **Make Zenthea HIPAA-ready** for PHI/EHR workloads by migrating **fully away from Convex and Vercel** (data + compute) into an AWS environment under a BAA.

## Related specs (foundational)
- `docs/plans/zenthea-hipaa-access-control.md` — HIPAA access control, minimum-necessary, break-glass, and audit logging requirements for Zenthea.

## Definitions (practical)
- **PHI**: any protected health information. Assume Zenthea will handle PHI.
- **In-scope assumption for Zenthea**: treat the **entire Zenthea app** (UI + API) as PHI-handling unless explicitly proven otherwise.
- **HIPAA compliance**: a combination of (a) vendor contracts (BAAs), (b) technical safeguards, (c) administrative safeguards, and (d) evidence.
- **BAA**: Business Associate Agreement. Required with vendors that create/receive/maintain/transmit PHI for you.

## Non-Goals (for the first migration iterations)
- Not a full rewrite.
- Not “perfect architecture” in one pass.
- Not a legal certification. We aim for a system that can pass a HIPAA risk assessment + vendor/BAA review.

---

## Zenthea Current State Snapshot (from `/Users/oystein/Desktop/Dev/Zenthea`)

### App + runtime
- **Next.js**: 14.x, **App Router**, Tailwind, Radix UI components, Zustand, React Hook Form + Zod
- **Backend/data**: **Convex** (`convex` dependency present) with a large Convex schema (`convex/schema.ts`)

### Auth (current)
- **NextAuth (credentials provider)** backed by Convex actions/queries.
- Tenant isolation today is primarily enforced by:
  - `tenantId` in session (`token?.tenantId` style), and
  - Convex queries requiring a `tenantId` filter (see `src/__tests__/integration/multi-tenant-isolation.test.ts`).

### Tenant model (current)
- Convex has a `tenants` table with fields like `id`, `name`, `slug`, `type`, `status`, `subscription`, `branding`, and domain routing (`subdomain`, `customDomain`, etc.).

### Email + integrations (current)
- **SendGrid** appears in dependencies and email route code.
- Google Calendar integration env vars are present.
- Cloudinary appears in dependencies (public/marketing images).

### Existing AWS assets (current)
- S3 + CloudFront are already used.
- There is an `aws-infrastructure.json` with:
  - **Region**: `us-east-1`
  - **S3 buckets**: `zenthea-images-prod`, `zenthea-medical-images-prod`
  - **CloudFront distribution id**: `EW4285Q0D0CM4`
  - Note: buckets show AES256 encryption; for HIPAA we typically prefer **KMS (SSE-KMS)**.
- There are Terraform files for CloudFront (including a Vercel/CloudFront setup).

### HIPAA/security work already present
- Zenthea includes HIPAA/security testing scripts and reports (e.g., `test:hipaa-*` scripts and generated JSON/HTML reports).
- Zenthea already maintains strict security headers / CSP in `next.config.js`.

---

## Hard Constraints / Guardrails

### StartKit security and multi-tenancy
- Tenant isolation is a first-class requirement.
- **Every tenant-scoped table must have `organization_id`.**
- StartKit’s primary isolation mechanism is **Postgres RLS + session variables** set via `withTenant()`.
  - RLS policies read session vars like `app.current_org_id`, `app.current_user_id`, and `app.is_superadmin`.
  - Treat “filter by `organization_id` in code” as defense-in-depth, not the main boundary.
- Any AWS Postgres environment must run both:
  - schema migrations, and
  - the RLS policy application step (the `db:apply-rls` workflow).

### StartKit protected areas (DO NOT TOUCH without explicit approval)
Do not modify these unless you explicitly approve:
- `packages/config/src/env.ts`
- `packages/database/src/tenant.ts`
- `packages/database/src/migrations/sql/0001_enable_rls.sql`
- `packages/auth/src/server.ts`, `packages/auth/src/webhooks.ts`
- `packages/rbac/src/permissions.ts`, `packages/rbac/src/roles.ts`
- `packages/billing/src/webhooks.ts`, `packages/billing/src/subscriptions.ts`
- Any file marked `@ai-no-modify`

### Migration safety
- Keep **old Zenthea (Convex + Vercel + old repo)** intact as rollback.
- Prefer **parallel run + DNS cutover** rather than in-place replacement.

### Environment variable strategy (important for AWS)
StartKit’s template apps call `validateEnv()` from `@startkit/config` during server startup.
- That shared validation currently expects **Supabase-related env vars** to exist (it’s a foundation file and is in a protected “do-not-touch” zone).
- If Zenthea migrates to **AWS Postgres (no Supabase)**, we must avoid a situation where Zenthea can’t boot due to missing Supabase env vars.

**Plan:** Zenthea should use an app-local env schema (e.g., `validateZentheaEnv()`) that validates only what Zenthea actually uses (Clerk, Stripe, `DATABASE_URL`, S3, etc.), and Zenthea should not rely on the shared `validateEnv()` if it would force unused Supabase variables.

---

## Recommended Target Architecture (AWS-first)

### Data plane
- **Postgres**: AWS RDS Postgres (or Aurora Postgres)
- **File storage**: S3 (already used) + KMS
- **Secrets**: AWS Secrets Manager or SSM Parameter Store

### Compute plane (PHI workloads)
- **Next.js App Router**: ECS Fargate behind an ALB (or App Runner as a simpler alternative)
- Optional: CloudFront in front of ALB (careful with caching; avoid caching PHI)
- **No Vercel for PHI workloads**: Vercel may be used later only for a separate non-PHI marketing app.

### Observability / auditing
- CloudWatch Logs (with **strict PHI redaction** policy)
- CloudTrail (AWS API audit)
- Optional: GuardDuty / Security Hub (later hardening)

### Control plane / admin
- Continue using StartKit’s `apps/superadmin` for platform/admin workflows if it fits Zenthea’s needs.

---

## Vendor + PHI Boundary Checklist (Non-negotiable)

### Rule
If a vendor can see PHI (directly or via logs/traces), you typically need a **BAA**, or you must guarantee PHI never touches that vendor.

### Required vendor inventory (create a spreadsheet)
- Hosting/compute
- Database
- File storage/backups
- Auth provider
- Email/SMS provider
- Logging/APM/error tracking
- Analytics
- Support tooling
- CI/CD
- CDN/WAF

### Action items
- [ ] Confirm AWS BAA is in place (and services used are HIPAA-eligible).
- [ ] Confirm Zenthea’s current email provider plan:
  - SendGrid is present in the codebase; if PHI can be included in emails, you need a BAA or you must ensure emails are PHI-free.
- [ ] Confirm whether OpenAI/ElevenLabs are used with PHI (env vars exist). If yes, confirm BAA/terms and implement strict redaction policies.
- [ ] Decide whether Vercel will be used for **non-PHI only**. Zenthea currently has Vercel + CloudFront docs; our default is to move PHI hosting to AWS.
- [ ] Ensure analytics/error tracking do **not** capture PHI (or are BAA-backed + configured correctly).

---

## DNS + Rollback Strategy (keep old Zenthea as a fast escape hatch)

### Current note
You mentioned Vercel is currently the **nameserver** for Zenthea.

### Recommended plan (safe + reversible)
1. **Move DNS hosting to a neutral provider you control** (recommended: Route 53; one.com is possible).
2. Keep old stack live at a stable hostname:
   - `legacy.zenthea.ai` → old Vercel project (Convex)
3. Stand up new AWS stack at a separate hostname:
   - `app.zenthea.ai` → AWS ALB/CloudFront (PHI app)
   - (Later) `www.zenthea.ai` → separate marketing app (non-PHI), can live on Vercel if desired and PHI is strictly excluded
4. Before cutover:
   - Lower TTL to 60–300 seconds at least 24 hours ahead.
5. Cutover:
   - Switch `app.zenthea.ai` (and eventually apex) to AWS.
   - Monitor.
6. Rollback:
   - Switch DNS back to `legacy.zenthea.ai` target.

**Why this works:** you can keep two full deployments and flip traffic with DNS.

---

## Migration Phases (high level)

### Phase A — Import Zenthea into StartKit (no behavior change)
**Objective:** Zenthea runs inside the monorepo as `apps/zenthea` while still using Convex + existing auth/billing.

**Acceptance criteria:**
- `pnpm --filter zenthea dev` works locally
- `turbo build` does not break
- No production cutover yet

### Phase B — Parallel deployment (still Convex)
**Objective:** Deploy monorepo Zenthea as a new environment (staging/preview) while old remains live.
> Note: Since Zenthea is treated as PHI in-scope, the **intended** staging target is **AWS** (not Vercel). Early internal demos may still run locally while Convex is being removed.

**Acceptance criteria:**
- Deployed at `staging.zenthea.ai` (or similar)
- Core flows work for internal team

### Phase C — Data migration (Convex → AWS Postgres)
**Objective:** Move PHI/business data to Postgres (tenant-safe) and retire Convex for PHI.

**Acceptance criteria:**
- Read/write uses Postgres
- Tenant isolation and permission checks enforced
- Minimal data import performed (since no clients yet; preserve only what you want)

### Phase D — Compute migration (Vercel → AWS)
**Objective:** PHI traffic served from AWS.

**Acceptance criteria:**
- App + API hosted in AWS
- Observability and incident hooks in place

### Phase E — Adopt StartKit strengths (auth, billing, rbac, superadmin)
**Objective:** Replace Zenthea’s existing auth/billing with StartKit’s Clerk + Stripe + RBAC, and integrate superadmin/control plane as needed.

**Acceptance criteria:**
- Clerk org model aligns with tenant model
- Stripe subscriptions enforced
- RBAC checks gate all mutations

---

## Execution Checklist (chronological, with owners)

> Use this section as the runbook during execution. Each task has a checkbox, an owner, and explicit dependencies.
>
> **Owner legend**
> - **Agent**: I implement in-repo code/config changes.
> - **Human**: requires AWS/Clerk/Stripe/DNS account access, contracts, or approvals.
> - **Agent + Human**: pairing—I'll prepare changes; you execute in consoles / provide keys / approve.

### 0) Compliance + vendor gating (do this first)
- [ ] **T00 — Confirm BAAs and PHI boundaries across vendors** (1–2 SP)
  - **Owner**: Human
  - **Depends on**: none
  - **Acceptance**: written vendor list + BAA status + “allowed tooling for PHI environments” decisions.

### 1) Monorepo import (safe landing zone)
- [x] **T01 — Env validation plan for AWS-only Zenthea** (1–2 SP)
  - **Owner**: Agent
  - **Depends on**: none
  - **Acceptance**: Zenthea can boot in StartKit without requiring unused Supabase env vars.
  - **Implementation**: 
    - Created `apps/zenthea/src/lib/env.ts` with Zenthea-specific env validation
    - Created `apps/zenthea/env.template` with AWS Postgres + S3 configuration
    - Zenthea uses `validateZentheaEnv()` instead of `@startkit/config`'s `validateEnv()`
    - Validates: Clerk, Stripe, AWS Postgres (DATABASE_URL), S3 buckets, optional integrations
    - Does NOT require Supabase vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)

- [x] **T02 — Scaffold `apps/zenthea` inside StartKit** (2–3 SP)
  - **Owner**: Agent
  - **Depends on**: T01
  - **Acceptance**: `pnpm --filter zenthea dev` runs a minimal page in the monorepo.
  - **Implementation**:
    - Created minimal Next.js app structure with all required config files
    - `package.json` with StartKit dependencies
    - `next.config.ts` configured for AWS S3/CloudFront image domains
    - `tsconfig.json` extending StartKit's Next.js config
    - `tailwind.config.ts` with shared UI package content paths
    - `src/app/layout.tsx` using Zenthea's `validateZentheaEnv()` instead of StartKit's `validateEnv()`
    - `src/app/page.tsx` with minimal scaffold page
    - `src/middleware.ts` with auth middleware
    - `src/app/globals.css` with Zenthea-specific styling
    - All files follow StartKit patterns but use Zenthea-specific env validation

- [x] **T03 — Import Zenthea code into `apps/zenthea` (minimal changes)** (3 SP)
  - **Owner**: Agent
  - **Depends on**: T02
  - **Acceptance**: app runs locally inside StartKit (temporary Convex/NextAuth allowed only as an intermediate landing).
  - **Completed**: 2025-01-XX - Imported ~1,241 TypeScript files, merged configs, preserved Convex/NextAuth temporarily

- [x] **T04 — Make Zenthea participate cleanly in Turbo tasks** (2–3 SP)
  - **Owner**: Agent
  - **Depends on**: T03
  - **Acceptance**: `pnpm lint` + `pnpm typecheck` pass for the monorepo.
  - **Completed**: 2025-01-XX - Set up ESLint, updated tsconfig, created typecheck script, fixed TypeScript errors

### 2) AWS staging target (PHI in-scope => AWS, not Vercel)
- [ ] **T05 — Stand up AWS staging compute for Zenthea (ECS/Fargate + ALB)** (2–3 SP)
  - **Owner**: Agent + Human
  - **Depends on**: T00
  - **Acceptance**: reachable staging endpoint (ALB DNS), secrets in Secrets Manager/SSM, logs flowing.

- [ ] **T06 — DNS control + rollback hostnames** (1–2 SP)
  - **Owner**: Human
  - **Depends on**: T05
  - **Acceptance**:
    - `legacy.zenthea.ai` → old Vercel+Convex deployment (rollback)
    - `staging.zenthea.ai` → AWS staging

### 3) Auth + tenant identity (must exist before DB migration is meaningful)
- [ ] **T07 — Create/configure Clerk apps (dev/staging/prod) + orgs strategy** (1–3 SP)
  - **Owner**: Human
  - **Depends on**: T00
  - **Acceptance**: Clerk keys for staging + orgs enabled + org/role model documented.

- [ ] **T08 — Implement Clerk auth in `apps/zenthea` (replace NextAuth)** (2–3 SP)
  - **Owner**: Agent
  - **Depends on**: T07
  - **Acceptance**: sign-in works; organization context is available server-side.
  - **Rollback**: keep old Zenthea running at `legacy.zenthea.ai`.

- [ ] **T09 — Tenant mapping spec: Zenthea `tenantId` → Clerk org → DB `organization_id`** (2–3 SP)
  - **Owner**: Agent + Human
  - **Depends on**: T08
  - **Acceptance**: one canonical mapping decision is made and documented.

### 4) Database foundation (AWS Postgres + RLS)
- [ ] **T10 — Provision AWS Postgres (RDS/Aurora) for staging** (2–3 SP)
  - **Owner**: Human
  - **Depends on**: T00
  - **Acceptance**: DB exists; networking/SGs correct; credentials stored safely.

- [ ] **T11 — Apply StartKit migrations + RLS to AWS Postgres** (2–3 SP)
  - **Owner**: Agent + Human
  - **Depends on**: T10
  - **Acceptance**: schema migrations applied and `db:apply-rls` applied successfully.

- [ ] **T12 — Convex→Postgres schema mapping (domain-by-domain plan)** (3 SP)
  - **Owner**: Agent
  - **Depends on**: T09, T11
  - **Acceptance**: prioritized mapping list from `convex/schema.ts` to relational tables with `organization_id`.

### 5) Feature migration off Convex (repeatable slices)
- [ ] **T13 — Migrate first vertical slice (pick one: Patients / Appointments / Messages)** (3 SP)
  - **Owner**: Agent
  - **Depends on**: T09, T11, T12
  - **Acceptance**: slice works in staging using Postgres with tenant isolation + permission checks + tests.

- [ ] **T14 — Seed fresh demo data (Postgres) and remove need for Convex seed scripts** (1–3 SP)
  - **Owner**: Agent
  - **Depends on**: T13
  - **Acceptance**: demo seed is repeatable; Convex is not required for demo state.

- [ ] **T15 — Iterate slices until Convex is removed from Zenthea** (3 SP, repeating)
  - **Owner**: Agent
  - **Depends on**: T13
  - **Acceptance**: Convex is no longer used by the PHI app.

### 6) RBAC + audit logging hardening (align with access-control spec)
- [ ] **T16 — Implement RBAC and minimum-necessary access per spec** (3 SP)
  - **Owner**: Agent
  - **Depends on**: T08, T13
  - **Acceptance**: critical reads/writes are gated; break-glass/support access modeled; audit logs captured and protected.

### 7) Billing/subscriptions (StartKit Stripe)
- [ ] **T17 — Stripe account + products/prices + webhook endpoints** (1–3 SP)
  - **Owner**: Human
  - **Depends on**: T00
  - **Acceptance**: Stripe keys + webhook secret configured for staging.

- [ ] **T18 — Replace Zenthea billing with StartKit Stripe subscriptions** (2–3 SP)
  - **Owner**: Agent
  - **Depends on**: T17
  - **Acceptance**: subscription lifecycle works; app enforces subscription state.

### 8) Production cutover (AWS-only PHI)
- [ ] **T19 — AWS production environment + smoke tests** (2–3 SP)
  - **Owner**: Agent + Human
  - **Depends on**: T15, T16
  - **Acceptance**: production infra exists; critical flows verified.

- [ ] **T20 — Cutover `app.zenthea.ai` to AWS + rollback drill** (1–2 SP)
  - **Owner**: Human
  - **Depends on**: T19, T06
  - **Acceptance**: DNS cutover complete; rollback tested using `legacy.zenthea.ai`.

---

## Appendix: Workstreams (grouped view, non-chronological)
The checklist above is the authoritative execution order. This appendix can be used to discuss work by domain (repo, auth, db, billing, hosting).

---

## HIPAA Readiness Checklist (engineering evidence)

### Technical
- [ ] Encryption in transit (TLS) everywhere
- [ ] Encryption at rest for RDS + S3 (KMS)
- [ ] Least privilege IAM
- [ ] MFA for all privileged access
- [ ] Audit logging for PHI access and destructive actions
- [ ] Log redaction: no PHI in logs
- [ ] Backups + restore test
- [ ] Incident response runbook

### Administrative (owner-driven)
- [ ] Risk analysis
- [ ] Policies/procedures (access, training, breach response)
- [ ] Vendor BAAs on file

---

## Key Risks to Resolve Early
- **Vendor BAAs**: any missing BAA where PHI might pass is a blocker.
- **Observability leakage**: error tracking/logging commonly captures PHI unless deliberately prevented.
- **Large Zenthea codebase**: we must define bounded domains and migrate incrementally.
- **StartKit protected areas**: avoid changes unless explicitly approved.

---

## Next Questions (to refine and de-risk)
### Answers / Decisions (captured)
1. **PHI scope**: **All areas** of Zenthea are treated as PHI-critical (entire app is in-scope).
2. **Vendors**:
   - Confirmed from Zenthea repo: **SendGrid**, **Cloudinary**, **Google Calendar**, and env hooks for **OpenAI** + **ElevenLabs**.
   - Still need explicit confirmation: analytics and error tracking vendors (e.g., Sentry/PostHog/etc.) and any session replay tooling.
3. **Data migration strategy**: Start fresh (no real clients yet). Prefer seeding new demo data rather than migrating Convex data.
4. **AWS region**: `us-east-1` (align with existing AWS account usage).
