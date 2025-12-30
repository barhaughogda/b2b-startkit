# Dockerfile for Zenthea Next.js app (ECS Fargate deployment)
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy workspace manifests first (better cache hit rate)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/zenthea/package.json ./apps/zenthea/package.json
COPY packages ./packages

# Install dependencies (monorepo workspace)
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_APP_URL="https://staging.zenthea.ai"
ARG NEXT_PUBLIC_CONVEX_URL="https://dummy.convex.cloud"
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dG91Z2gtY29yZ2ktMzAuY2xlcmsuYWNjb3VudHMuZGV2JA"
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51SjzqQBhXCU0lnRCt0YEhN825FZoXek0ffh7bTvYoHZq1kLxsooVBS3tYBYmpoz4hL3JaELJuCa8SKEqwp1pGGSc003GdQSNsy"
ARG CLERK_SECRET_KEY="sk_test_dummy"
ARG CLERK_WEBHOOK_SECRET="whsec_dummy"
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG STRIPE_SECRET_KEY="sk_test_dummy"
ARG STRIPE_WEBHOOK_SECRET="whsec_dummy"
ARG AWS_S3_BUCKET="dummy-bucket"
ARG AWS_S3_MEDICAL_BUCKET="dummy-medical-bucket"

WORKDIR /app

# Install pnpm in builder stage
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Next.js build can be memory-hungry (especially during typechecking)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV CI=true
ENV NEXT_PRIVATE_STANDALONE=true
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV CLERK_WEBHOOK_SECRET=$CLERK_WEBHOOK_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV AWS_S3_BUCKET=$AWS_S3_BUCKET
ENV AWS_S3_MEDICAL_BUCKET=$AWS_S3_MEDICAL_BUCKET

# Copy deps from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy full source code (respects root .dockerignore)
COPY . .

# Build the app (standalone output is enabled in next.config.ts)
RUN pnpm --filter zenthea build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
# Next.js standalone output includes everything needed in .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/.next/static ./apps/zenthea/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/public ./apps/zenthea/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# In a monorepo, the standalone server.js is located in the app's directory
CMD ["node", "apps/zenthea/server.js"]
