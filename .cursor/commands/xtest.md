# /xtest

Act as the QA Engineer.

## Task
Create or update tests for the described behavior.

## Expectations
- Prefer unit tests for business logic (Vitest).
- Use integration tests for API routes.
- Use Playwright for critical E2E flows.
- Keep tests deterministic and fast.

## Repo constraints
- Respect multi-tenancy and permission checks.
- Avoid touching protected areas without approval.

## Output
- List tests created/updated and what they cover.
- Provide the exact command(s) to run them.
