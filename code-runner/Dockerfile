# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY code-runner/package.json ./code-runner/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY code-runner ./code-runner
COPY shared ./shared

# Build TypeScript
RUN npm run build --workspace=code-runner

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init and Docker CLI
RUN apk add --no-cache dumb-init docker-cli

# Copy package files
COPY package.json package-lock.json ./
COPY code-runner/package.json ./code-runner/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=code-runner

# Copy built application from builder
COPY --from=builder /app/code-runner/dist ./code-runner/dist
COPY --from=builder /app/code-runner/src ./code-runner/src
COPY code-runner/.env* ./code-runner/

# Expose port (not used, but good practice)
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('code-runner healthy')" || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start worker process
CMD ["npm", "run", "worker", "--workspace=code-runner"]
