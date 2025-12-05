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

# Build backend
WORKDIR /app/backend
RUN npm run build 2>&1

# Debug: Show the actual dist structure
RUN echo "=== Dist structure ===" && find dist -type f -name "*.js" | head -20

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start with seed check then run server
# Set SEED_ON_START=true in Railway env vars to seed on first deploy
CMD ["sh", "-c", "if [ \"$SEED_ON_START\" = \"true\" ]; then echo 'Running seed...' && npm run seed && echo 'Seed complete!'; fi && node dist/backend/src/index.js"]
