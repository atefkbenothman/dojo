# Base Bun image
FROM oven/bun:1.2.8-alpine AS base

# Builder stage for pruning the monorepo
FROM base AS builder
WORKDIR /app

# Install turbo globally using npm (since the monorepo uses npm)
RUN apk add --no-cache npm && npm install -g turbo

# Copy the entire monorepo
COPY . .

# Prune the monorepo to get only @dojo/backend and its dependencies
RUN turbo prune @dojo/backend --docker

# Installer stage - use pruned output to install dependencies
FROM base AS installer
WORKDIR /app

# Install npm for turbo to use (since packageManager is set to npm)
RUN apk add --no-cache npm

# Copy pruned package.json files
COPY --from=builder /app/out/json/ .

# Install dependencies using Bun
# Since we're converting from npm to bun, we don't use frozen-lockfile
RUN bun install

# Copy source code from the pruned output
COPY --from=builder /app/out/full/ .

# Build dependencies that need building (like utils package)
# Using --filter to only build dependencies of backend, not backend itself
RUN bunx turbo run build --filter=@dojo/backend^...

# Runtime stage - create the production image
FROM base AS runner
WORKDIR /app

# Install Node.js and npm for npx support (needed for MCP servers)
RUN apk add --no-cache nodejs npm

# Set production environment
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 bunuser
RUN adduser --system --uid 1001 bunuser
USER bunuser

# Copy the entire app from installer (includes built dependencies)
COPY --from=installer --chown=bunuser:bunuser /app ./

EXPOSE 8888

# Use Bun to run the application directly
CMD ["bun", "apps/backend/src/core.ts"]
