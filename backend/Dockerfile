FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and Python3 for code execution
RUN apk add --no-cache dumb-init curl python3 py3-pip make g++ \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Copy package files from repo root context
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install all dependencies
RUN npm install

# Copy source code
COPY backend ./backend
COPY shared ./shared

# Build shared types
WORKDIR /app/shared
RUN npm run build 2>&1 || echo "Shared build skipped"

# Build backend - show all output
WORKDIR /app/backend
RUN echo "=== Starting backend build ===" && \
    npm run build 2>&1 && \
    echo "=== Build complete ===" && \
    ls -la dist/ && \
    ls -la dist/index.js

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application directly with node
CMD ["node", "dist/index.js"]
