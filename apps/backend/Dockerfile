# Base Bun image
FROM oven/bun:1.2.18-alpine AS base

# Builder stage for pruning the monorepo
FROM base AS builder
WORKDIR /app

# Install pnpm and turbo globally (since the monorepo uses pnpm)
RUN apk add --no-cache nodejs npm && \
    npm install -g pnpm@9.0.0 turbo@latest && \
    npm cache clean --force

# Copy package.json and lock file first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the entire monorepo
COPY . .

# Prune the monorepo to get only @dojo/backend and its dependencies
RUN turbo prune @dojo/backend --docker

# Installer stage - use pruned output to install dependencies
FROM base AS installer
WORKDIR /app

# Install pnpm and turbo for dependency management and builds (since packageManager is set to pnpm)
RUN apk add --no-cache nodejs npm && \
    npm install -g pnpm@9.0.0 turbo@latest && \
    npm cache clean --force

# Copy pruned package.json files and workspace configuration first for better layer caching
COPY --from=builder /app/out/json/ .
# Copy lock file from the original root (turbo prune doesn't include lock files in out/full)
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies using pnpm with frozen lockfile for production consistency
# This layer will be cached unless package.json or lock file changes
RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# Copy source code from the pruned output (separate layer for better caching)
COPY --from=builder /app/out/full/ .

# Build dependencies that need building (like utils package)
# Using --filter to only build dependencies of backend, not backend itself
RUN turbo run build --filter=@dojo/backend^... && \
    pnpm prune --prod && \
    npm uninstall -g turbo pnpm && \
    npm cache clean --force

# Runtime stage - create the production image
FROM base AS runner
WORKDIR /app

# Install Node.js and npm for npx support, then install uv (includes uvx) globally
RUN apk add --no-cache nodejs npm python3 curl && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/uv && \
    mv /root/.local/bin/uvx /usr/local/bin/uvx && \
    apk del curl && \
    rm -rf /var/cache/apk/* /tmp/*

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
CMD ["bun", "apps/backend/src/index.ts"]
