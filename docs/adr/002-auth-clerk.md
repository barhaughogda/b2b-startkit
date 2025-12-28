# ADR-002: Use Clerk for Authentication

## Status
Accepted

## Date
2024-12-28

## Context

We are building a B2B SaaS starter kit that needs:
1. User authentication (sign up, sign in, password reset)
2. Organization/team management (multi-tenancy)
3. SSO support for enterprise customers
4. Session management
5. User profile management
6. Webhook-based user sync

The original consideration included building custom authentication.

## Decision

Use **Clerk** as the authentication provider.

## Rationale

### 1. Organization Management Built-In

Clerk provides native organization/team support:
- Users can belong to multiple organizations
- Built-in organization switching UI
- Role management per organization
- Organization creation/deletion flows

This eliminates the need to build custom multi-tenancy infrastructure.

### 2. SSO Support

Clerk provides enterprise SSO out of the box:
- SAML 2.0
- OAuth providers (Google, GitHub, etc.)
- Custom OAuth providers
- Enterprise SSO configuration UI

This is critical for B2B SaaS products targeting enterprise customers.

### 3. Developer Experience

Clerk provides excellent DX:
- React hooks (`useUser`, `useOrganization`)
- Server-side utilities (`getAuth`, `currentUser`)
- Middleware for route protection
- TypeScript support

```typescript
// Client-side
const { user, organization } = useAuth()

// Server-side
const { userId, organizationId } = await getAuth()
```

### 4. Security

Clerk handles security concerns:
- Password hashing (bcrypt)
- Session management (JWT)
- Rate limiting
- Bot protection
- Email verification
- MFA support

### 5. Webhook-Based Sync

Clerk webhooks sync user data to our database:
- `user.created` - Create user record
- `user.updated` - Update user data
- `user.deleted` - Soft delete user
- `organization.created` - Create organization
- `organizationMembership.created` - Add member

This keeps our database in sync without polling.

### 6. Cost-Effective

Clerk's pricing scales with usage:
- Free tier for development
- Reasonable pricing for production
- No infrastructure to maintain

Building custom auth would require:
- Infrastructure costs
- Development time
- Ongoing maintenance
- Security updates

## Consequences

### Positive

- **Fast Development**: Authentication ready in minutes
- **Enterprise Ready**: SSO support from day one
- **Less Code**: No custom auth implementation
- **Security**: Handled by experts
- **Scalability**: Clerk scales automatically
- **Maintenance**: No auth code to maintain

### Negative

- **Vendor Lock-In**: Tied to Clerk's API
- **Cost**: Monthly cost per MAU (monthly active users)
- **Customization Limits**: Some flows are Clerk-controlled
- **Dependency**: External service dependency

## Alternatives Considered

### Custom Authentication

**Pros:**
- Full control
- No vendor lock-in
- No per-user costs

**Cons:**
- Months of development
- Security risks
- Ongoing maintenance
- SSO requires additional work
- Organization management needs to be built

**Rejected:** Development time and security risks outweigh benefits.

### Auth0

**Pros:**
- Enterprise features
- Good SSO support
- Mature platform

**Cons:**
- More expensive
- More complex setup
- Less developer-friendly API

**Rejected:** Clerk provides better DX and similar features at lower cost.

### Supabase Auth

**Pros:**
- Integrated with Supabase
- Open source
- Self-hostable

**Cons:**
- Less mature organization management
- More setup required
- SSO requires additional configuration

**Rejected:** Organization management is less mature than Clerk.

### NextAuth.js

**Pros:**
- Open source
- Flexible
- No vendor lock-in

**Cons:**
- No built-in organization support
- Requires custom implementation
- SSO requires additional setup

**Rejected:** Missing organization management is a deal-breaker for B2B SaaS.

## Implementation Details

### Integration Pattern

1. **Clerk as Source of Truth**: User identity lives in Clerk
2. **Database Sync**: Webhooks sync users to local database
3. **Session Management**: Clerk handles sessions, we read from Clerk
4. **Organization Context**: Clerk provides org context, we use it for RLS

### Webhook Flow

```
Clerk Event → Webhook → Our API → Database Update → Audit Log
```

### Authentication Flow

```
User Signs In → Clerk → JWT Token → Our Middleware → Extract User/Org → RLS Context
```

## Migration Path

If we ever need to migrate away from Clerk:

1. Export user data from Clerk
2. Migrate to new auth provider
3. Update webhook handlers
4. Update client components
5. Update server utilities

This is feasible but requires significant effort.

## References

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Organizations](https://clerk.com/docs/organizations/overview)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
