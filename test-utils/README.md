# Test Utilities

Shared test utilities, mocks, and helpers for the B2B StartKit mono-repo.

## Usage

### Factories

Create test data objects with consistent structure:

```typescript
import { createMockUser, createMockOrganization } from '../../test-utils/factories'

const user = createMockUser({ email: 'test@example.com' })
const org = createMockOrganization({ name: 'Test Org' })
```

### Mocks

Mock external services and dependencies:

```typescript
import { createMockClerkClient, createMockStripeClient } from '../../test-utils/mocks'

const clerkMock = createMockClerkClient()
clerkMock.users.getUser.mockResolvedValue(mockUser)
```

### Helpers

Utility functions for common test operations:

```typescript
import { waitFor, randomId, assertIsUUID } from '../../test-utils/helpers'

await waitFor(() => condition === true)
const id = randomId('user')
assertIsUUID(id)
```

## Structure

- `factories.ts` - Test data factories
- `mocks.ts` - Mock implementations for external services
- `helpers.ts` - Utility functions for tests
- `setup.ts` - Global test setup/teardown

## Running Tests

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:unit:watch

# Run tests with UI
pnpm test:unit:ui

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Writing Tests

### Unit Tests (Vitest)

Place unit tests next to the code they test:

```
packages/auth/src/
  server.ts
  server.test.ts
```

Or in a `__tests__` directory:

```
packages/auth/src/
  server.ts
  __tests__/
    server.test.ts
```

### E2E Tests (Playwright)

Place E2E tests in the `e2e/` directory:

```
e2e/
  auth/
    sign-in.spec.ts
    sign-up.spec.ts
  billing/
    checkout.spec.ts
```
