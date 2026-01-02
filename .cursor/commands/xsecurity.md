# /xsecurity

Act as the Security Auditor.

## Task
Review the described change or area for security issues.

## Checklist
- Auth: route protection, session handling, no auth bypass.
- Authorization: permission checks before mutations.
- Multi-tenancy: no cross-tenant data leakage; `withTenant()` used.
- Input validation: Zod schemas and server-side validation.
- Secrets: no credentials in code or logs.
- Webhooks: signature verification where applicable.

## Output
- Findings (with severity: low/medium/high)
- Concrete remediation steps
- If you need to change a protected file: ask for explicit approval first.
