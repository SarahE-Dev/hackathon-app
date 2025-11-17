FROM node:18-alpine

WORKDIR /app

# Install dumb-init and curl for proper signal handling and health checks
RUN apk add --no-cache dumb-init curl

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm install

# Copy source code and config files
COPY backend ./backend
COPY shared ./shared

# Copy critical backend config files
COPY backend/tsconfig.json ./backend/

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -O- http://localhost:3001/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application in development mode (uses tsx to run TypeScript directly)
CMD ["npm", "run", "dev", "--workspace=backend"]
