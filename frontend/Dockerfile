FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -O- http://localhost:3000 || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application in development mode
CMD ["npm", "run", "dev", "--workspace=frontend"]
