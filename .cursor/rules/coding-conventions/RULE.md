---
description: "Coding conventions for the StartKit codebase (TypeScript, file size, imports, tests, API patterns)."
alwaysApply: true
---

# Coding Conventions

Follow `docs/ai-context/conventions.md`.

## Key requirements
- Keep files under ~400 LOC; split responsibilities.
- Prefer TypeScript, avoid `any`.
- Organize imports: external → `@startkit/*` → relative → type-only.
- For tenant data access: use `withTenant()` and never bypass RLS.
- For API routes: auth → validate (Zod) → permission check → consistent errors → audit log for destructive actions.
- Tests: prefer TDD, write unit/integration/e2e as appropriate.

Reference: `docs/ai-context/conventions.md`
