# ADR-004: Use Turborepo for Mono-repo Management

## Status
Accepted

## Date
2024-12-28

## Context

We are building a B2B SaaS starter kit that will be used to create 15+ products. Each product shares common infrastructure:
- Authentication (`@startkit/auth`)
- Billing (`@startkit/billing`)
- Database (`@startkit/database`)
- RBAC (`@startkit/rbac`)
- UI components (`@startkit/ui`)
- Config (`@startkit/config`)

We need:
1. Shared packages across multiple products
2. Fast builds (only rebuild what changed)
3. Type-safe imports between packages
4. Consistent tooling (linting, testing, formatting)
5. Easy product scaffolding
6. CI/CD optimization

The original consideration included separate repositories or alternative mono-repo tools.

## Decision

Use **Turborepo** for mono-repo management with **pnpm** workspaces.

## Rationale

### 1. Incremental Builds

Turborepo caches build outputs and only rebuilds what changed:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"]
    }
  }
}
```

This means:
- If `@startkit/ui` changes, only UI-dependent apps rebuild
- Unchanged packages use cached outputs
- CI/CD builds are faster (critical for 15+ products)

### 2. Task Orchestration

Turborepo understands dependencies:

```
@startkit/config → @startkit/database → @startkit/auth → web-template
```

When building `web-template`, Turborepo:
1. Builds dependencies in correct order
2. Uses cached outputs when possible
3. Parallelizes independent tasks

### 3. Remote Caching

Turborepo supports remote caching (Vercel, custom):
- CI builds share cache across runs
- Team members share cache
- Faster CI/CD pipelines

### 4. pnpm Workspaces

We use pnpm workspaces for:
- **Fast installs**: Content-addressable storage
- **Strict dependencies**: No phantom dependencies
- **Workspace protocol**: `workspace:*` for internal packages

```json
{
  "dependencies": {
    "@startkit/auth": "workspace:*"
  }
}
```

### 5. TypeScript Project References

Turborepo works well with TypeScript project references:
- Type-safe imports between packages
- Incremental type checking
- Fast IDE feedback

### 6. Product Scaffolding

Mono-repo structure makes product scaffolding easy:

```
apps/
├── web-template/     # Template
├── product-1/        # Product 1
├── product-2/        # Product 2
└── product-15/       # Product 15
```

All products share the same structure and tooling.

### 7. Consistent Tooling

Single configuration for:
- Linting (ESLint)
- Formatting (Prettier)
- Testing (Vitest, Playwright)
- Type checking (TypeScript)

No need to duplicate configs across products.

## Consequences

### Positive

- **Fast Builds**: Only rebuild what changed
- **Type Safety**: TypeScript across packages
- **Code Sharing**: Easy to share code between products
- **Consistent Tooling**: Same tools everywhere
- **Easy Scaffolding**: Copy template to create products
- **CI/CD Optimization**: Remote caching speeds up pipelines

### Negative

- **Learning Curve**: Team needs to understand Turborepo
- **Tooling Complexity**: More moving parts than single repo
- **Dependency Management**: Need to manage workspace dependencies
- **Build Cache**: Cache can get stale (mitigated by cache invalidation)

## Alternatives Considered

### Separate Repositories

**Pros:**
- Simpler structure
- Independent versioning
- No mono-repo tooling needed

**Cons:**
- Code duplication across products
- Harder to share packages
- Inconsistent tooling
- More repositories to manage

**Rejected:** Code sharing and consistency are critical for 15+ products.

### Nx

**Pros:**
- Mature mono-repo tool
- Good caching
- Code generation
- Dependency graph visualization

**Cons:**
- More complex setup
- Steeper learning curve
- More opinionated
- Heavier tooling

**Rejected:** Turborepo is simpler and sufficient for our needs.

### Lerna

**Pros:**
- Mature tool
- Good for publishing packages

**Cons:**
- Slower builds
- Less focus on build optimization
- More focused on publishing than development

**Rejected:** Turborepo provides better build performance.

### pnpm Workspaces Only (No Turborepo)

**Pros:**
- Simpler setup
- No additional tooling

**Cons:**
- No build caching
- No task orchestration
- Slower builds
- Manual dependency management

**Rejected:** Build performance is critical for 15+ products.

## Implementation Details

### Structure

```
b2b-startkit/
├── apps/
│   ├── web-template/      # Template app
│   ├── product-1/        # Product apps
│   └── superadmin/        # Admin dashboard
├── packages/
│   ├── auth/              # @startkit/auth
│   ├── billing/           # @startkit/billing
│   ├── database/          # @startkit/database
│   ├── rbac/              # @startkit/rbac
│   ├── ui/                # @startkit/ui
│   └── config/            # @startkit/config
├── turbo.json             # Turborepo config
└── pnpm-workspace.yaml    # pnpm workspaces
```

### Turborepo Configuration

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Package Dependencies

```json
// packages/auth/package.json
{
  "dependencies": {
    "@startkit/config": "workspace:*",
    "@startkit/database": "workspace:*"
  }
}
```

### Build Commands

```bash
# Build all packages and apps
pnpm build

# Build specific app (with dependencies)
pnpm --filter web-template build

# Run dev for all apps
pnpm dev

# Run dev for specific app
pnpm --filter web-template dev
```

## Best Practices

### 1. Use Workspace Protocol

Always use `workspace:*` for internal packages:

```json
{
  "dependencies": {
    "@startkit/auth": "workspace:*"
  }
}
```

### 2. Define Pipeline Dependencies

Explicitly define task dependencies in `turbo.json`:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]  // Build dependencies first
    }
  }
}
```

### 3. Cache Build Outputs

Specify outputs for caching:

```json
{
  "pipeline": {
    "build": {
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

### 4. Use Remote Caching in CI

Enable remote caching for faster CI builds:

```bash
turbo build --token=$TURBO_TOKEN
```

### 5. Keep Packages Focused

Each package should have a single responsibility:
- `@startkit/auth` - Authentication only
- `@startkit/billing` - Billing only
- `@startkit/ui` - UI components only

## Migration Path

If we ever need to migrate away from Turborepo:

1. Keep pnpm workspaces (still useful)
2. Use pnpm scripts for builds
3. Update CI/CD pipelines
4. Remove Turborepo config

This is feasible but would lose build caching benefits.

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
