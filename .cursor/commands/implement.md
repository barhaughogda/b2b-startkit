# /implement

Act as a senior full-stack engineer.

## Task
Implement the requested change in the smallest safe step.

## Quality gates
- Validate inputs (Zod) on the server.
- Check permissions before mutations.
- Use tenant-scoped access patterns (`withTenant()` / `organization_id`).
- Keep files under ~400 LOC.
- Add tests where it matters (prefer TDD if feasible).

## Output
- What changed (files)
- How to verify (tests/steps)
