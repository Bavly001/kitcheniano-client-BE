# ==============================================================================
# KITCHENIANO CLIENT BACKEND (Express + TypeScript) - MULTI-STAGE DOCKERFILE
# ==============================================================================
# Ultra-lightweight microservice running on port 4001 providing public food menu,
# persistent shopping carts, live order placement, and customer SSE streaming.
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: BUILDER
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies including devDependencies for TypeScript compilation
RUN npm ci

# Copy backend source code and TypeScript configuration
COPY . .

# Compile TypeScript into JavaScript inside the 'dist' directory
RUN npm run build

# Prune development dependencies so only production packages remain
RUN npm prune --production

# ------------------------------------------------------------------------------
# STAGE 2: RUNNER (Production Runtime)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001

# Install curl for health check probing
RUN apk add --no-cache curl

# Copy compiled JavaScript output and production node_modules from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Use non-root user 'node' for security
RUN chown -R node:node /app
USER node

# Expose HTTP port 4001
EXPOSE 4001

# Launch the compiled microservice server
CMD ["node", "dist/server.js"]
