# Zenthea - HIPAA-Compliant Healthcare Platform

Zenthea is a healthcare platform built on StartKit, migrated from Convex/Vercel to AWS for HIPAA compliance.

## Environment Variables

Zenthea uses **AWS Postgres** (not Supabase) and has its own environment validation separate from StartKit's shared config.

### Setup

1. Copy the environment template:
   ```bash
   cp env.template .env.local
   ```

2. Fill in required variables (see `env.template` for details):
   - Clerk (auth)
   - AWS Postgres `DATABASE_URL`
   - AWS S3 buckets
   - Stripe (billing)

### Environment Validation

Zenthea uses `validateZentheaEnv()` from `src/lib/env.ts` instead of `@startkit/config`'s `validateEnv()`.

**Why?** StartKit's shared validation requires Supabase env vars, but Zenthea uses AWS Postgres.

**Usage in layout.tsx:**
```ts
import { validateZentheaEnv } from '@/lib/env'

if (typeof window === 'undefined') {
  validateZentheaEnv()
}
```

### Required Variables

- **Clerk**: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Database**: `DATABASE_URL` (AWS Postgres connection string)
- **Storage**: `AWS_S3_BUCKET`, `AWS_S3_MEDICAL_BUCKET`, `AWS_REGION`
- **Billing**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Optional Variables

- `SENDGRID_API_KEY` - Email (ensure BAA if handling PHI)
- `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET` - Calendar integration
- `CLOUDINARY_*` - Public/marketing images only (NOT PHI)
- `OPENAI_API_KEY` / `ELEVENLABS_API_KEY` - AI features (ensure BAA/terms allow PHI)

See `env.template` for complete list with documentation.

## Migration Status

See `docs/migration-plan.md` for migration progress and architecture decisions.
