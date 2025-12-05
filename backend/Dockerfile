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

# Build TypeScript
WORKDIR /app/backend
RUN npm run build

WORKDIR /app

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "run", "start", "--workspace=backend"]
