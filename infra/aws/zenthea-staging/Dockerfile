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
ARG NEXTAUTH_URL="http://localhost:3000"
ARG NEXTAUTH_SECRET="dummy-secret-for-build-time-only"
ARG NEXT_PUBLIC_CONVEX_URL="https://dummy.convex.cloud"
ARG CONVEX_DEPLOYMENT_URL="https://dummy.convex.cloud"

WORKDIR /app

# Install pnpm in builder stage
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Next.js build can be memory-hungry (especially during typechecking)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV CI=true
ENV NEXT_PRIVATE_STANDALONE=true
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV CONVEX_DEPLOYMENT_URL=$CONVEX_DEPLOYMENT_URL

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
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/zenthea/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
