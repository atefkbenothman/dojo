# Base Node image
FROM node:20-alpine AS base

# Builder stage for pruning the monorepo
FROM base AS builder
# Add libc6-compat for compatibility
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally in the builder stage
RUN npm install -g turbo

# Copy the entire monorepo
COPY . .

# Prune the monorepo to get only @dojo/backend and its dependencies
RUN turbo prune @dojo/backend --docker

# Installer stage - use pruned output to install dependencies
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Copy source code from the pruned output
COPY --from=builder /app/out/full/ .

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM
# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

# Build everything using turbo to ensure correct dependency order
RUN npx turbo run build

# Runtime stage - create the production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

# Copy package.json files for runtime dependencies
COPY --from=installer /app/package.json ./package.json
COPY --from=installer /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=installer /app/packages/config/package.json ./packages/config/package.json
COPY --from=installer /app/packages/utils/package.json ./packages/utils/package.json

# Copy only the built application code and necessary dependencies
COPY --from=installer /app/apps/backend/dist ./apps/backend/dist
COPY --from=installer /app/packages/config/dist ./packages/config/dist
COPY --from=installer /app/packages/utils/dist ./packages/utils/dist
COPY --from=installer /app/node_modules ./node_modules

EXPOSE 8888

CMD ["node", "apps/backend/dist/core.js"]
