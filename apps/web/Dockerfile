# Multi-stage build for Next.js app in Turborepo
FROM node:20-alpine AS base
RUN corepack enable pnpm
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
# Copy workspace and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/
COPY packages/normalization/package.json ./packages/normalization/
COPY packages/partners/package.json ./packages/partners/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
# Install dependencies with retry
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
# Copy dependencies and workspace configuration
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
# Copy workspace configuration
COPY package.json pnpm-workspace.yaml turbo.json ./
# Copy all package source code (required for workspace dependencies)
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
# Set build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/placeholder
# Build using turbo for workspace optimization
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Create user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Copy public directory contents if they exist
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# Set user
USER nextjs
# Expose port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
# Start the application
CMD ["node", "apps/web/server.js"]