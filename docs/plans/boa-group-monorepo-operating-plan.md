# BOA Group Monorepo Operating Plan (Cursor/Claude + Worktrees + Vertical Incubation)

## Purpose
BOA Group will incubate multiple vertical SaaS companies. We want:
- **Speed**: reuse platform primitives and move fast across experiments.
- **Safety (HIPAA/PHI)**: Zenthea-class apps remain AWS-hosted with strict boundaries.
- **Carve-out readiness**: when a vertical “wins”, we can split it into its own repo + accounts with minimal surgery.
- **AI ergonomics**: Cursor + Claude Code should work smoothly at the monorepo root and across multiple worktrees.

This plan defines **how we work day-to-day** (worktrees, commands, boundaries) and **how that impacts the ongoing Zenthea migration**.

**Start here (chronological runbook):** `docs/plans/boa-group-execution-runbook.md`

---

## Guiding principles (non-negotiable)
1. **One repo = one dependency graph**: avoid cross-app coupling.
2. **Apps never import from other apps**: only import from `packages/*`.
3. **Per-app runtime boundaries**: each app has its own env, secrets, deployment, and database.
4. **PHI is a hard boundary**: PHI workloads run on AWS (HIPAA-eligible services) with PHI-safe logging and vendor BAAs.
5. **Carve-out friendly by default**: follow patterns that make “copy app out into a new repo” straightforward.

---

## Repo identity & naming
### Repo name
It’s fine to rename the repo/folder from “b2b-startkit” to something like:
- `boa-group-platform` (recommended), or
- `boa-group-monorepo`.

### Keep shared package namespace stable
Keep `@startkit/*` package names for now:
- Reduces churn across all apps.
- Makes spin-outs easier (no need to rename imports across a newly carved-out repo).

We can revisit namespace rebranding later if it becomes strategically important.

---

## App strategy (incubation + later spin-out)
### Today
- Zenthea is the primary PHI workload and stays as `apps/zenthea`.
- New vertical experiments can start as additional apps under `apps/*`.

### Naming for new verticals (pre-brand)
Use a **vertical-first slug** for app folder names:
- `apps/<vertical>-<appname>`

Keep the **human label** (can include spaces) in docs/branding.

**Example**
- Label: “SMB Medical Clinics — Zenthea”
- Folder slug: `apps/smb-medical-clinics-zenthea`

### “Spin-out” target state
When a vertical becomes a real company (or you’re preparing for an exit), we want to be able to:
- Lift the app into its **own repo** without needing to untangle dependencies.
- Swap to its **own AWS accounts / DB projects / auth tenants / Stripe account** with mostly config changes.

To make that realistic, follow these rules from day 1:
- **No cross-app imports** (ever).
- **No shared “product tables” across apps** (only core tables live in shared packages).
- **Per-app env/secrets/deploy** are the source of truth (even if initially run by BOA Group).

---

## Cursor + Claude Code setup
### Canonical rules & commands live at the monorepo root
Put your prompting accelerators at the repo root so they are available everywhere:
- `.cursor/commands/*` (e.g. `pr.md`, `fix.md`, `merge.md`, `review.md`)
- `.cursor/rules/*` (operational rules; keep `.cursorrules` as the high-level “constitution”)

Why root?
- You will work at the monorepo root most of the time.
- Root-scoped rules apply to changes in `apps/*`, `packages/*`, `infra/*`, and `docs/*`.

### Keep rules layered and non-contradictory
- **`.cursorrules`**: repo-wide conventions (multi-tenancy, permissions, do-not-touch areas).
- **`.cursor/rules/*`**: workflow playbooks (TDD prompts, PR formatting, “how we run migrations”, etc.).
- **App-only overlays** (optional): only if an app truly needs special rules when opened as its own workspace folder.

---

## Worktree workflow (parallel agents / parallel feature streams)
### Key idea
Git worktrees are per-repo (monorepo root), not “inside each app”.

### Recommended layout
Store worktrees as siblings to the main repo folder (avoids recursive indexing/search confusion):
- `.../Dev/boa-group-platform` (main checkout)
- `.../Dev/boa-group-platform-worktrees/<name>` (additional worktrees)

### How to work in multiple worktrees simultaneously
- **One Cursor window per worktree** (open that worktree’s monorepo root).
- Each window can focus on a single app (e.g. `apps/zenthea`) but still has access to shared `packages/*`.

### Why not store worktrees inside the repo folder?
It creates nested checkouts under the same tree which tends to cause:
- noisy searches/indexing (duplicate hits),
- “edited the wrong checkout” mistakes,
- clutter from build artifacts and watchers.

---

## Runtime boundaries (how we keep carve-outs + HIPAA sane)
### Per-app environment boundaries
Each app should have:
- its own `env.template` (already true in this repo for apps),
- its own deployment target and secrets,
- its own DB project (even if under BOA Group ownership initially).

### Database boundaries
- Core/shared tables remain in shared packages (StartKit core).
- Any vertical-specific tables live under the app (per StartKit conventions).
- Always enforce tenant isolation via RLS + `organization_id` patterns.

### Auth boundaries
Treat “company = identity boundary”:
- early incubation can be shared operationally,
- but plan for separate auth tenants per carved-out company.

---

## Stripe strategy (bootstrap now, separate on success)
### OK to bootstrap with one BOA Group Stripe account
Early-stage speed wins. If you do this:
- keep plan/price configuration **per app**,
- avoid hardcoding IDs,
- keep billing abstraction so you can swap keys later.

### Define a separation trigger
When a vertical is clearly successful (e.g. meaningful revenue, fundraising, due diligence, spin-out decision), schedule:
- new Stripe account (or Connect strategy if appropriate),
- customer migration plan (or clean start if early),
- webhook rotation and key cutover.

---

## How this affects the Zenthea migration
### What changes right now
1. We do a **thin monorepo “operating system” pass** first:
   - add/standardize root `.cursor/commands` + `.cursor/rules`
   - document sibling worktree layout + conventions
   - document app boundaries (no cross-app imports; per-app env/DB/deploy)
2. Then we continue the existing Zenthea migration plan (`zenthea-migration-hipaa.md`) with less operational friction.

### Zenthea-specific (PHI) posture
Zenthea and its forks are PHI-in-scope:
- Treat the full app as PHI-handling unless proven otherwise.
- Prefer AWS-only compute and HIPAA-eligible services.
- Ensure observability does not leak PHI.

---

## Deliverables (what we will implement in the repo)
### A) Monorepo operating system (small, fast, reversible)
- Root `.cursor/commands/*` added (ported from your current Zenthea worktree setup)
- Root `.cursor/rules/*` added (ported + deduped against existing `.cursorrules`)
- Worktree convention documented (this file + quick “how-to” if needed)

### B) Zenthea migration continues (per the existing plan)
- T07+ (Clerk org strategy + keys) → T08+ (auth swap) → DB/RLS → slice-by-slice Convex removal.

