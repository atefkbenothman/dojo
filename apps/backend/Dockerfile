# Base Bun image
FROM oven/bun:1.2.8-alpine AS base

# Builder stage for pruning the monorepo
FROM base AS builder
WORKDIR /app

# Install turbo globally using Bun
RUN bun add -g turbo

# Copy the entire monorepo
COPY . .

# Prune the monorepo to get only @dojo/backend and its dependencies
RUN turbo prune @dojo/backend --docker

# Installer stage - use pruned output to install dependencies
FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

# Copy bun lockfile if it exists (both text and binary formats)
COPY --from=builder /app/out/bun.lock* ./
COPY --from=builder /app/out/bun.lockb* ./
COPY --from=builder /app/out/package-lock.json* ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy source code from the pruned output
COPY --from=builder /app/out/full/ .

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM
# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

# Build everything using turbo to ensure correct dependency order
RUN bunx turbo run build

# Runtime stage - create the production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 bunuser
RUN adduser --system --uid 1001 bunuser
USER bunuser

# Copy package.json files for runtime dependencies
COPY --from=installer /app/packages/utils/package.json ./packages/utils/package.json

# Copy backend source (pruned output) instead of built dist
COPY --from=installer /app/apps/backend ./apps/backend
COPY --from=installer /app/packages/db ./packages/db

# Copy only the built application code and necessary dependencies
COPY --from=installer /app/packages/utils/dist ./packages/utils/dist
COPY --from=installer /app/node_modules ./node_modules

EXPOSE 8888

# Use Bun to run the application directly
CMD ["bun", "apps/backend/src/core.ts"]
