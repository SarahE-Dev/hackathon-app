FROM node:18-alpine AS base

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Build stage
FROM base AS builder

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install

# Copy source code and config files
COPY frontend ./frontend
COPY shared ./shared

# Copy critical frontend config files
COPY frontend/next.config.js ./frontend/
COPY frontend/tailwind.config.ts ./frontend/
COPY frontend/postcss.config.js ./frontend/
COPY frontend/tsconfig.json ./frontend/

# Build the Next.js app
RUN npm run build --workspace=frontend

# Production stage
FROM base AS production

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install all dependencies (including dev) for Next.js runtime to work
RUN npm install

# Copy built app from builder
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/shared ./shared
COPY frontend ./frontend

# Copy public directory if it exists (create empty one for Next.js)
RUN mkdir -p ./frontend/public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -O- http://localhost:3000 || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application - development or production based on NODE_ENV
CMD sh -c "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev --workspace=frontend; else npm run start --workspace=frontend; fi"
